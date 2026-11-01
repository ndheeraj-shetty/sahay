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
from app.models.lakshya import GoalContribution, GoalContributor, GoalStatus, GoalVault
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
            doc_text = f"{doc.title} {doc.document_type}".lower()
            fields = context["extracted_fields"].get(doc.id, [])
            fields_text = " ".join([f"{f.field_name}:{f.field_value or ''}" for f in fields]).lower()
            combined = doc_text + " " + fields_text

            score = sum(1 for t in query_tokens if t in combined)
            if score > 0 or any(w in query_lower for w in ["document", "doc", "bill", "aadhaar", "pan", "passport", "policy", "insurance"]):
                snippet_parts = [f"Type: {doc.document_type}"]
                if fields:
                    sample_f = [f"{f.field_name}: {f.user_confirmed_value or f.field_value}" for f in fields[:3]]
                    snippet_parts.append("; ".join(sample_f))
                citations.append(
                    AICitation(
                        source_type="document",
                        source_id=doc.id,
                        title=doc.title,
                        snippet=" | ".join(snippet_parts),
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

        # 4. Add contribution to savings goal
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

        # Documents summary
        doc_lines = [f"- {d.title} ({d.document_type})" for d in context["documents"][:6]]
        docs_summary = "\n".join(doc_lines) if doc_lines else "None"

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

### Key Instructions:
1. Always base your answers on the verified household data above.
2. When asked for advice about goals, expenses, or where to invest less / save money:
   - **Preserve Daily Lifestyle**: Strongly protect essential living costs like Room Rent, healthy Groceries, and vital Medicines. Never recommend cutting essentials that affect family well-being or morale.
   - **Painless Expense Reductions**: Identify low-impact discretionary savings (e.g. telecom/broadband packages, duplicate streaming subscriptions, impulse dining/delivery fees) to save ₹2,000–₹3,500/mo without lifestyle drop.
   - **Smart Goal & Investment Rebalancing**: If cash flow is tight, advise temporarily scaling down distant long-term goals (e.g. 7–10 year horizon) by ₹1,000–₹2,000/mo to first fund an immediate 3-month liquid Emergency Buffer.
   - **Payday Automation**: Remind them to transfer goal savings on payday so the rest is spent guilt-free.
3. Be clear, polite, concise, and structured with markdown bullet points and bold highlights.
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
        # If API key is present, attempt live LLM generation
        if settings.GEMINI_API_KEY or settings.OPENAI_API_KEY:
            sys_prompt = cls._build_system_prompt_with_context(context)
            llm_text = cls.call_gemini_or_openai(query, sys_prompt)
            if llm_text:
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
                f"### 📊 Household Monthly Financial Overview & Balance:",
                f"- **Expected Monthly Income**: ₹{income:,.0f}",
                f"- **Essential Living Expenses**: ₹{living_exp:,.0f} / mo",
                f"  • Room Rent / Housing: ₹{rent:,.0f}",
                f"  • Groceries & Daily Needs: ₹{groceries:,.0f}",
                f"  • Utilities & Maintenance: ₹{utilities:,.0f}",
                f"  • Other / Lifestyle Expenses: ₹{other:,.0f}",
                f"- **Scheduled Obligations & Debts (Sahay Daily)**: ₹{bills:,.0f}",
                f"- **Active Lakshya Goal Commitments**: ₹{goal_commits:,.0f} / mo",
                f"- **Target Monthly Savings Buffer**: ₹{savings_buffer:,.0f}",
                f"- **Net Free Cash Flow Surplus (Remaining Balance)**: **₹{surplus:,.0f} / month**",
            ]

            # Specialized Advice: Where to Invest Less & Where to Reduce Expenses Without Compromising Daily Lifestyle
            if any(w in q for w in ["advice", "reduce", "invest", "save", "cut", "lifestyle", "goal", "where", "expense", "how"]):
                lines.append("\n### 💡 Smart Strategy: Save for Goals Without Compromising Your Daily Lifestyle:")
                lines.append("1. **Preserve Your Essential Lifestyle (Do NOT Cut Here)**:")
                lines.append(f"   - Keep your **Room Rent (₹{rent:,.0f})** and **Healthy Groceries (₹{groceries:,.0f})** protected. Maintaining dietary quality and family comfort is critical for long-term health and productivity.")
                lines.append("2. **Painless Expense Trimming (Frees up ₹2,500–₹4,000/mo without lifestyle drop)**:")
                lines.append("   - **Utilities & Telecom**: Review broadband packages and consolidate recurring streaming/app subscriptions (saves ~₹800–₹1,200/mo).")
                lines.append("   - **Discretionary Incidentals**: Set a weekly cash or UPI wallet envelope for impulse dining and quick-commerce delivery fees (saves ~₹1,500–₹2,500/mo easily).")
                lines.append("3. **Where to Invest Less / Rebalance Goals**:")
                if goal_commits > 0:
                    lines.append("   - If short-term cash flow is tight, check your distant long-term goals (e.g. 7–10 year horizon). Temporarily downscale monthly commitments to far-away goals by ₹1,000–₹2,000/mo to ensure your immediate 3-month liquid Emergency Buffer is fully locked in.")
                else:
                    lines.append("   - Allocate first to a high-liquidity Lakshya Emergency Vault before locking money into volatile or illiquid instruments.")
                lines.append("4. **Payday Automation Rule**:")
                lines.append("   - Transfer targeted goal savings immediately on day 1 of your salary cycle. The remaining balance can then be spent guilt-free for the entire month!")

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
                next_bills = "\n".join([f"- **{o.title}**: ₹{o.amount:,.2f} (Due: {o.due_date})" for o in pending[:3]])
                parts.append(f"Here are your upcoming household bills:\n{next_bills}")
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

            summaries = []
            for p in profiles:
                m_name = p.member.display_name if p.member else "Member"
                meds = [m.name for m in p.medicines]
                allergies = [f"{a.allergen} ({a.severity.value})" for a in p.allergies]
                med_str = ", ".join(meds) if meds else "None"
                allergy_str = ", ".join(allergies) if allergies else "None reported"
                summaries.append(
                    f"- **{m_name}**: Blood Group **{p.blood_group.value if p.blood_group else 'Unknown'}** | Allergies: {allergy_str} | Active Meds: {med_str}"
                )

            res = "Here is the verified health summary for your household members:\n" + "\n".join(summaries)
            if action_proposal:
                res += f"\n\n{action_proposal[2]}"
            return res

        # Lakshya Goals
        if any(w in q for w in ["goal", "savings", "lakshya", "target", "education", "fund", "balance"]):
            goals = context["goals"]
            if not goals:
                return "No Lakshya savings goals have been created yet. You can create goals like Emergency Buffer, Children's Education, or Home Down Payment."

            summaries = []
            for g in goals:
                pct = (g.current_amount / g.target_amount * 100) if g.target_amount > 0 else 0
                committed = sum(float(c.monthly_commitment_amount) for c in g.contributors)
                summaries.append(
                    f"- **{g.title}**: ₹{g.current_amount:,.2f} of ₹{g.target_amount:,.2f} ({pct:.1f}%) | Committed: ₹{committed:,.0f}/mo — Status: **{g.status.value.replace('_', ' ').title()}**"
                )

            res = "Here is the current status of your family's **Lakshya Goals**:\n" + "\n".join(summaries)
            if action_proposal:
                res += f"\n\n{action_proposal[2]}"
            return res

        # Documents / Vault
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

        if action.action_type == ActionType.UPDATE_MONEY_PROFILE:
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
