import logging
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.vault import Document
from app.models.doctor import ExtractedDocumentField
from app.models.daily import Obligation, ObligationStatus
from app.models.health import HealthProfile, Medicine
from app.schemas.daily import (
    HouseholdRadarResponse,
    LifeEventItem,
    LifeEventTimelineBucket,
)

logger = logging.getLogger("sahay.radar")


class HouseholdRadarEngine:
    """
    Household Life-Event Radar Engine.
    Connects information across documents, obligations, healthcare needs, and family members
    into a unified predictive life-timeline.
    """

    @classmethod
    def _parse_date_string(cls, date_str: str) -> Optional[date]:
        if not date_str:
            return None
        date_str = date_str.strip()

        # Try standard YYYY-MM-DD
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except Exception:
            pass

        # Try DD/MM/YYYY or DD-MM-YYYY
        for fmt in ["%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%y", "%d-%m-%y"]:
            try:
                return datetime.strptime(date_str, fmt).date()
            except Exception:
                pass

        # Try matching DD Month YYYY
        try:
            cleaned = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", date_str, flags=re.IGNORECASE)
            for fmt in ["%d %b %Y", "%d %B %Y", "%b %d, %Y", "%B %d, %Y"]:
                try:
                    return datetime.strptime(cleaned, fmt).date()
                except Exception:
                    pass
        except Exception:
            pass

        return None

    @classmethod
    async def build_radar(cls, household_id: str, db: AsyncSession) -> HouseholdRadarResponse:
        today = date.today()

        # 1. Fetch Household Documents & Extracted Fields
        docs_res = await db.execute(
            select(Document).where(Document.household_id == household_id)
        )
        documents = docs_res.scalars().all()

        fields_res = await db.execute(
            select(ExtractedDocumentField).join(Document, ExtractedDocumentField.document_id == Document.id)
            .where(Document.household_id == household_id)
        )
        all_fields = fields_res.scalars().all()
        fields_by_doc: Dict[str, Dict[str, str]] = {}
        for f in all_fields:
            if f.document_id not in fields_by_doc:
                fields_by_doc[f.document_id] = {}
            val = f.user_confirmed_value or f.field_value or ""
            fields_by_doc[f.document_id][f.field_name.lower()] = val

        # 2. Fetch Household Obligations
        ob_res = await db.execute(
            select(Obligation)
            .options(selectinload(Obligation.assigned_member))
            .where(
                Obligation.household_id == household_id,
                Obligation.status.in_([ObligationStatus.PENDING, ObligationStatus.DUE_TODAY, ObligationStatus.OVERDUE]),
            )
        )
        obligations = ob_res.scalars().all()
        ob_by_source_doc: Dict[str, Obligation] = {}
        for ob in obligations:
            if ob.source_document_id:
                ob_by_source_doc[ob.source_document_id] = ob

        # 3. Fetch Medicines for refilling radar
        meds_res = await db.execute(
            select(HealthProfile)
            .options(selectinload(HealthProfile.medicines))
            .where(HealthProfile.household_id == household_id)
        )
        profiles = meds_res.scalars().all()

        radar_items: List[LifeEventItem] = []
        seen_keys = set()

        # --- A. Scan Documents for Expiry and Renewals ---
        for doc in documents:
            doc_fields = fields_by_doc.get(doc.id, {})
            # Look for expiry date in Document model or extracted fields
            expiry_d = doc.expiry_date
            if not expiry_d:
                for k in ["expiry_date", "valid_until", "due_date", "policy_expiry", "valid_thru", "receipt_date", "fee_payment_date", "bill_date", "reference_date", "date"]:
                    if k in doc_fields and doc_fields[k]:
                        parsed = cls._parse_date_string(doc_fields[k])
                        if parsed:
                            expiry_d = parsed
                            break
            if not expiry_d:
                for k, v in doc_fields.items():
                    if "date" in k or "expiry" in k or "valid" in k or "due" in k:
                        parsed = cls._parse_date_string(v)
                        if parsed:
                            expiry_d = parsed
                            break

            # If document has an expiry or future deadline
            if expiry_d:
                days_left = (expiry_d - today).days
                # We show upcoming events and up to 30 days overdue
                if days_left >= -30:
                    amount_val = 0.0
                    for k in ["amount_due", "amount", "premium_amount", "sum_insured", "annual_premium", "fee_amount", "total_fee", "approx_price"]:
                        if k in doc_fields and doc_fields[k]:
                            try:
                                clean_num = re.sub(r"[^\d.]", "", str(doc_fields[k]))
                                if clean_num:
                                    amount_val = float(clean_num)
                                    break
                            except Exception:
                                pass
                    if amount_val == 0.0:
                        # Fallback heuristic based on document classification
                        cat_lower = (doc.category.value if doc.category else "") or (doc.document_type or "")
                        if "education" in cat_lower or "fee" in (doc.title or "").lower():
                            amount_val = 38500.0
                        elif "insurance" in cat_lower or "policy" in (doc.title or "").lower():
                            amount_val = 14500.0

                    doc_type_lower = (doc.document_type or "").lower()
                    title_lower = (doc.title or "").lower()

                    # Classify event
                    cat = "household"
                    if any(w in doc_type_lower or w in title_lower for w in ["insurance", "policy", "mediclaim", "lic"]):
                        cat = "insurance"
                        title = f"{doc.title} — Policy Expiry & Renewal"
                        action = f"Insurance renewal expected in {days_left} days. Review coverage & budget ₹{amount_val:,.0f}."
                    elif any(w in doc_type_lower or w in title_lower for w in ["vehicle", "rc", "pollution", "puc", "driving"]):
                        cat = "vehicle"
                        title = f"{doc.title} — Renewal Deadline"
                        action = f"Vehicle obligation requires renewal by {expiry_d.strftime('%d-%b-%Y')}. Schedule inspection & reminder."
                    elif any(w in doc_type_lower or w in title_lower for w in ["school", "college", "tuition", "fee"]):
                        cat = "education"
                        title = f"{doc.title} — Term Fee Deadline"
                        action = f"School/Tuition fee of ₹{amount_val:,.0f} due on {expiry_d.strftime('%d-%b-%Y')}."
                    elif any(w in doc_type_lower or w in title_lower for w in ["electricity", "gas", "water", "broadband", "bill", "utility"]):
                        cat = "utilities"
                        title = f"{doc.title} — Due Date"
                        action = f"Pay bill before {expiry_d.strftime('%d-%b-%Y')} to avoid surcharge or disconnection."
                    else:
                        title = f"{doc.title} Expiry"
                        action = f"Document validity expires on {expiry_d.strftime('%d-%b-%Y')}. Verify renewal requirements."

                    time_horizon = (
                        "urgent" if days_left <= 7
                        else "this_month" if days_left <= 30
                        else "upcoming" if days_left <= 90
                        else "future"
                    )

                    has_active_ob = doc.id in ob_by_source_doc

                    item = LifeEventItem(
                        id=f"doc_{doc.id}",
                        title=title,
                        event_type="document_expiry",
                        category=cat,
                        target_date=expiry_d.isoformat(),
                        days_remaining=days_left,
                        time_horizon=time_horizon,
                        estimated_amount=amount_val if amount_val > 0 else None,
                        source_document_id=doc.id,
                        source_document_title=doc.title,
                        assigned_member_id=doc.target_member_id,
                        has_active_obligation=has_active_ob,
                        suggested_action=action,
                        is_overdue=days_left < 0,
                    )
                    radar_items.append(item)
                    seen_keys.add(f"doc_{doc.id}")

        # --- B. Scan Household Obligations ---
        for ob in obligations:
            # Skip if already represented by document
            if ob.source_document_id and f"doc_{ob.source_document_id}" in seen_keys:
                continue

            days_left = (ob.due_date - today).days
            time_horizon = (
                "urgent" if days_left <= 7
                else "this_month" if days_left <= 30
                else "upcoming" if days_left <= 90
                else "future"
            )

            member_name = None
            if ob.assigned_member:
                member_name = ob.assigned_member.display_name or (
                    ob.assigned_member.user.full_name if ob.assigned_member.user else None
                )

            item = LifeEventItem(
                id=f"ob_{ob.id}",
                title=f"{ob.title} Due",
                event_type="obligation_due",
                category=ob.category or "utilities",
                target_date=ob.due_date.isoformat(),
                days_remaining=days_left,
                time_horizon=time_horizon,
                estimated_amount=ob.amount,
                source_document_id=ob.source_document_id,
                assigned_member_id=ob.assigned_member_id,
                assigned_member_name=member_name,
                has_active_obligation=True,
                suggested_action=f"Payment of ₹{ob.amount:,.0f} due on {ob.due_date.strftime('%d-%b-%Y')}. Assigned to {member_name or 'Household'}.",
                is_overdue=days_left < 0,
            )
            radar_items.append(item)

        # --- C. Scan Medicines for Refill Warnings ---
        for profile in profiles:
            for med in profile.medicines:
                if med.is_active and med.current_stock is not None and med.current_stock <= 7:
                    refill_days = max(1, med.current_stock)
                    refill_date = today + timedelta(days=refill_days)
                    item = LifeEventItem(
                        id=f"med_{med.id}",
                        title=f"{med.name} Refill Needed",
                        event_type="medicine_refill",
                        category="health",
                        target_date=refill_date.isoformat(),
                        days_remaining=refill_days,
                        time_horizon="urgent" if refill_days <= 7 else "this_month",
                        estimated_amount=med.approx_price if med.approx_price > 0 else 450.0,
                        has_active_obligation=False,
                        suggested_action=f"Only {med.current_stock} doses remaining. Order refill from pharmacy before stockout.",
                        is_overdue=False,
                    )
                    radar_items.append(item)

        # Sort all items chronologically
        radar_items.sort(key=lambda x: (x.days_remaining, x.title))

        # --- D. Group into Time Horizon Buckets ---
        buckets_map = {
            "urgent": {
                "horizon_key": "urgent",
                "horizon_label": "⚡ Next 7 Days (Critical Needs)",
                "events": [],
                "total_outflow": 0.0,
            },
            "this_month": {
                "horizon_key": "this_month",
                "horizon_label": "📅 This Month (Immediate Focus)",
                "events": [],
                "total_outflow": 0.0,
            },
            "upcoming": {
                "horizon_key": "upcoming",
                "horizon_label": "🔮 Next 3 Months (Quarterly Horizon)",
                "events": [],
                "total_outflow": 0.0,
            },
            "future": {
                "horizon_key": "future",
                "horizon_label": "🧭 Extended Household Radar (>90 Days)",
                "events": [],
                "total_outflow": 0.0,
            },
        }

        total_90_days = 0.0
        month_outflows: Dict[str, float] = {}

        for it in radar_items:
            h = it.time_horizon
            if h in buckets_map:
                buckets_map[h]["events"].append(it)
                if it.estimated_amount:
                    buckets_map[h]["total_outflow"] += it.estimated_amount
                    if it.days_remaining <= 90:
                        total_90_days += it.estimated_amount

                    # Tally month outflow
                    try:
                        m_str = datetime.strptime(it.target_date, "%Y-%m-%d").strftime("%B %Y")
                        month_outflows[m_str] = month_outflows.get(m_str, 0.0) + it.estimated_amount
                    except Exception:
                        pass

        timeline = [
            LifeEventTimelineBucket(**b) for b in buckets_map.values() if len(b["events"]) > 0
        ]

        # Identify Peak Outflow Month
        peak_month = "Upcoming Quarter"
        if month_outflows:
            peak_month = max(month_outflows.items(), key=lambda x: x[1])[0]

        # Generate Predictive Alerts
        predictive_alerts = []
        for it in radar_items:
            if it.category == "insurance" and it.days_remaining <= 60:
                predictive_alerts.append(
                    f"🛡️ {it.title}: Due in {it.days_remaining} days. Expected outlay: ₹{it.estimated_amount or 15000:,.0f}."
                )
            elif it.category == "vehicle" and it.days_remaining <= 45:
                predictive_alerts.append(
                    f"🚗 {it.title}: Requires mandatory renewal by {it.target_date}."
                )
            elif it.category == "education" and it.days_remaining <= 30:
                predictive_alerts.append(
                    f"🎓 {it.title}: School term fee payment due in {it.days_remaining} days."
                )
            elif it.is_overdue:
                predictive_alerts.append(
                    f"🔴 Overdue Notice: {it.title} is past due by {abs(it.days_remaining)} days."
                )

        if not predictive_alerts:
            predictive_alerts.append("🟢 All upcoming household life-events and policy expiries are on track.")

        # AI Radar Summary
        urgent_count = len(buckets_map["urgent"]["events"])
        radar_summary = (
            f"SAHAY Radar is tracking {len(radar_items)} household life events across your documents and family obligations. "
            f"Over the next 90 days, expected financial commitments total ₹{total_90_days:,.0f}. "
            f"Peak outflow is anticipated in {peak_month}."
        )

        return HouseholdRadarResponse(
            total_upcoming_events=len(radar_items),
            next_90_days_outflow=round(total_90_days, 2),
            peak_outflow_month=peak_month,
            radar_summary=radar_summary,
            predictive_alerts=predictive_alerts[:4],
            timeline=timeline,
        )
