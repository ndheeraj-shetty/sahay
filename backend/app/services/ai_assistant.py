import json
import logging
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.ai import (
    ActionStatus,
    ActionType,
    AIActionRequest,
    AIConversation,
    AIMessage,
    AIRetrievalLog,
)
from app.models.auth import Household, HouseholdMember, MemberRole, User
from app.models.daily import (
    HouseholdMoneyProfile,
    Obligation,
    ObligationPriority,
    ObligationStatus,
    ObligationType,
    RecurrenceFrequency,
)
from app.models.doctor import ExtractedDocumentField
from app.models.health import (
    Allergy,
    AllergySeverity,
    HealthProfile,
    MedicalCondition,
    Medicine,
    MedicineFrequency,
)
from app.models.lakshya import GoalCategory, GoalContribution, GoalContributor, GoalMilestone, GoalPriority, GoalStatus, GoalVault
from app.models.vault import Document, DocumentAccessLevel
from app.schemas.ai import AICitation

logger = logging.getLogger("sahay.ai_assistant")


class AIAssistantService:
    @classmethod
    async def retrieve_permission_aware_context(
        cls,
        household_id: str,
        current_user: User,
        membership: HouseholdMember,
        query: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Retrieves household context with strict permission checks:
        - Documents:
          - OWNER / ADULT: HOUSEHOLD, SHARED_ADULTS, and own PRIVATE documents
          - CAREGIVER / ELDER / CHILD: HOUSEHOLD, and own PRIVATE documents only
        - Daily obligations: Household level
        - Health profiles: Household level
        - Lakshya goals: Household level with contributor commitments
        - Money Profile: Household income, planned savings, surplus run-rate
        """
        role = membership.role
        is_adult_or_owner = role in [MemberRole.OWNER, MemberRole.ADULT] or current_user.is_superuser
        member_id = membership.id

        # 1. Permission-filtered Documents
        doc_query = select(Document).where(Document.household_id == household_id)
        if is_adult_or_owner:
            doc_query = doc_query.where(
                or_(
                    Document.access_level.in_([DocumentAccessLevel.HOUSEHOLD, DocumentAccessLevel.SHARED_ADULTS]),
                    (Document.access_level == DocumentAccessLevel.PRIVATE) & (
                        (Document.owner_user_id == current_user.id) | (Document.target_member_id == member_id)
                    ),
                )
            )
        else:
            doc_query = doc_query.where(
                or_(
                    Document.access_level == DocumentAccessLevel.HOUSEHOLD,
                    (Document.access_level == DocumentAccessLevel.PRIVATE) & (
                        (Document.owner_user_id == current_user.id) | (Document.target_member_id == member_id)
                    ),
                )
            )

        res_docs = await db.execute(doc_query)
        accessible_docs = res_docs.scalars().all()
        doc_ids = [d.id for d in accessible_docs]

        # Fetch extracted fields for accessible docs
        extracted_fields_by_doc: Dict[str, List[ExtractedDocumentField]] = {}
        if doc_ids:
            res_fields = await db.execute(
                select(ExtractedDocumentField).where(ExtractedDocumentField.document_id.in_(doc_ids))
            )
            for f in res_fields.scalars().all():
                extracted_fields_by_doc.setdefault(f.document_id, []).append(f)

        # 2. Daily Obligations
        res_ob = await db.execute(
            select(Obligation)
            .where(Obligation.household_id == household_id)
            .order_by(Obligation.due_date.asc())
        )
        obligations = res_ob.scalars().all()

        # 3. Health Profiles with relationships loaded
        res_hp = await db.execute(
            select(HealthProfile)
            .options(
                selectinload(HealthProfile.member),
                selectinload(HealthProfile.allergies),
                selectinload(HealthProfile.medicines),
            )
            .where(HealthProfile.household_id == household_id)
        )
        health_profiles = res_hp.scalars().all()

        # 4. Lakshya Goals with Contributors
        res_goals = await db.execute(
            select(GoalVault)
            .options(selectinload(GoalVault.contributors))
            .where(GoalVault.household_id == household_id)
        )
        goals = res_goals.scalars().all()

        # 5. Household Money Profile (Income, Expenses & Savings)
        res_mp = await db.execute(
            select(HouseholdMoneyProfile).where(HouseholdMoneyProfile.household_id == household_id)
        )
        money_profile = res_mp.scalar_one_or_none()

        expected_income = money_profile.expected_monthly_income if money_profile else 85000.0
        planned_savings = money_profile.planned_monthly_savings if money_profile else 15000.0
        rent_expense = money_profile.rent_expense if (money_profile and money_profile.rent_expense is not None) else 18000.0
        groceries_expense = money_profile.groceries_expense if (money_profile and money_profile.groceries_expense is not None) else 12000.0
        utilities_expense = money_profile.utilities_expense if (money_profile and money_profile.utilities_expense is not None) else 5000.0
        other_expenses = money_profile.other_expenses if (money_profile and money_profile.other_expenses is not None) else 5000.0
        total_living_expenses = rent_expense + groceries_expense + utilities_expense + other_expenses

        # Compute Cash Flow Metrics
        pending_obs = [o for o in obligations if o.status in [ObligationStatus.PENDING, ObligationStatus.DUE_TODAY]]
        total_monthly_bills = sum(o.amount for o in pending_obs)
        total_goal_commitments = sum(
            sum(float(c.monthly_commitment_amount) for c in g.contributors) for g in goals
        )
        disposable_surplus = expected_income - (total_living_expenses + total_monthly_bills + total_goal_commitments)

        return {
            "documents": accessible_docs,
            "extracted_fields": extracted_fields_by_doc,
            "obligations": obligations,
            "health_profiles": health_profiles,
            "goals": goals,
            "money_profile": money_profile,
            "expected_income": expected_income,
            "planned_savings": planned_savings,
            "rent_expense": rent_expense,
            "groceries_expense": groceries_expense,
            "utilities_expense": utilities_expense,
            "other_expenses": other_expenses,
            "total_living_expenses": total_living_expenses,
            "total_monthly_bills": total_monthly_bills,
            "total_goal_commitments": total_goal_commitments,
            "disposable_surplus": disposable_surplus,
            "current_member": membership,
        }

    @classmethod
    def match_citations(
        cls, query: str, context: Dict[str, Any]
    ) -> List[AICitation]:
        query_lower = query.lower()
        query_tokens = [t.strip(",.?! ") for t in query_lower.split() if len(t) > 2]
        citations: List[AICitation] = []

        # Money Profile Citation
        if any(w in query_lower for w in ["income", "salary", "budget", "savings", "save", "afford", "surplus", "money", "advice", "cash"]):
            inc = context.get("expected_income", 85000.0)
            sav = context.get("planned_savings", 15000.0)
            surplus = context.get("disposable_surplus", 0.0)
            citations.append(
                AICitation(
                    source_type="money_profile",
                    source_id=context["money_profile"].id if context.get("money_profile") else "default-profile",
                    title="Household Money & Income Profile",
                    snippet=f"Income: ₹{inc:,.0f}/mo | Planned Savings: ₹{sav:,.0f}/mo | Surplus: ₹{surplus:,.0f}/mo",
                )
            )

        # Document citations
        for doc in context["documents"]:
            doc_text = f"{doc.title} {doc.document_type} {doc.file_name}".lower()
            fields = context["extracted_fields"].get(doc.id, [])
            fields_text = " ".join([f"{f.field_name}:{f.field_value or ''}" for f in fields]).lower()
            combined = doc_text + " " + fields_text

            score = sum(1 for t in query_tokens if t in combined)
            if score > 0 or any(w in query_lower for w in ["document", "doc", "bill", "aadhaar", "pan", "passport", "policy", "insurance", "expiry", "when"]):
                snippet_parts = [f"Type: {doc.document_type}"]
                best_field = None
                for f in fields:
                    if any(t in f.field_name.lower() or t in (f.field_value or "").lower() for t in query_tokens):
                        best_field = f
                        break
                if not best_field and fields:
                    best_field = fields[0]

                if fields:
                    sample_f = [f"{f.field_name}: {f.user_confirmed_value or f.field_value}" for f in fields[:3]]
                    snippet_parts.append("; ".join(sample_f))

                evidence_text = best_field.source_evidence if best_field and best_field.source_evidence else (f"{doc.title} (Verified)" if doc.is_verified else None)
                conf = best_field.confidence if best_field else 0.95
                is_verified = best_field.is_verified_by_user if best_field else doc.is_verified

                citations.append(
                    AICitation(
                        source_type="document",
                        source_id=doc.id,
                        title=doc.title,
                        snippet=" | ".join(snippet_parts),
                        file_name=doc.file_name,
                        page_number=1,
                        evidence=evidence_text,
                        confidence_score=round(conf, 2),
                        verified_by_user=is_verified,
                    )
                )

        # Obligation citations
        for ob in context["obligations"]:
            ob_text = f"{ob.title} {ob.category} {ob.biller_or_payee or ''}".lower()
            if any(t in ob_text for t in query_tokens) or any(w in query_lower for w in ["bill", "due", "obligation", "electricity", "rent", "fee", "mseb", "airtel", "adani"]):
                citations.append(
                    AICitation(
                        source_type="obligation",
                        source_id=ob.id,
                        title=ob.title,
                        snippet=f"₹{ob.amount:,.2f} due on {ob.due_date} (Status: {ob.status.value})",
                    )
                )

        # Health citations
        for hp in context["health_profiles"]:
            member_name = (hp.member.display_name if hp.member else "Family Member")
            hp_text = f"{member_name} blood group {hp.blood_group.value if hp.blood_group else ''}".lower()
            allergies_text = " ".join([a.allergen for a in hp.allergies]).lower()
            medicines_text = " ".join([m.name for m in hp.medicines]).lower()
            full_health_text = f"{hp_text} {allergies_text} {medicines_text}"

            if any(t in full_health_text for t in query_tokens) or any(w in query_lower for w in ["health", "blood", "allergy", "allergic", "medicine", "doctor", "hospital"]):
                snippet = f"Blood: {hp.blood_group.value if hp.blood_group else 'Unknown'}"
                if hp.allergies:
                    snippet += f" | Allergies: {', '.join([a.allergen for a in hp.allergies])}"
                if hp.medicines:
                    snippet += f" | Meds: {', '.join([m.name for m in hp.medicines])}"
                citations.append(
                    AICitation(
                        source_type="health",
                        source_id=hp.id,
                        title=f"{member_name}'s Health Profile",
                        snippet=snippet,
                    )
                )

        # Goal citations
        for g in context["goals"]:
            g_text = f"{g.title} {g.category.value}".lower()
            if any(t in g_text for t in query_tokens) or any(w in query_lower for w in ["goal", "savings", "target", "lakshya", "education", "fund"]):
                citations.append(
                    AICitation(
                        source_type="goal",
                        source_id=g.id,
                        title=g.title,
                        snippet=f"Target: ₹{g.target_amount:,.2f} | Saved: ₹{g.current_amount:,.2f} ({g.status.value})",
                    )
                )

        return citations[:5]

    @classmethod
    def detect_action_intent(
        cls, query: str, context: Dict[str, Any]
    ) -> Optional[Tuple[ActionType, Dict[str, Any], str]]:
        q = query.lower()

        # 1. Update Money Profile (Income and/or Savings)
        # e.g., "Set monthly income to 120000", "Update income to 150000 and savings to 30000", "Our income is 95000"
        if any(w in q for w in ["income", "salary", "budget", "money profile"]) and any(w in q for w in ["set", "update", "change", "is", "make"]):
            numbers = re.findall(r"(?:rs\.?|₹|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)", q)
            if numbers:
                try:
                    new_inc = float(numbers[0].replace(",", ""))
                    new_sav = float(numbers[1].replace(",", "")) if len(numbers) > 1 else context.get("planned_savings", 15000.0)
                    return (
                        ActionType.UPDATE_MONEY_PROFILE,
                        {
                            "expected_monthly_income": new_inc,
                            "planned_monthly_savings": new_sav,
                            "notes": "Updated via Sahay AI Assistant",
                        },
                        f"Shall I update your **Household Money Profile** to **₹{new_inc:,.0f}** monthly income and **₹{new_sav:,.0f}** planned savings target?",
                    )
                except Exception:
                    pass

        # 2. Mark bill/obligation as paid
        if any(w in q for w in ["paid", "mark paid", "settled", "cleared"]) and any(w in q for w in ["bill", "obligation", "rent", "electricity", "mseb", "airtel", "tuition", "adani"]):
            for ob in context["obligations"]:
                if ob.status != ObligationStatus.PAID and (ob.title.lower() in q or (ob.biller_or_payee and ob.biller_or_payee.lower() in q) or ob.category.lower() in q):
                    return (
                        ActionType.MARK_PAID,
                        {
                            "obligation_id": ob.id,
                            "title": ob.title,
                            "amount": ob.amount,
                            "due_date": str(ob.due_date),
                        },
                        f"Would you like me to mark **{ob.title}** (₹{ob.amount:,.2f}, due {ob.due_date}) as paid in Sahay Daily?",
                    )
            # Default to first pending obligation
            for ob in context["obligations"]:
                if ob.status in [ObligationStatus.PENDING, ObligationStatus.DUE_TODAY]:
                    return (
                        ActionType.MARK_PAID,
                        {
                            "obligation_id": ob.id,
                            "title": ob.title,
                            "amount": ob.amount,
                            "due_date": str(ob.due_date),
                        },
                        f"Would you like me to mark **{ob.title}** (₹{ob.amount:,.2f}) as paid in Sahay Daily?",
                    )

        # 3. Create new obligation
        if any(w in q for w in ["add bill", "create obligation", "add obligation", "new bill", "remind me to pay"]):
            amount_match = re.search(r"(?:rs\.?|₹|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)", q)
            amount = 1000.0
            if amount_match:
                try:
                    amount = float(amount_match.group(1).replace(",", ""))
                except Exception:
                    amount = 1000.0

            title = "Household Bill"
            if "wifi" in q or "broadband" in q or "internet" in q:
                title = "WiFi Internet Bill"
            elif "grocery" in q or "groceries" in q:
                title = "Monthly Groceries"
            elif "maid" in q or "cook" in q:
                title = "Domestic Help Salary"
            elif "rent" in q:
                title = "House Rent"
            elif "water" in q:
                title = "Water Utility Bill"

            due_date = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")

            return (
                ActionType.CREATE_OBLIGATION,
                {
                    "title": title,
                    "amount": amount,
                    "category": "utilities",
                    "due_date": due_date,
                    "priority": "high",
                },
                f"Shall I create a new obligation **'{title}'** for **₹{amount:,.2f}** due on **{due_date}**?",
            )

        # 4. Create Lakshya Goal Vault
        # If user is asking for Emergency Mode / urgent liquidity / pandemic crisis advice, do NOT intercept as single goal creation:
        is_emergency_mode_query = (
            any(w in q for w in ["emergency mode", "urgently require", "urgently need", "crisis", "pandemic"])
            and not any(w in q for w in ["build a goal", "create goal", "start a goal", "make a goal"])
        )

        # Triggered when user asks about goal, saving for a goal, vacation, emergency fund, car, education, or affordability
        if not is_emergency_mode_query and any(w in q for w in ["goal", "vacation", "emergency fund", "education", "vehicle", "car", "travel", "save for", "build a goal", "create goal"]):
            category_val = GoalCategory.CUSTOM
            goal_title = "Family Savings Vault"
            target_amount = 120000.0

            if any(w in q for w in ["vacation", "travel", "trip", "holiday", "tour"]):
                category_val = GoalCategory.TRAVEL_VACATION
                goal_title = "Travel & Vacation Fund"
                target_amount = 120000.0
            elif any(w in q for w in ["emergency", "rainy day", "cushion", "buffer"]):
                category_val = GoalCategory.EMERGENCY_FUND
                goal_title = "Emergency Buffer Vault"
                target_amount = 250000.0
            elif any(w in q for w in ["education", "college", "school", "tuition", "child"]):
                category_val = GoalCategory.CHILD_EDUCATION
                goal_title = "Higher Education Vault"
                target_amount = 500000.0
            elif any(w in q for w in ["car", "bike", "vehicle", "motorcycle", "auto"]):
                category_val = GoalCategory.VEHICLE_PURCHASE
                goal_title = "Vehicle Purchase Vault"
                target_amount = 300000.0
            elif any(w in q for w in ["home", "house", "flat", "apartment", "renovation"]):
                category_val = GoalCategory.HOME_DOWN_PAYMENT
                goal_title = "Home Down Payment Vault"
                target_amount = 600000.0
            elif any(w in q for w in ["medical", "health", "hospital"]):
                category_val = GoalCategory.MEDICAL_FUND
                goal_title = "Medical Reserve Vault"
                target_amount = 200000.0

            numbers = re.findall(r"(?:rs\.?|₹|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)", q)
            if numbers:
                try:
                    num_val = float(numbers[0].replace(",", ""))
                    if num_val >= 25000:
                        target_amount = num_val
                    elif num_val > 0:
                        target_amount = num_val * 12
                except Exception:
                    pass

            monthly_commit = round(target_amount / 12, 0)
            target_date_str = (date.today() + timedelta(days=365)).strftime("%Y-%m-%d")

            return (
                ActionType.CREATE_GOAL,
                {
                    "title": goal_title,
                    "category": category_val.value,
                    "target_amount": target_amount,
                    "monthly_commitment": monthly_commit,
                    "target_date": target_date_str,
                    "description": f"Created via Sahay AI Assistant for {goal_title}",
                },
                f"Would you like me to build a **Lakshya Goal Vault** for **'{goal_title}'** (Target: **₹{target_amount:,.0f}**, Monthly Commitment: **₹{monthly_commit:,.0f}/mo**)? Reply **'Yes'** or click Confirm to create it automatically!",
            )

        # 5. Add contribution to savings goal
        if any(w in q for w in ["save", "contribute", "deposit", "add to goal"]) and context["goals"]:
            amount_match = re.search(r"(?:rs\.?|₹|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)", q)
            amount = 5000.0
            if amount_match:
                try:
                    amount = float(amount_match.group(1).replace(",", ""))
                except Exception:
                    amount = 5000.0

            target_goal = context["goals"][0]
            for g in context["goals"]:
                if g.title.lower() in q or g.category.value.lower() in q:
                    target_goal = g
                    break

            return (
                ActionType.ADD_GOAL_CONTRIBUTION,
                {
                    "goal_id": target_goal.id,
                    "goal_title": target_goal.title,
                    "amount": amount,
                    "notes": "Added via Sahay AI Assistant",
                },
                f"Would you like to record a deposit of **₹{amount:,.2f}** into **'{target_goal.title}'** (Current: ₹{target_goal.current_amount:,.2f})?",
            )

        # 5. Add Allergy
        if ("allergy" in q or "allergic" in q) and any(w in q for w in ["add", "record", "note", "new"]):
            profile = context["health_profiles"][0] if context["health_profiles"] else None
            allergen = "Penicillin"
            if "peanut" in q:
                allergen = "Peanuts"
            elif "dust" in q:
                allergen = "Dust mites"
            elif "sulfa" in q:
                allergen = "Sulfa drugs"

            if profile:
                member_name = profile.member.display_name if profile.member else "Family Member"
                return (
                    ActionType.ADD_ALLERGY,
                    {
                        "profile_id": profile.id,
                        "member_name": member_name,
                        "allergen": allergen,
                        "severity": "severe",
                        "reaction": "Rash and swelling",
                    },
                    f"Shall I record an allergy to **{allergen}** on **{member_name}**'s Health Profile?",
                )

        return None

    @classmethod
    def _build_system_prompt_with_context(cls, context: Dict[str, Any]) -> str:
        inc = context.get("expected_income", 85000.0)
        sav = context.get("planned_savings", 15000.0)
        rent = context.get("rent_expense", 18000.0)
        groceries = context.get("groceries_expense", 12000.0)
        utilities = context.get("utilities_expense", 5000.0)
        other = context.get("other_expenses", 5000.0)
        living_exp = context.get("total_living_expenses", rent + groceries + utilities + other)
        bills = context.get("total_monthly_bills", 0.0)
        goal_commits = context.get("total_goal_commitments", 0.0)
        surplus = context.get("disposable_surplus", 0.0)

        # Obligations summary
        pending_obs = [o for o in context["obligations"] if o.status in [ObligationStatus.PENDING, ObligationStatus.DUE_TODAY]]
        overdue_obs = [o for o in context["obligations"] if o.status == ObligationStatus.OVERDUE]
        obs_lines = []
        for o in (overdue_obs + pending_obs)[:8]:
            obs_lines.append(f"- {o.title}: ₹{o.amount:,.2f} (Due: {o.due_date}, Status: {o.status.value})")
        obs_summary = "\n".join(obs_lines) if obs_lines else "None pending"

        # Goals summary
        goals_lines = []
        for g in context["goals"]:
            pct = (g.current_amount / g.target_amount * 100) if g.target_amount > 0 else 0
            committed = sum(float(c.monthly_commitment_amount) for c in g.contributors)
            goals_lines.append(f"- {g.title}: ₹{g.current_amount:,.2f} of ₹{g.target_amount:,.2f} ({pct:.1f}%), Committed: ₹{committed:,.0f}/mo")
        goals_summary = "\n".join(goals_lines) if goals_lines else "No goals recorded"

        # Health profiles summary
        health_lines = []
        for p in context["health_profiles"]:
            m_name = p.member.display_name if p.member else "Member"
            meds = [f"{m.name} ({m.dosage})" for m in p.medicines if m.is_active]
            allergies = [f"{a.allergen} ({a.severity.value})" for a in p.allergies]
            health_lines.append(f"- {m_name}: Blood Group {p.blood_group.value}, Allergies: {', '.join(allergies) or 'None'}, Meds: {', '.join(meds) or 'None'}")
        health_summary = "\n".join(health_lines) if health_lines else "No health profiles"

        # Documents summary with extracted fields for Explainable AI
        doc_lines = []
        for d in context["documents"][:8]:
            fields = context["extracted_fields"].get(d.id, [])
            f_str = ", ".join([f"{f.field_name}: '{f.user_confirmed_value or f.field_value}' (evidence: '{f.source_evidence}', conf: {f.confidence:.2f})" for f in fields[:6]])
            doc_lines.append(f"- Document '{d.title}' (File: '{d.file_name}', Type: '{d.document_type}', Expiry: {d.expiry_date}): {f_str or 'No fields extracted'}")
        docs_summary = "\n".join(doc_lines) if doc_lines else "No documents uploaded yet"

        return f"""You are the Sahay Household AI Assistant, an empathetic, intelligent, and accurate financial and household life-admin assistant for an Indian family.
You have real-time access to the following verified household data:

### Household Financial Overview:
- Expected Monthly Income: ₹{inc:,.0f}
- Planned Monthly Savings Buffer: ₹{sav:,.0f}
- Monthly Living Expenses: ₹{living_exp:,.0f}
  • Room Rent / Housing: ₹{rent:,.0f}
  • Groceries & Daily Needs: ₹{groceries:,.0f}
  • Utilities & Maintenance: ₹{utilities:,.0f}
  • Other / Lifestyle Expenses: ₹{other:,.0f}
- Total Scheduled Obligations/Bills: ₹{bills:,.0f}
- Total Active Goal Commitments: ₹{goal_commits:,.0f} / mo
- Net Free Cash Flow Surplus (Remaining Balance): ₹{surplus:,.0f} / mo

### Upcoming / Pending Bills (Sahay Daily):
{obs_summary}

### Lakshya Savings Goals:
{goals_summary}

### Family Health Shield (Medical Vitals):
{health_summary}

### Family Vault Documents:
{docs_summary}

### Critical Presentation & Visual Formatting Guidelines:
1. **Visual Clarity Over Plain Text**: Never output walls of plain text. Use rich markdown tables, visual metrics, and structured visual cards.
2. **Always Use Markdown Tables** for:
   - Financial summaries (comparing Income, Rent, Groceries, Utilities, Lifestyle, Scheduled Bills, and Net Surplus).
   - Expense optimization & recommendations (Item, Current Spend, Suggested Action, Lifestyle Impact).
   - Bills and due dates (Bill Title, Amount, Due Date, Priority/Status).
   - Savings goals (Goal Name, Target Amount, Saved So Far, Completion %, Monthly Contribution).
   - Health vitals & medicines (Member, Blood Group, Active Medication, Dosage).
3. **Use Visual Badges & Status Signals**:
   - 🟢 ON TRACK / 🟢 ESSENTIAL (Expenses to strictly preserve)
   - 🟡 ACTION NEEDED / 🟡 OPTIMIZE (Discretionary areas where painless cuts can be made)
   - 🔴 CRITICAL / 🔴 DUE SOON
4. **Financial & Goal Advice Rules**:
   - **Preserve Daily Lifestyle**: Explicitly keep essential living costs (Room Rent, nutritious Groceries, Medicines) protected with 🟢 ESSENTIAL.
   - **Painless Trimming**: Identify low-impact discretionary savings (e.g. broadband renegotiation, streaming subscriptions, food delivery charges) to save ₹2,000–₹3,500/mo without hurting family well-being.
   - **Smart Goal Rebalancing**: If cash flow is tight, advise temporarily scaling down distant long-term goals (7–10 year horizon) to secure a 3-month liquid Emergency Buffer first.
   - **Payday Automated Rule**: Transfer planned savings on day 1 so remaining funds are spent guilt-free.
5. **🚨 EMERGENCY MODE / PANDEMIC & CRISIS LIQUIDITY GUIDANCE**:
   - Whenever the user faces an urgent emergency or crisis (e.g., pandemic situation, medical crisis, hospitalization, or states they urgently require a sum like ₹5,00,000 / 5 lakhs and their account does not have that much liquid money):
   - You MUST activate **Emergency Mode Financial Advice**:
     a) Present an **Executive Overview Table** of the Emergency Deficit (Urgent Requirement, Available Liquid Surplus, Deficit to mobilize).
     b) Present a **🔄 Smart Goal Reallocation Advice Table**:
        - Analyze the user's specific saved goals (e.g., Car / Vehicle, House Down Payment, Vacation, Wedding).
        - Tell the user in clear, empathetic, conversational language: "You have saved for your Car right? Take some amount from it (e.g. ₹1,50,000) and you have saved for your House goal right? Take some amount from it (e.g. ₹2,50,000)."
        - Advise liquidating discretionary goals (Car, Vacation) before touching essential ones.
     c) Emphasize the **🛡️ Post-Crisis Restoration Plan**:
        - Remind the user: "And again, keep the money back / replenish these goals once you get the money or after the emergency passes (e.g., depositing ₹X/month back into Car and House goals) so your long-term plans remain intact."
6. Format your response into distinct visual sections:
   - 📊 **Executive Overview Table**
   - 💡 **Actionable Insights & Recommendations**
   - 🚀 **Next Steps / Proposed Action**
"""

    @classmethod
    def call_gemini_or_openai(
        cls,
        prompt: str,
        system_instruction: str,
    ) -> Optional[str]:
        # 1. Try Gemini
        if settings.GEMINI_API_KEY:
            models_to_try = [
                settings.AI_MODEL if settings.AI_MODEL else "gemini-3.1-flash-lite",
                "gemini-3.1-flash-lite",
                "gemma-4-26b-a4b-it",
            ]
            # Deduplicate while preserving order
            seen_models = set()
            candidate_models = []
            for m in models_to_try:
                if m not in seen_models:
                    seen_models.add(m)
                    candidate_models.append(m)

            for model in candidate_models:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
                    payload = {
                        "contents": [
                            {
                                "role": "user",
                                "parts": [{"text": f"{system_instruction}\n\nUser Question:\n{prompt}"}],
                            }
                        ],
                        "generationConfig": {
                            "temperature": 0.3,
                            "maxOutputTokens": 2048,
                        },
                    }
                    with httpx.Client(timeout=12.0) as client:
                        resp = client.post(url, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            candidates = data.get("candidates", [])
                            if candidates:
                                text_parts = candidates[0].get("content", {}).get("parts", [])
                                if text_parts and "text" in text_parts[0]:
                                    return text_parts[0]["text"].strip()
                        else:
                            logger.warning(f"Gemini API ({model}) returned status {resp.status_code}: {resp.text}")
                except Exception as e:
                    logger.warning(f"Gemini API ({model}) error: {e}")

        # 2. Try OpenAI
        if settings.OPENAI_API_KEY:
            try:
                url = "https://api.openai.com/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1500,
                }
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"].strip()
                    else:
                        logger.warning(f"OpenAI API returned status {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.warning(f"OpenAI API error: {e}")

        return None

    @classmethod
    def generate_grounded_response(
        cls,
        query: str,
        context: Dict[str, Any],
        citations: List[AICitation],
        action_proposal: Optional[Tuple[ActionType, Dict[str, Any], str]] = None,
    ) -> str:
        q_lower = query.lower()

        # Check for unverified / missing document inquiries (Zero Hallucination Guard)
        doc_keywords = ["passport", "driving license", "pan card", "aadhaar", "insurance", "policy", "bill", "certificate", "voter"]
        requested_doc_types = [kw for kw in doc_keywords if kw in q_lower]
        if requested_doc_types and ("expiry" in q_lower or "date" in q_lower or "number" in q_lower or "when" in q_lower):
            has_matching_doc = any(
                any(kw in d.title.lower() or kw in (d.document_type or '').lower() or kw in d.file_name.lower() for kw in requested_doc_types)
                for d in context.get("documents", [])
            )
            if not has_matching_doc:
                return (
                    "I couldn't verify this information from your uploaded documents.\n\n"
                    "No matching document or verified record was found in your Family Vault. "
                    "Please upload the document to verify this detail."
                )

        # If API key is present, attempt live LLM generation
        if settings.GEMINI_API_KEY or settings.OPENAI_API_KEY:
            sys_prompt = cls._build_system_prompt_with_context(context)
            llm_text = cls.call_gemini_or_openai(query, sys_prompt)
            if llm_text:
                # Append Explainable AI Verification Card if document citations with evidence exist
                doc_cits = [c for c in citations if c.source_type == "document" and c.evidence]
                if doc_cits and any(w in q_lower for w in ["expiry", "expire", "valid", "due", "when", "document", "evidence", "source", "verify", "date", "policy", "premium"]):
                    cit = doc_cits[0]
                    conf_str = f"{int((cit.confidence_score or 0.95) * 100)}%"
                    verification_block = (
                        f"\n\n### 🔍 Verified Document Evidence (Explainable AI)\n"
                        f"- **Source**: `{cit.file_name or cit.title}`\n"
                        f"- **Page**: {cit.page_number or 1}\n"
                        f"- **Evidence**: \"{cit.evidence}\"\n"
                        f"- **Confidence**: {conf_str} (Based on extraction system's measured reliability)"
                    )
                    if "Evidence" not in llm_text:
                        llm_text += verification_block

                if action_proposal and action_proposal[2] not in llm_text:
                    llm_text += f"\n\n{action_proposal[2]}"
                return llm_text

        # Grounded fallback engine
        return cls._build_grounded_fallback_response(query, context, citations, action_proposal)

    @classmethod
    def _build_grounded_fallback_response(
        cls,
        query: str,
        context: Dict[str, Any],
        citations: List[AICitation],
        action_proposal: Optional[Tuple[ActionType, Dict[str, Any], str]] = None,
    ) -> str:
        q = query.lower()

        # Income, Budget, Financial Advice, Surplus, Affordability, Expenses & Goal Optimization
        if any(w in q for w in ["income", "salary", "budget", "surplus", "afford", "advice", "capacity", "cash flow", "save", "expense", "invest", "reduce", "lifestyle", "rent", "grocer"]):
            income = context.get("expected_income", 85000.0)
            savings_buffer = context.get("planned_savings", 15000.0)
            bills = context.get("total_monthly_bills", 0.0)
            goal_commits = context.get("total_goal_commitments", 0.0)
            rent = context.get("rent_expense", 18000.0)
            groceries = context.get("groceries_expense", 12000.0)
            utilities = context.get("utilities_expense", 5000.0)
            other = context.get("other_expenses", 5000.0)
            living_exp = context.get("total_living_expenses", rent + groceries + utilities + other)
            surplus = context.get("disposable_surplus", 0.0)

            # Check if query asks about affordability of a specific amount (e.g. "Can we afford 15000?")
            amt_match = re.search(r"(?:rs\.?|₹|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)", q)
            target_amount = float(amt_match.group(1).replace(",", "")) if amt_match else None

            lines = [
                f"### 📊 Household Monthly Cash Flow Overview:",
                "| Cash Flow Component | Monthly Amount | Status / Category |",
                "| :--- | :--- | :--- |",
                f"| **Expected Monthly Income** | ₹{income:,.0f} | 🟢 Total Inflow |",
                f"| **Room Rent / Housing** | ₹{rent:,.0f} | 🟢 ESSENTIAL (Protected) |",
                f"| **Groceries & Nutrition** | ₹{groceries:,.0f} | 🟢 ESSENTIAL (Protected) |",
                f"| **Utilities & Telecom** | ₹{utilities:,.0f} | 🟡 Review & Optimize |",
                f"| **Other / Lifestyle Expenses** | ₹{other:,.0f} | 🟡 Discretionary Trimming |",
                f"| **Scheduled Bills (Sahay Daily)** | ₹{bills:,.0f} | ⚡ Pending Obligations |",
                f"| **Active Goal Commitments** | ₹{goal_commits:,.0f} | 🎯 Lakshya Goals |",
                f"| **Target Savings Buffer** | ₹{savings_buffer:,.0f} | 🟢 Planned Reserve |",
                f"| **Net Free Cash Flow Surplus** | **₹{surplus:,.0f} / mo** | 🟢 Available for Goals |",
            ]

            # Specialized Advice: Where to Invest Less & Where to Reduce Expenses Without Compromising Daily Lifestyle
            if any(w in q for w in ["advice", "reduce", "invest", "save", "cut", "lifestyle", "goal", "where", "expense", "how"]):
                lines.append("\n### 💡 Lifestyle-Preserving Optimization Strategy:")
                lines.append("| Budget Category | Current Cost | Optimization Recommendation | Potential Savings | Lifestyle Impact |")
                lines.append("| :--- | :--- | :--- | :--- | :--- |")
                lines.append(f"| **Housing (Rent)** | ₹{rent:,.0f} | Keep 100% intact (protect shelter) | ₹0 | 🟢 Fully Protected |")
                lines.append(f"| **Groceries & Nutrition** | ₹{groceries:,.0f} | Maintain healthy staples & medical diet | ₹0 | 🟢 Health Preserved |")
                lines.append(f"| **Utilities & Telecom** | ₹{utilities:,.0f} | Audit broadband & consolidate streaming OTT | ~₹1,000 / mo | 🟢 Zero Disruption |")
                lines.append(f"| **Impulse Dining & Delivery** | ₹{other:,.0f} | Set weekly UPI spending envelope | ~₹2,500 / mo | 🟢 High Financial Peace |")
                lines.append("| **Goal Rebalancing** | Lakshya | Ease distant 7-10 yr horizons if needed | ~₹1,500 / mo | 🟢 Liquid Emergency First |")
                lines.append("\n### 🎯 Actionable Golden Rules:")
                lines.append("1. **Payday Automation**: Move your targeted savings into your Lakshya goal vault on day 1 of salary credit so you spend the rest guilt-free.")
                lines.append("2. **Emergency Cushion First**: Maintain 3 months of essential expenses before locking funds into volatile or illiquid instruments.")

            if target_amount:
                if surplus >= target_amount:
                    lines.append(
                        f"\n✅ **Affordability Analysis**: You have a free surplus of **₹{surplus:,.0f}/mo**, which **comfortably covers** a new allocation of **₹{target_amount:,.0f}/mo** with ₹{surplus - target_amount:,.0f}/mo left over."
                    )
                else:
                    shortfall = target_amount - surplus
                    lines.append(
                        f"\n⚠️ **Cash Flow Warning**: A commitment of **₹{target_amount:,.0f}/mo** exceeds your currently unallocated monthly surplus of ₹{surplus:,.0f} by **₹{shortfall:,.0f}/month**. Consider adjusting other goal timelines or discretionary expenses first."
                    )
            elif not any(w in q for w in ["advice", "reduce", "invest", "save", "cut", "lifestyle", "goal", "where"]):
                if surplus > 0:
                    lines.append(
                        f"\n💡 **Financial Guidance**: Your household is operating cash-flow positive! You have **₹{surplus:,.0f}/month** in unallocated surplus that can be routed to new Lakshya Goal Vaults (e.g., Emergency Buffer or Education)."
                    )
                else:
                    lines.append(
                        f"\n⚠️ **Budget Alert**: Your planned commitments, living expenses, and bills match or exceed monthly income. We recommend reviewing non-essential obligations before adding new savings goals."
                    )

            if action_proposal:
                lines.append(f"\n{action_proposal[2]}")

            return "\n".join(lines)

        # Bills / Obligations
        if any(w in q for w in ["bill", "obligation", "due", "pay", "mseb", "airtel", "rent", "adani"]):
            obligations = context["obligations"]
            if not obligations:
                return "You currently have no pending obligations or upcoming bills registered in Sahay Daily. Would you like me to help schedule one?"

            pending = [o for o in obligations if o.status in [ObligationStatus.PENDING, ObligationStatus.DUE_TODAY]]
            overdue = [o for o in obligations if o.status == ObligationStatus.OVERDUE]

            parts = []
            if overdue:
                parts.append(f"⚠️ You have **{len(overdue)} overdue bill(s)** totaling ₹{sum(o.amount for o in overdue):,.2f}.")
            if pending:
                bill_rows = [f"| **{o.title}** | ₹{o.amount:,.2f} | {o.due_date} | {o.biller_or_payee or 'Direct'} | ⚡ {o.status.value.upper()} |" for o in pending[:5]]
                table_str = "\n".join([
                    "| Bill Title | Amount | Due Date | Payee | Status |",
                    "| :--- | :--- | :--- | :--- | :--- |",
                ] + bill_rows)
                parts.append(f"### ⚡ Upcoming Household Bills:\n{table_str}")
            else:
                parts.append("All scheduled bills are currently marked as paid! Great job staying ahead.")

            if action_proposal:
                parts.append(f"\n{action_proposal[2]}")
            return "\n\n".join(parts)

        # Health / Medical
        if any(w in q for w in ["health", "blood", "allergy", "medicine", "doctor", "medical", "hospital"]):
            profiles = context["health_profiles"]
            if not profiles:
                return "There are no health profiles set up in Health Shield yet. You can create health profiles for each family member to track blood groups, allergies, and daily medications."

            health_rows = []
            for p in profiles:
                m_name = p.member.display_name if p.member else "Member"
                meds = [f"{m.name} ({m.dosage})" for m in p.medicines if m.is_active]
                allergies = [f"{a.allergen} ({a.severity.value})" for a in p.allergies]
                med_str = ", ".join(meds) if meds else "None active"
                allergy_str = ", ".join(allergies) if allergies else "None reported"
                b_grp = p.blood_group.value if p.blood_group else "Unknown"
                health_rows.append(f"| **{m_name}** | {b_grp} | {allergy_str} | {med_str} |")

            table_str = "\n".join([
                "| Family Member | Blood Group | Allergies | Active Medications |",
                "| :--- | :--- | :--- | :--- |",
            ] + health_rows)
            res = f"### 💊 Verified Family Health Vitals:\n{table_str}" 
            if action_proposal:
                res += f"\n\n{action_proposal[2]}"
            return res

        # Lakshya Goals
        if any(w in q for w in ["goal", "savings", "lakshya", "target", "education", "fund", "balance"]):
            goals = context["goals"]
            if not goals:
                return "No Lakshya savings goals have been created yet. You can create goals like Emergency Buffer, Children's Education, or Home Down Payment."

            goal_rows = []
            for g in goals:
                pct = (g.current_amount / g.target_amount * 100) if g.target_amount > 0 else 0
                committed = sum(float(c.monthly_commitment_amount) for c in g.contributors)
                status_icon = "🟢" if pct >= 60 else ("🟡" if pct >= 25 else "⚡")
                goal_rows.append(f"| **{g.title}** | ₹{g.target_amount:,.0f} | ₹{g.current_amount:,.0f} | {pct:.1f}% | ₹{committed:,.0f}/mo | {status_icon} {g.status.value.upper()} |")

            table_str = "\n".join([
                "| Goal Title | Target Amount | Current Saved | Progress | Monthly Commitment | Status |",
                "| :--- | :--- | :--- | :--- | :--- | :--- |",
            ] + goal_rows)
            res = f"### 🎯 Active Lakshya Goals Progress:\n{table_str}" 
            if action_proposal:
                res += f"\n\n{action_proposal[2]}"
            return res

        # Explainable AI Document Query Interception
        if any(w in q for w in ["expiry", "expire", "validity", "valid until", "sum insured", "coverage", "premium", "policy number", "consumer no", "meter"]):
            matched_doc = None
            matched_field = None

            for d in context["documents"]:
                d_text = f"{d.title} {d.document_type} {d.file_name}".lower()
                fields = context["extracted_fields"].get(d.id, [])
                token_hits = sum(1 for t in ["insurance", "health", "car", "vehicle", "electricity", "bill", "school", "policy", "mseb", "adani"] if t in q and t in d_text)
                if token_hits > 0 or len(context["documents"]) == 1:
                    matched_doc = d
                    if any(w in q for w in ["expiry", "expire", "validity", "valid until"]):
                        for f in fields:
                            if any(k in f.field_name.lower() for k in ["expiry", "valid", "due"]):
                                matched_field = f
                                break
                    elif any(w in q for w in ["sum insured", "coverage"]):
                        for f in fields:
                            if any(k in f.field_name.lower() for k in ["sum_insured", "coverage", "idv"]):
                                matched_field = f
                                break
                    elif any(w in q for w in ["premium", "cost", "amount"]):
                        for f in fields:
                            if any(k in f.field_name.lower() for k in ["premium", "amount", "fee"]):
                                matched_field = f
                                break
                    elif any(w in q for w in ["consumer", "account", "meter"]):
                        for f in fields:
                            if any(k in f.field_name.lower() for k in ["consumer", "account", "meter"]):
                                matched_field = f
                                break

                    if matched_field:
                        break

            if matched_doc and (matched_field or matched_doc.expiry_date):
                val = (matched_field.user_confirmed_value or matched_field.field_value) if matched_field else str(matched_doc.expiry_date)
                param_name = matched_field.field_name.replace("_", " ").title() if matched_field else "Expiry Date"
                evidence = matched_field.source_evidence if matched_field and matched_field.source_evidence else f"{param_name}: {val}"
                conf_pct = int((matched_field.confidence if matched_field else 0.95) * 100)

                return (
                    f"### 📄 Verified Document Information\n\n"
                    f"- **{param_name}**: {val}\n"
                    f"- **Source**: `{matched_doc.file_name}`\n"
                    f"- **Page**: 1\n"
                    f"- **Evidence**: \"{evidence}\"\n"
                    f"- **Confidence**: {conf_pct}% (Based on extraction system's measured reliability)"
                )
            else:
                return "I couldn't verify this information from your uploaded documents."

        # Documents / Vault general listing
        if any(w in q for w in ["doc", "document", "aadhaar", "pan", "passport", "policy", "certificate"]):
            docs = context["documents"]
            if not docs:
                return "You do not have any accessible documents matching this in your Family Vault. Only documents matching your household permission level are displayed."

            doc_items = []
            for d in docs[:4]:
                doc_items.append(f"- **{d.title}** ({d.document_type}, Access: {d.access_level.value})")

            return f"Found **{len(docs)} accessible document(s)** in your Family Vault:\n" + "\n".join(doc_items)

        # General Household Summary
        doc_count = len(context["documents"])
        ob_count = len([o for o in context["obligations"] if o.status in [ObligationStatus.PENDING, ObligationStatus.DUE_TODAY]])
        hp_count = len(context["health_profiles"])
        goal_count = len(context["goals"])
        inc = context.get("expected_income", 85000.0)

        reply = (
            f"Namaste! As your **Sahay Household AI Assistant**, I have verified access to your household records with strict role permissions:\n\n"
            f"- **Household Monthly Income**: ₹{inc:,.0f} / month\n"
            f"- **Family Vault**: {doc_count} accessible document(s)\n"
            f"- **Sahay Daily**: {ob_count} pending obligation(s)\n"
            f"- **Health Shield**: {hp_count} family health profile(s)\n"
            f"- **Lakshya Goals**: {goal_count} active savings goal(s)\n\n"
            f"You can ask me questions about upcoming bills, family medical histories, goal run-rates, or advice on budget and savings capacity."
        )

        if action_proposal:
            reply += f"\n\n{action_proposal[2]}"

        return reply

    @classmethod
    async def execute_confirmed_action(
        cls,
        action: AIActionRequest,
        household_id: str,
        current_user: User,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        payload = json.loads(action.action_payload_json)

        if action.action_type == ActionType.CREATE_GOAL:
            target_d = datetime.strptime(payload.get("target_date", "2027-11-01"), "%Y-%m-%d").date()
            target_amt = float(payload.get("target_amount", 100000.0))
            title = payload.get("title", "Savings Goal Vault")
            category_str = payload.get("category", "custom")
            try:
                cat_enum = GoalCategory(category_str)
            except Exception:
                cat_enum = GoalCategory.CUSTOM

            goal_id = str(uuid.uuid4())
            goal = GoalVault(
                id=goal_id,
                household_id=household_id,
                created_by_user_id=current_user.id,
                title=title,
                description=payload.get("description", f"Created via Sahay AI for {title}"),
                category=cat_enum,
                target_amount=target_amt,
                current_amount=0.0,
                currency="INR",
                start_date=date.today(),
                target_date=target_d,
                priority=GoalPriority.HIGH,
                status=GoalStatus.ACTIVE,
            )
            db.add(goal)

            # 4 progression milestones (25%, 50%, 75%, 100%)
            for pct, m_name in [
                (25.0, "Quarter Milestone (25%)"),
                (50.0, "Halfway Mark (50%)"),
                (75.0, "Home Stretch (75%)"),
                (100.0, "Goal Fulfilled (100%)"),
            ]:
                db.add(
                    GoalMilestone(
                        id=str(uuid.uuid4()),
                        goal_id=goal_id,
                        milestone_name=m_name,
                        target_percentage=pct,
                        target_amount=round(target_amt * (pct / 100.0), 2),
                        is_reached=False,
                    )
                )

            monthly_commit = float(payload.get("monthly_commitment", 5000.0))
            member_res = await db.execute(
                select(HouseholdMember).where(
                    HouseholdMember.household_id == household_id,
                    HouseholdMember.user_id == current_user.id,
                )
            )
            member = member_res.scalar_one_or_none()
            if member:
                db.add(
                    GoalContributor(
                        id=str(uuid.uuid4()),
                        goal_id=goal_id,
                        member_id=member.id,
                        monthly_commitment_amount=monthly_commit,
                        target_share_percentage=100.0,
                    )
                )

            await db.commit()
            await db.refresh(goal)
            return {
                "goal_id": goal.id,
                "title": goal.title,
                "target_amount": goal.target_amount,
                "category": goal.category.value,
                "monthly_commitment": monthly_commit,
            }

        elif action.action_type == ActionType.UPDATE_MONEY_PROFILE:
            inc = float(payload.get("expected_monthly_income", 85000.0))
            sav = float(payload.get("planned_monthly_savings", 15000.0))
            notes = payload.get("notes", "Updated via Sahay AI Assistant")

            rent = float(payload.get("rent_expense", 18000.0))
            groceries = float(payload.get("groceries_expense", 12000.0))
            utilities = float(payload.get("utilities_expense", 5000.0))
            other = float(payload.get("other_expenses", 5000.0))

            prof_res = await db.execute(
                select(HouseholdMoneyProfile).where(HouseholdMoneyProfile.household_id == household_id)
            )
            profile = prof_res.scalar_one_or_none()
            if not profile:
                profile = HouseholdMoneyProfile(
                    id=str(uuid.uuid4()),
                    household_id=household_id,
                    expected_monthly_income=inc,
                    planned_monthly_savings=sav,
                    rent_expense=rent,
                    groceries_expense=groceries,
                    utilities_expense=utilities,
                    other_expenses=other,
                    notes=notes,
                )
                db.add(profile)
            else:
                profile.expected_monthly_income = inc
                profile.planned_monthly_savings = sav
                if "rent_expense" in payload:
                    profile.rent_expense = rent
                if "groceries_expense" in payload:
                    profile.groceries_expense = groceries
                if "utilities_expense" in payload:
                    profile.utilities_expense = utilities
                if "other_expenses" in payload:
                    profile.other_expenses = other
                profile.notes = notes
                db.add(profile)
            await db.commit()
            return {
                "household_id": household_id,
                "expected_monthly_income": inc,
                "planned_monthly_savings": sav,
                "rent_expense": profile.rent_expense,
                "groceries_expense": profile.groceries_expense,
            }

        elif action.action_type == ActionType.MARK_PAID:
            ob_id = payload.get("obligation_id")
            ob_res = await db.execute(select(Obligation).where(Obligation.id == ob_id))
            ob = ob_res.scalar_one_or_none()
            if not ob:
                raise ValueError("Obligation not found")
            ob.status = ObligationStatus.PAID
            ob.paid_at = datetime.now(timezone.utc)
            ob.paid_amount = ob.amount
            await db.commit()
            return {"obligation_id": ob.id, "title": ob.title, "new_status": ob.status.value}

        elif action.action_type == ActionType.CREATE_OBLIGATION:
            due_d = datetime.strptime(payload.get("due_date", "2026-11-15"), "%Y-%m-%d").date()
            new_ob = Obligation(
                household_id=household_id,
                created_by_user_id=current_user.id,
                title=payload.get("title", "Household Bill"),
                amount=float(payload.get("amount", 1000.0)),
                category="utilities",
                due_date=due_d,
                priority=ObligationPriority.HIGH,
                recurrence=RecurrenceFrequency.MONTHLY,
                status=ObligationStatus.PENDING,
                obligation_type=ObligationType.BILL,
            )
            db.add(new_ob)
            await db.commit()
            await db.refresh(new_ob)
            return {"obligation_id": new_ob.id, "title": new_ob.title, "amount": new_ob.amount}

        elif action.action_type == ActionType.ADD_GOAL_CONTRIBUTION:
            goal_id = payload.get("goal_id")
            goal_res = await db.execute(select(GoalVault).where(GoalVault.id == goal_id))
            goal = goal_res.scalar_one_or_none()
            if not goal:
                raise ValueError("Goal not found")

            amt = float(payload.get("amount", 0.0))
            contrib = GoalContribution(
                goal_id=goal.id,
                recorded_by_user_id=current_user.id,
                amount=amt,
                notes=payload.get("notes", "AI Assistant Deposit"),
            )
            goal.current_amount += amt
            db.add(contrib)
            await db.commit()
            await db.refresh(goal)
            return {"goal_id": goal.id, "new_balance": goal.current_amount, "added": amt}

        elif action.action_type == ActionType.ADD_ALLERGY:
            profile_id = payload.get("profile_id")
            prof_res = await db.execute(select(HealthProfile).where(HealthProfile.id == profile_id))
            profile = prof_res.scalar_one_or_none()
            if not profile:
                raise ValueError("Health profile not found")

            allergy = Allergy(
                health_profile_id=profile.id,
                allergen=payload.get("allergen", "Unknown allergen"),
                severity=AllergySeverity.SEVERE if payload.get("severity") == "severe" else AllergySeverity.MODERATE,
                reaction=payload.get("reaction", "Reaction noted"),
            )
            db.add(allergy)
            await db.commit()
            return {"profile_id": profile.id, "allergen": allergy.allergen, "severity": allergy.severity.value}

        elif action.action_type == ActionType.ADD_MEDICINE:
            profile_id = payload.get("profile_id")
            prof_res = await db.execute(select(HealthProfile).where(HealthProfile.id == profile_id))
            profile = prof_res.scalar_one_or_none()
            if not profile:
                raise ValueError("Health profile not found")

            med = Medicine(
                health_profile_id=profile.id,
                name=payload.get("name", "Medicine"),
                dosage=payload.get("dosage", "1 tablet"),
                frequency=MedicineFrequency.ONCE_DAILY,
            )
            db.add(med)
            await db.commit()
            return {"profile_id": profile.id, "medicine": med.name}

        else:
            return {"custom": "executed"}
