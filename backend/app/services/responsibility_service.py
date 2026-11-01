import logging
import uuid
from datetime import date, timedelta
from typing import Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.auth import HouseholdMember, MemberRole
from app.models.daily import Obligation, ObligationEvent, ObligationStatus
from app.schemas.daily import (
    FamilyResponsibilityIntelligenceResponse,
    MemberWorkload,
    ObligationResponse,
    TransferSuggestion,
)

logger = logging.getLogger("sahay.responsibility")


class FamilyResponsibilityEngine:
    """
    Family Responsibility Intelligence Engine.
    Understands who is responsible for each household obligation,
    identifies workload bottlenecks and unassigned items,
    and suggests intelligent responsibility transfers between authorized family members.
    """

    @classmethod
    def _serialize_ob(cls, ob: Obligation) -> ObligationResponse:
        from app.api.v1.endpoints.sahay_daily import serialize_obligation
        return serialize_obligation(ob)

    @classmethod
    async def analyze_responsibilities(
        cls, household_id: str, db: AsyncSession
    ) -> FamilyResponsibilityIntelligenceResponse:
        today = date.today()

        # 1. Fetch Household Members with user profile
        members_res = await db.execute(
            select(HouseholdMember)
            .options(selectinload(HouseholdMember.user))
            .where(HouseholdMember.household_id == household_id)
        )
        members = members_res.scalars().all()
        member_map = {m.id: m for m in members}

        # 2. Fetch Household Obligations
        ob_res = await db.execute(
            select(Obligation)
            .options(
                selectinload(Obligation.assigned_member).selectinload(HouseholdMember.user)
            )
            .where(Obligation.household_id == household_id)
        )
        obligations = ob_res.scalars().all()

        # 3. Categorize by Member
        workloads: Dict[str, Dict] = {}
        for m in members:
            m_name = m.display_name or (m.user.full_name if m.user else "Family Member")
            workloads[m.id] = {
                "member_id": m.id,
                "member_name": m_name,
                "relationship": m.relationship or m.role.value,
                "role": m.role.value if hasattr(m.role, "value") else str(m.role),
                "total_obligations": 0,
                "pending_obligations": 0,
                "overdue_obligations": 0,
                "completed_obligations": 0,
                "total_managed_amount": 0.0,
                "obligations": [],
            }

        unassigned_list: List[ObligationResponse] = []
        overdue_total = 0

        for ob in obligations:
            is_overdue = ob.status == ObligationStatus.OVERDUE or (
                ob.status == ObligationStatus.PENDING and ob.due_date < today
            )
            if is_overdue:
                overdue_total += 1

            serialized = cls._serialize_ob(ob)

            if ob.assigned_member_id and ob.assigned_member_id in workloads:
                wk = workloads[ob.assigned_member_id]
                wk["total_obligations"] += 1
                wk["total_managed_amount"] += ob.amount or 0.0
                wk["obligations"].append(serialized)

                if ob.status in [ObligationStatus.PAID, ObligationStatus.COMPLETED]:
                    wk["completed_obligations"] += 1
                elif is_overdue:
                    wk["overdue_obligations"] += 1
                else:
                    wk["pending_obligations"] += 1
            else:
                unassigned_list.append(serialized)

        member_workload_items = [MemberWorkload(**w) for w in workloads.values()]

        # 4. Generate Transfer & Delegation Suggestions
        suggestions: List[TransferSuggestion] = []

        # Find available adult/owner members for backup
        eligible_backups = [
            m for m in members
            if m.role in [MemberRole.OWNER, MemberRole.ADULT, "owner", "adult"]
        ]
        if not eligible_backups and members:
            eligible_backups = members

        # Sort eligible backups by lowest active pending load
        eligible_backups_sorted = sorted(
            eligible_backups,
            key=lambda m: workloads.get(m.id, {}).get("pending_obligations", 0),
        )

        # 4A. Suggestions for Unassigned Obligations
        for unassigned in unassigned_list:
            if eligible_backups_sorted:
                # Prefer backup based on category hint
                chosen_backup = eligible_backups_sorted[0]
                if unassigned.category in ["education", "school_fee"] and len(eligible_backups_sorted) > 1:
                    # check for mother or female adult if available
                    for b in eligible_backups_sorted:
                        rel = (b.relationship or "").lower()
                        if "mother" in rel or "mom" in rel or "wife" in rel:
                            chosen_backup = b
                            break
                elif unassigned.category in ["utilities", "electricity", "insurance", "emi"] and len(eligible_backups_sorted) > 1:
                    for b in eligible_backups_sorted:
                        rel = (b.relationship or "").lower()
                        if "father" in rel or "dad" in rel or "husband" in rel:
                            chosen_backup = b
                            break

                chosen_name = chosen_backup.display_name or (
                    chosen_backup.user.full_name if chosen_backup.user else "Responsible Adult"
                )
                u_date = unassigned.due_date if isinstance(unassigned.due_date, date) else date.fromisoformat(str(unassigned.due_date))
                days_left = (u_date - today).days

                suggestions.append(
                    TransferSuggestion(
                        obligation_id=unassigned.id,
                        obligation_title=unassigned.title,
                        amount=unassigned.amount,
                        due_date=str(unassigned.due_date),
                        days_remaining=days_left,
                        current_member_id=None,
                        current_member_name="Unassigned",
                        suggested_member_id=chosen_backup.id,
                        suggested_member_name=f"{chosen_name} ({chosen_backup.relationship or chosen_backup.role.value})",
                        reason=f"Obligation is unassigned and due in {days_left} days. Suggest assigning to {chosen_name} to guarantee payment.",
                        urgency="high" if days_left <= 5 else "medium",
                    )
                )

        # 4B. Suggestions for Overdue or High-Risk Obligations
        for m in members:
            m_wk = workloads.get(m.id, {})
            # If member has overdue obligations and there are other adult members with lighter workload
            if m_wk["overdue_obligations"] > 0 and len(eligible_backups_sorted) > 1:
                # find alternate member with zero or low overdue
                alternate = next((b for b in eligible_backups_sorted if b.id != m.id), None)
                if alternate:
                    alt_name = alternate.display_name or (
                        alternate.user.full_name if alternate.user else "Alternate Adult"
                    )
                    for ob_resp in m_wk["obligations"]:
                        if ob_resp.status in [ObligationStatus.OVERDUE.value, ObligationStatus.DUE_TODAY.value, "overdue", "due_today"]:
                            ob_date = ob_resp.due_date if isinstance(ob_resp.due_date, date) else date.fromisoformat(str(ob_resp.due_date))
                            days_left = (ob_date - today).days
                            suggestions.append(
                                TransferSuggestion(
                                    obligation_id=ob_resp.id,
                                    obligation_title=ob_resp.title,
                                    amount=ob_resp.amount,
                                    due_date=str(ob_resp.due_date),
                                    days_remaining=days_left,
                                    current_member_id=m.id,
                                    current_member_name=m_wk["member_name"],
                                    suggested_member_id=alternate.id,
                                    suggested_member_name=f"{alt_name} ({alternate.relationship or alternate.role.value})",
                                    reason=f"{m_wk['member_name']} has not completed this obligation ({abs(days_left)}d overdue). Suggest transferring to {alt_name} to avoid penalty.",
                                    urgency="high",
                                )
                            )

        # 4C. Check Workload Imbalance
        active_counts = [w.pending_obligations + w.overdue_obligations for w in member_workload_items]
        max_load = max(active_counts) if active_counts else 0
        min_load = min(active_counts) if active_counts else 0
        imbalance = max_load >= 3 and min_load == 0 and len(members) > 1

        # Summary
        if unassigned_list:
            summary = (
                f"Attention Required: {len(unassigned_list)} unassigned obligations detected. "
                f"SAHAY has mapped {len(obligations)} total obligations across {len(members)} family members. "
                f"Review delegation recommendations below to balance the household load."
            )
        elif overdue_total > 0:
            summary = (
                f"{overdue_total} overdue obligations detected. "
                f"SAHAY recommends transferring critical obligations to other available adult members."
            )
        else:
            summary = (
                f"Household obligations are well-distributed across {len(members)} family members. "
                f"All pending responsibilities are currently on track."
            )

        return FamilyResponsibilityIntelligenceResponse(
            total_obligations=len(obligations),
            unassigned_count=len(unassigned_list),
            overdue_count=overdue_total,
            workload_imbalance_detected=imbalance,
            intelligence_summary=summary,
            member_workloads=member_workload_items,
            unassigned_obligations=unassigned_list,
            transfer_suggestions=suggestions[:6],
        )

    @classmethod
    async def transfer_responsibility(
        cls,
        obligation_id: str,
        target_member_id: str,
        household_id: str,
        current_user_id: str,
        reason: Optional[str],
        db: AsyncSession,
    ) -> ObligationResponse:
        ob_res = await db.execute(
            select(Obligation).where(Obligation.id == obligation_id, Obligation.household_id == household_id)
        )
        ob = ob_res.scalar_one_or_none()
        if not ob:
            raise ValueError("Obligation not found in household.")

        target_res = await db.execute(
            select(HouseholdMember)
            .options(selectinload(HouseholdMember.user))
            .where(HouseholdMember.id == target_member_id, HouseholdMember.household_id == household_id)
        )
        target = target_res.scalar_one_or_none()
        if not target:
            raise ValueError("Target household member not found or does not belong to this household.")

        target_name = target.display_name or (target.user.full_name if target.user else "Member")
        prev_member_id = ob.assigned_member_id

        # Update obligation
        ob.assigned_member_id = target_member_id
        if reason:
            ob.notes = f"{ob.notes or ''} [Transferred to {target_name}: {reason}]".strip()

        # Log audit event
        ev = ObligationEvent(
            id=str(uuid.uuid4()),
            obligation_id=ob.id,
            event_type="transferred",
            notes=f"Responsibility transferred to {target_name}. Reason: {reason or 'Family delegation'}",
        )
        db.add(ev)
        await db.commit()

        # Reload with member
        reloaded = await db.execute(
            select(Obligation)
            .options(selectinload(Obligation.assigned_member).selectinload(HouseholdMember.user))
            .where(Obligation.id == ob.id)
        )
        return cls._serialize_ob(reloaded.scalar_one())
