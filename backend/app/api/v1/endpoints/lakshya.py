import uuid
from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    get_current_household,
    get_current_household_membership,
    get_current_user,
)
from app.db.session import get_db
from app.models.auth import Household, HouseholdMember, User
from app.models.daily import (
    HouseholdMoneyProfile,
    Obligation,
    ObligationPriority,
    ObligationStatus,
    ObligationType,
    RecurrenceFrequency,
)
from app.models.lakshya import (
    GoalCategory,
    GoalContribution,
    GoalContributor,
    GoalMilestone,
    GoalPriority,
    GoalStatus,
    GoalVault,
    GoalWithdrawal,
)
from app.schemas.lakshya import (
    ContributionCreate,
    ContributorCreate,
    GoalContributionResponse,
    GoalContributorResponse,
    GoalCreate,
    GoalListItem,
    GoalMilestoneResponse,
    GoalResponse,
    GoalRiskAnalysisResponse,
    GoalUpdate,
    GoalWithdrawalResponse,
    LakshyaOverviewResponse,
    WithdrawalCreate,
    GoalEmergencyReallocationItem,
    EmergencyModeReallocationRequest,
    EmergencyModeReallocationResponse,
    EmergencyModeApplyRequest,
)

router = APIRouter()


# -------------------------------------------------------------
# HELPER: Compute Real-Time Risk & Run-Rate
# -------------------------------------------------------------
def compute_goal_risk(goal: GoalVault) -> GoalRiskAnalysisResponse:
    today = date.today()
    target_amt = float(goal.target_amount)
    curr_amt = float(goal.current_amount)
    rem_amt = max(0.0, target_amt - curr_amt)

    progress_pct = round((curr_amt / target_amt) * 100, 1) if target_amt > 0 else 0.0

    days_rem = (goal.target_date - today).days
    rem_months = max(1, int(days_rem / 30.44)) if days_rem > 0 else 0

    if rem_amt <= 0.0:
        req_monthly = 0.0
    elif rem_months > 0:
        req_monthly = round(rem_amt / rem_months, 2)
    else:
        req_monthly = rem_amt

    committed_monthly = sum(float(c.monthly_commitment_amount) for c in goal.contributors)
    monthly_shortfall = round(req_monthly - committed_monthly, 2)

    # Determine risk level
    if curr_amt >= target_amt:
        risk_level = GoalStatus.COMPLETED
    elif days_rem < 0:
        risk_level = GoalStatus.BEHIND
    elif committed_monthly >= req_monthly:
        risk_level = GoalStatus.ON_TRACK
    elif committed_monthly >= req_monthly * 0.7:
        risk_level = GoalStatus.AT_RISK
    else:
        risk_level = GoalStatus.BEHIND

    # Calculate projected completion date based on committed run rate
    projected_date = None
    if committed_monthly > 0 and rem_amt > 0:
        months_needed = int(rem_amt / committed_monthly) + 1
        future_year = today.year + (today.month + months_needed - 1) // 12
        future_month = (today.month + months_needed - 1) % 12 + 1
        try:
            projected_date = date(future_year, future_month, min(today.day, 28))
        except Exception:
            projected_date = None

    recs: List[str] = []
    if risk_level == GoalStatus.COMPLETED:
        recs.append("Goal fully reached! Funds are ready for disbursement or reallocation.")
    elif risk_level == GoalStatus.ON_TRACK:
        recs.append(f"On track! Committed ₹{committed_monthly:,.0f}/mo will achieve the target on time.")
    elif monthly_shortfall > 0:
        recs.append(
            f"Increase monthly family contribution by ₹{monthly_shortfall:,.0f} to reach target by {goal.target_date.strftime('%B %Y')}."
        )
        if committed_monthly > 0:
            extra_m = max(1, int(rem_amt / committed_monthly) - rem_months)
            recs.append(f"Or extend the target date by ~{extra_m} months at your current savings pace.")

    return GoalRiskAnalysisResponse(
        progress_percentage=min(progress_pct, 100.0),
        target_amount=target_amt,
        current_amount=curr_amt,
        remaining_amount=rem_amt,
        remaining_months=rem_months,
        required_monthly_savings=req_monthly,
        committed_monthly_savings=committed_monthly,
        monthly_shortfall=monthly_shortfall,
        risk_level=risk_level,
        projected_completion_date=projected_date,
        recommendations=recs,
    )


def serialize_goal(goal: GoalVault) -> GoalResponse:
    risk = compute_goal_risk(goal)
    beneficiary_name = None
    if goal.target_member:
        beneficiary_name = goal.target_member.display_name or (
            goal.target_member.user.full_name if goal.target_member.user else None
        )

    contributors_data = []
    for c in goal.contributors:
        c_name = c.member.display_name or (c.member.user.full_name if c.member and c.member.user else None)
        c_role = c.member.role.value if c.member and c.member.role else None
        contributors_data.append(
            GoalContributorResponse(
                id=c.id,
                goal_id=c.goal_id,
                member_id=c.member_id,
                member_name=c_name,
                member_role=c_role,
                monthly_commitment_amount=c.monthly_commitment_amount,
                target_share_percentage=c.target_share_percentage,
                notes=c.notes,
                created_at=c.created_at,
            )
        )

    contributions_data = []
    for cb in goal.contributions:
        cb_name = None
        if cb.contributor:
            cb_name = cb.contributor.display_name or (cb.contributor.user.full_name if cb.contributor.user else None)
        contributions_data.append(
            GoalContributionResponse(
                id=cb.id,
                goal_id=cb.goal_id,
                contributor_member_id=cb.contributor_member_id,
                contributor_name=cb_name,
                recorded_by_user_id=cb.recorded_by_user_id,
                amount=cb.amount,
                contribution_date=cb.contribution_date,
                payment_method=cb.payment_method,
                transaction_reference=cb.transaction_reference,
                notes=cb.notes,
                created_at=cb.created_at,
            )
        )

    withdrawals_data = []
    for w in goal.withdrawals:
        w_name = w.authorized_by.full_name if w.authorized_by else None
        withdrawals_data.append(
            GoalWithdrawalResponse(
                id=w.id,
                goal_id=w.goal_id,
                amount=w.amount,
                withdrawal_date=w.withdrawal_date,
                reason=w.reason,
                authorized_by_user_id=w.authorized_by_user_id,
                authorized_by_name=w_name,
                notes=w.notes,
                created_at=w.created_at,
            )
        )

    milestones_data = [
        GoalMilestoneResponse.model_validate(m) for m in sorted(goal.milestones, key=lambda x: x.target_percentage)
    ]

    return GoalResponse(
        id=goal.id,
        household_id=goal.household_id,
        created_by_user_id=goal.created_by_user_id,
        target_member_id=goal.target_member_id,
        target_member_name=beneficiary_name,
        title=goal.title,
        description=goal.description,
        category=goal.category,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        progress_percentage=risk.progress_percentage,
        currency=goal.currency,
        start_date=goal.start_date,
        target_date=goal.target_date,
        priority=goal.priority,
        status=risk.risk_level if goal.status not in [GoalStatus.PAUSED, GoalStatus.CANCELLED] else goal.status,
        is_locked=goal.is_locked,
        completed_at=goal.completed_at,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        contributors=contributors_data,
        contributions=contributions_data,
        withdrawals=withdrawals_data,
        milestones=milestones_data,
        risk_analysis=risk,
    )


# -------------------------------------------------------------
# 1. OVERVIEW & LIST GOAL VAULTS
# -------------------------------------------------------------
@router.get("/overview", response_model=LakshyaOverviewResponse)
async def get_lakshya_overview(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(GoalVault)
        .options(selectinload(GoalVault.contributors))
        .where(GoalVault.household_id == household.id)
    )
    goals = res.scalars().all()

    total_target = sum(g.target_amount for g in goals)
    total_saved = sum(g.current_amount for g in goals)
    overall_progress = round((total_saved / total_target) * 100, 1) if total_target > 0 else 0.0

    active_cnt = 0
    completed_cnt = 0
    at_risk_cnt = 0
    total_committed = 0.0

    for g in goals:
        risk = compute_goal_risk(g)
        if risk.risk_level == GoalStatus.COMPLETED:
            completed_cnt += 1
        elif risk.risk_level in [GoalStatus.AT_RISK, GoalStatus.BEHIND]:
            at_risk_cnt += 1
            active_cnt += 1
        else:
            active_cnt += 1
        total_committed += sum(c.monthly_commitment_amount for c in g.contributors)

    return LakshyaOverviewResponse(
        total_goals_count=len(goals),
        active_goals_count=active_cnt,
        completed_goals_count=completed_cnt,
        at_risk_goals_count=at_risk_cnt,
        total_target_amount=total_target,
        total_saved_amount=total_saved,
        overall_progress_percentage=min(overall_progress, 100.0),
        total_monthly_committed=total_committed,
    )


@router.get("/goals", response_model=List[GoalListItem])
async def list_goals(
    category: Optional[GoalCategory] = Query(None),
    status_filter: Optional[GoalStatus] = Query(None),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(GoalVault)
        .options(
            selectinload(GoalVault.contributors).selectinload(GoalContributor.member).selectinload(HouseholdMember.user),
            selectinload(GoalVault.target_member).selectinload(HouseholdMember.user),
        )
        .where(GoalVault.household_id == household.id)
    )
    if category:
        query = query.where(GoalVault.category == category)
    query = query.order_by(GoalVault.target_date.asc())

    res = await db.execute(query)
    goals = res.scalars().all()

    items: List[GoalListItem] = []
    for g in goals:
        risk = compute_goal_risk(g)
        computed_status = risk.risk_level if g.status not in [GoalStatus.PAUSED, GoalStatus.CANCELLED] else g.status
        if status_filter and computed_status != status_filter:
            continue

        beneficiary = None
        if g.target_member:
            beneficiary = g.target_member.display_name or (
                g.target_member.user.full_name if g.target_member.user else None
            )

        items.append(
            GoalListItem(
                id=g.id,
                title=g.title,
                category=g.category,
                target_amount=g.target_amount,
                current_amount=g.current_amount,
                progress_percentage=risk.progress_percentage,
                currency=g.currency,
                start_date=g.start_date,
                target_date=g.target_date,
                priority=g.priority,
                status=computed_status,
                contributors_count=len(g.contributors),
                target_member_name=beneficiary,
                required_monthly_savings=risk.required_monthly_savings,
                remaining_months=risk.remaining_months,
            )
        )
    return items


# -------------------------------------------------------------
# 2. CREATE, GET, UPDATE, DELETE GOAL VAULT
# -------------------------------------------------------------
@router.post("/goals", response_model=GoalResponse, status_code=201)
async def create_goal(
    data: GoalCreate,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    goal_id = str(uuid.uuid4())
    goal = GoalVault(
        id=goal_id,
        household_id=household.id,
        created_by_user_id=current_user.id,
        target_member_id=data.target_member_id,
        title=data.title,
        description=data.description,
        category=data.category,
        target_amount=data.target_amount,
        current_amount=0.0,
        currency="INR",
        start_date=date.today(),
        target_date=data.target_date,
        priority=data.priority,
        status=GoalStatus.ACTIVE,
    )
    db.add(goal)

    # Auto-generate 4 standard progression milestones (25%, 50%, 75%, 100%)
    for pct, name in [
        (25.0, "Quarter Milestone (25%)"),
        (50.0, "Halfway Mark (50%)"),
        (75.0, "Home Stretch (75%)"),
        (100.0, "Goal Fulfilled (100%)"),
    ]:
        m = GoalMilestone(
            id=str(uuid.uuid4()),
            goal_id=goal_id,
            milestone_name=name,
            target_percentage=pct,
            target_amount=round(data.target_amount * (pct / 100.0), 2),
            is_reached=False,
        )
        db.add(m)

    # Add initial contributors if provided
    for init_c in data.initial_contributors:
        contrib = GoalContributor(
            id=str(uuid.uuid4()),
            goal_id=goal_id,
            member_id=init_c.member_id,
            monthly_commitment_amount=init_c.monthly_commitment_amount,
            target_share_percentage=init_c.target_share_percentage,
            notes=init_c.notes,
        )
        db.add(contrib)

    await db.commit()

    # Re-fetch with eager loaded relationships
    res = await db.execute(
        select(GoalVault)
        .options(
            selectinload(GoalVault.contributors).selectinload(GoalContributor.member).selectinload(HouseholdMember.user),
            selectinload(GoalVault.contributions).selectinload(GoalContribution.contributor).selectinload(HouseholdMember.user),
            selectinload(GoalVault.withdrawals).selectinload(GoalWithdrawal.authorized_by),
            selectinload(GoalVault.milestones),
            selectinload(GoalVault.target_member).selectinload(HouseholdMember.user),
        )
        .where(GoalVault.id == goal_id)
    )
    created_goal = res.scalar_one()
    return serialize_goal(created_goal)


@router.get("/goals/{goal_id}", response_model=GoalResponse)
async def get_goal_detail(
    goal_id: str,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(GoalVault)
        .options(
            selectinload(GoalVault.contributors).selectinload(GoalContributor.member).selectinload(HouseholdMember.user),
            selectinload(GoalVault.contributions).selectinload(GoalContribution.contributor).selectinload(HouseholdMember.user),
            selectinload(GoalVault.withdrawals).selectinload(GoalWithdrawal.authorized_by),
            selectinload(GoalVault.milestones),
            selectinload(GoalVault.target_member).selectinload(HouseholdMember.user),
        )
        .where(GoalVault.id == goal_id, GoalVault.household_id == household.id)
    )
    goal = res.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal vault not found.")
    return serialize_goal(goal)


@router.patch("/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    data: GoalUpdate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(GoalVault)
        .options(
            selectinload(GoalVault.contributors).selectinload(GoalContributor.member).selectinload(HouseholdMember.user),
            selectinload(GoalVault.contributions).selectinload(GoalContribution.contributor).selectinload(HouseholdMember.user),
            selectinload(GoalVault.withdrawals).selectinload(GoalWithdrawal.authorized_by),
            selectinload(GoalVault.milestones),
            selectinload(GoalVault.target_member).selectinload(HouseholdMember.user),
        )
        .where(GoalVault.id == goal_id, GoalVault.household_id == household.id)
    )
    goal = res.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal vault not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(goal, field, val)

    # If target amount updated, recalculate milestone target amounts
    if data.target_amount:
        for m in goal.milestones:
            m.target_amount = round(data.target_amount * (m.target_percentage / 100.0), 2)
            db.add(m)

    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return serialize_goal(goal)


@router.delete("/goals/{goal_id}", status_code=200)
async def delete_goal(
    goal_id: str,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(GoalVault).where(GoalVault.id == goal_id, GoalVault.household_id == household.id)
    )
    goal = res.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal vault not found.")
    await db.delete(goal)
    await db.commit()
    return {"message": "Goal vault deleted successfully."}


# -------------------------------------------------------------
# 3. CONTRIBUTORS MANAGEMENT
# -------------------------------------------------------------
@router.post("/goals/{goal_id}/contributors", response_model=GoalContributorResponse, status_code=201)
async def add_goal_contributor(
    goal_id: str,
    data: ContributorCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    goal_res = await db.execute(
        select(GoalVault).where(GoalVault.id == goal_id, GoalVault.household_id == household.id)
    )
    goal = goal_res.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal vault not found.")

    # Check member belongs to household
    mem_res = await db.execute(
        select(HouseholdMember)
        .options(selectinload(HouseholdMember.user))
        .where(HouseholdMember.id == data.member_id, HouseholdMember.household_id == household.id)
    )
    member = mem_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Household member not found.")

    contrib = GoalContributor(
        id=str(uuid.uuid4()),
        goal_id=goal.id,
        member_id=member.id,
        monthly_commitment_amount=data.monthly_commitment_amount,
        target_share_percentage=data.target_share_percentage,
        notes=data.notes,
    )
    db.add(contrib)
    await db.commit()
    await db.refresh(contrib)

    c_name = member.display_name or (member.user.full_name if member.user else None)
    return GoalContributorResponse(
        id=contrib.id,
        goal_id=contrib.goal_id,
        member_id=contrib.member_id,
        member_name=c_name,
        member_role=member.role.value if member.role else None,
        monthly_commitment_amount=contrib.monthly_commitment_amount,
        target_share_percentage=contrib.target_share_percentage,
        notes=contrib.notes,
        created_at=contrib.created_at,
    )


@router.delete("/contributors/{contributor_id}", status_code=200)
async def remove_goal_contributor(
    contributor_id: str,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(GoalContributor)
        .join(GoalVault, GoalContributor.goal_id == GoalVault.id)
        .where(GoalContributor.id == contributor_id, GoalVault.household_id == household.id)
    )
    contrib = res.scalar_one_or_none()
    if not contrib:
        raise HTTPException(status_code=404, detail="Contributor not found.")
    await db.delete(contrib)
    await db.commit()
    return {"message": "Contributor removed."}


# -------------------------------------------------------------
# 4. CONTRIBUTIONS & MILESTONES PROGRESSION
# -------------------------------------------------------------
@router.post("/goals/{goal_id}/contributions", response_model=GoalContributionResponse, status_code=201)
async def record_contribution(
    goal_id: str,
    data: ContributionCreate,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(GoalVault)
        .options(
            selectinload(GoalVault.contributions),
            selectinload(GoalVault.withdrawals),
            selectinload(GoalVault.milestones),
        )
        .where(GoalVault.id == goal_id, GoalVault.household_id == household.id)
    )
    goal = res.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal vault not found.")

    cb = GoalContribution(
        id=str(uuid.uuid4()),
        goal_id=goal.id,
        contributor_member_id=data.contributor_member_id,
        recorded_by_user_id=current_user.id,
        amount=data.amount,
        contribution_date=data.contribution_date or date.today(),
        payment_method=data.payment_method,
        transaction_reference=data.transaction_reference,
        notes=data.notes,
    )
    db.add(cb)

    # Update goal's accumulated current_amount
    new_total = goal.current_amount + data.amount
    goal.current_amount = round(new_total, 2)

    # Check and trigger milestones
    now = datetime.now(timezone.utc)
    for m in goal.milestones:
        if not m.is_reached and goal.current_amount >= m.target_amount:
            m.is_reached = True
            m.reached_at = now
            db.add(m)

    if goal.current_amount >= goal.target_amount:
        goal.status = GoalStatus.COMPLETED
        goal.completed_at = now

    db.add(goal)
    await db.commit()
    await db.refresh(cb)

    return GoalContributionResponse(
        id=cb.id,
        goal_id=cb.goal_id,
        contributor_member_id=cb.contributor_member_id,
        recorded_by_user_id=cb.recorded_by_user_id,
        amount=cb.amount,
        contribution_date=cb.contribution_date,
        payment_method=cb.payment_method,
        transaction_reference=cb.transaction_reference,
        notes=cb.notes,
        created_at=cb.created_at,
    )


# -------------------------------------------------------------
# 5. WITHDRAWALS / DISBURSEMENTS
# -------------------------------------------------------------
@router.post("/goals/{goal_id}/withdrawals", response_model=GoalWithdrawalResponse, status_code=201)
async def record_withdrawal(
    goal_id: str,
    data: WithdrawalCreate,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(GoalVault).where(GoalVault.id == goal_id, GoalVault.household_id == household.id)
    )
    goal = res.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal vault not found.")

    if data.amount > goal.current_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Withdrawal amount ₹{data.amount:,.2f} exceeds accumulated savings ₹{goal.current_amount:,.2f}",
        )

    w = GoalWithdrawal(
        id=str(uuid.uuid4()),
        goal_id=goal.id,
        authorized_by_user_id=current_user.id,
        amount=data.amount,
        withdrawal_date=data.withdrawal_date or date.today(),
        reason=data.reason,
        notes=data.notes,
    )
    db.add(w)

    goal.current_amount = round(goal.current_amount - data.amount, 2)
    db.add(goal)
    await db.commit()
    await db.refresh(w)

    return GoalWithdrawalResponse(
        id=w.id,
        goal_id=w.goal_id,
        amount=w.amount,
        withdrawal_date=w.withdrawal_date,
        reason=w.reason,
        authorized_by_user_id=w.authorized_by_user_id,
        authorized_by_name=current_user.full_name,
        notes=w.notes,
        created_at=w.created_at,
    )


# -------------------------------------------------------------
# 6. RISK ANALYSIS ENDPOINT
# -------------------------------------------------------------
@router.get("/goals/{goal_id}/risk", response_model=GoalRiskAnalysisResponse)
async def get_goal_risk_endpoint(
    goal_id: str,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(GoalVault)
        .options(selectinload(GoalVault.contributors))
        .where(GoalVault.id == goal_id, GoalVault.household_id == household.id)
    )
    goal = res.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal vault not found.")
    return compute_goal_risk(goal)


# -------------------------------------------------------------
# 7. EMERGENCY MODE: CRISIS LIQUIDITY & GOAL REALLOCATION
# -------------------------------------------------------------
@router.post("/emergency-mode/reallocate", response_model=EmergencyModeReallocationResponse)
async def plan_emergency_mode_reallocation(
    data: EmergencyModeReallocationRequest,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    urgent_amt = float(data.urgent_amount)

    # 1. Fetch Household Money Profile for liquid monthly cash
    res_mp = await db.execute(
        select(HouseholdMoneyProfile).where(HouseholdMoneyProfile.household_id == household.id)
    )
    mp = res_mp.scalar_one_or_none()

    inc = mp.expected_monthly_income if mp else 85000.0
    rent = mp.rent_expense if (mp and mp.rent_expense is not None) else 18000.0
    groc = mp.groceries_expense if (mp and mp.groceries_expense is not None) else 12000.0
    util = mp.utilities_expense if (mp and mp.utilities_expense is not None) else 5000.0
    oth = mp.other_expenses if (mp and mp.other_expenses is not None) else 5000.0
    living = rent + groc + util + oth

    res_ob = await db.execute(
        select(Obligation).where(
            Obligation.household_id == household.id,
            Obligation.status.in_([ObligationStatus.PENDING, ObligationStatus.DUE_TODAY]),
        )
    )
    obs = res_ob.scalars().all()
    pending_bills = sum(float(o.amount) for o in obs)

    available_liquid = max(0.0, round(inc - (living + pending_bills), 2))
    deficit = max(0.0, round(urgent_amt - available_liquid, 2))

    # 2. Fetch all active goals with saved money
    res_goals = await db.execute(
        select(GoalVault)
        .options(selectinload(GoalVault.contributors))
        .where(
            GoalVault.household_id == household.id,
            GoalVault.status.in_([GoalStatus.ACTIVE, GoalStatus.ON_TRACK, GoalStatus.BEHIND, GoalStatus.AT_RISK]),
        )
    )
    goals = res_goals.scalars().all()

    def goal_liquidation_tier(category: GoalCategory) -> int:
        c = category.value
        if c in ["travel_vacation", "vehicle_purchase", "home_renovation", "custom"]:
            return 1
        elif c in ["home_down_payment", "wedding", "retirement"]:
            return 2
        else:
            return 3

    sorted_goals = sorted(goals, key=lambda g: (goal_liquidation_tier(g.category), -g.current_amount))

    reallocations: List[GoalEmergencyReallocationItem] = []
    remaining_deficit = deficit
    total_mobilized = 0.0

    narrative_parts = []
    restoration_steps = []

    for g in sorted_goals:
        curr_saved = float(g.current_amount)
        if curr_saved <= 0.0 or remaining_deficit <= 0.0:
            continue

        tier = goal_liquidation_tier(g.category)
        tier_label = "Discretionary (Safe to withdraw)" if tier == 1 else ("Secondary Goal" if tier == 2 else "Essential Goal")

        take_amount = min(curr_saved, remaining_deficit)
        take_amount = round(take_amount, 2)
        rem_saved = round(curr_saved - take_amount, 2)

        restore_months = 12 if take_amount > 50000 else 6
        restore_monthly = round(take_amount / restore_months, 2)

        reallocations.append(
            GoalEmergencyReallocationItem(
                goal_id=g.id,
                goal_title=g.title,
                category=g.category.value,
                current_saved=curr_saved,
                recommended_withdrawal=take_amount,
                remaining_saved=rem_saved,
                priority_level=tier_label,
                restoration_monthly=restore_monthly,
                restoration_months=restore_months,
            )
        )

        narrative_parts.append(
            f"You have saved ₹{curr_saved:,.0f} for '{g.title}' right? Take ₹{take_amount:,.0f} from it."
        )
        restoration_steps.append(
            f"Restore '{g.title}': deposit ₹{restore_monthly:,.0f}/month for {restore_months} months once cash flow stabilizes."
        )

        total_mobilized += take_amount
        remaining_deficit = round(remaining_deficit - take_amount, 2)

    shortfall = max(0.0, remaining_deficit)

    if narrative_parts:
        advice_narrative = (
            f"Emergency Mode Activated: You urgently require ₹{urgent_amt:,.0f}. "
            + " ".join(narrative_parts)
            + f" This mobilizes ₹{total_mobilized:,.0f} from your existing goals to handle the crisis without costly high-interest borrowing. "
            + "Once you get the money or the emergency passes, keep the money back following your restoration schedule."
        )
    else:
        advice_narrative = (
            f"Emergency Mode Activated: You urgently require ₹{urgent_amt:,.0f}. "
            f"Your current liquid surplus is ₹{available_liquid:,.0f}. "
            "You do not currently have sufficient savings in your goals to reallocate. "
            "Consider utilizing emergency insurance claims or family support."
        )

    return EmergencyModeReallocationResponse(
        urgent_amount=urgent_amt,
        available_liquid_cash=available_liquid,
        deficit=deficit,
        total_mobilized_from_goals=total_mobilized,
        shortfall_remaining=shortfall,
        reallocations=reallocations,
        advice_narrative=advice_narrative,
        restoration_plan=restoration_steps,
    )


@router.post("/emergency-mode/apply")
async def apply_emergency_mode_reallocation(
    data: EmergencyModeApplyRequest,
    household: Household = Depends(get_current_household),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    applied = []
    for item in data.withdrawals:
        gid = item.get("goal_id")
        amt = float(item.get("amount", 0.0))
        if not gid or amt <= 0.0:
            continue
        res = await db.execute(
            select(GoalVault).where(GoalVault.id == gid, GoalVault.household_id == household.id)
        )
        goal = res.scalar_one_or_none()
        if not goal:
            continue

        w = GoalWithdrawal(
            id=str(uuid.uuid4()),
            goal_id=goal.id,
            authorized_by_user_id=current_user.id,
            amount=amt,
            withdrawal_date=date.today(),
            reason=f"Emergency Mode: {data.reason}",
            notes=f"Auto-withdrawn via SAHAY Crisis Liquidity Mode for {data.reason}",
        )
        db.add(w)
        goal.current_amount = max(0.0, round(goal.current_amount - amt, 2))
        db.add(goal)
        applied.append({"goal_id": goal.id, "title": goal.title, "amount": amt})

    await db.commit()
    return {"message": "Emergency reallocation applied successfully", "applied_withdrawals": applied}
