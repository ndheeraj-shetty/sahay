import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, or_, select
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
    ObligationEvent,
    ObligationPriority,
    ObligationStatus,
    ObligationType,
    RecurrenceFrequency,
    Reminder,
)
from app.schemas.daily import (
    CalendarItem,
    CalendarViewResponse,
    CategoryBreakdownItem,
    MarkPaidRequest,
    MoneyViewResponse,
    ObligationCreate,
    ObligationResponse,
    ObligationUpdate,
    SnoozeRequest,
    TodayViewResponse,
    UpdateMoneyProfileRequest,
    HouseholdRadarResponse,
    FamilyResponsibilityIntelligenceResponse,
    TransferObligationRequest,
)
from app.services.radar_service import HouseholdRadarEngine
from app.services.responsibility_service import FamilyResponsibilityEngine

router = APIRouter()


def calculate_days_until_due(due_date: date) -> int:
    today = date.today()
    return (due_date - today).days


def serialize_obligation(ob: Obligation) -> ObligationResponse:
    days = calculate_days_until_due(ob.due_date)
    # Dynamic status update if overdue
    cur_status = ob.status
    if cur_status == ObligationStatus.PENDING and days < 0:
        cur_status = ObligationStatus.OVERDUE
    elif cur_status == ObligationStatus.PENDING and days == 0:
        cur_status = ObligationStatus.DUE_TODAY

    assigned_name = None
    if ob.assigned_member:
        assigned_name = ob.assigned_member.display_name or (
            ob.assigned_member.user.full_name if ob.assigned_member.user else None
        )

    return ObligationResponse(
        id=ob.id,
        household_id=ob.household_id,
        title=ob.title,
        obligation_type=ob.obligation_type,
        category=ob.category,
        biller_or_payee=ob.biller_or_payee,
        account_or_consumer_no=ob.account_or_consumer_no,
        amount=ob.amount,
        currency=ob.currency,
        due_date=ob.due_date,
        late_payment_date=ob.late_payment_date,
        priority=ob.priority,
        status=cur_status,
        recurrence=ob.recurrence,
        snoozed_until=ob.snoozed_until,
        paid_at=ob.paid_at,
        paid_amount=ob.paid_amount,
        payment_reference=ob.payment_reference,
        assigned_member_id=ob.assigned_member_id,
        assigned_member_name=assigned_name,
        source_document_id=ob.source_document_id,
        notes=ob.notes,
        is_active=ob.is_active,
        created_at=ob.created_at,
        days_until_due=days,
    )


def calculate_next_due_date(current_due: date, recurrence: RecurrenceFrequency) -> Optional[date]:
    if recurrence == RecurrenceFrequency.MONTHLY:
        # Next month roughly
        month = current_due.month + 1
        year = current_due.year
        if month > 12:
            month = 1
            year += 1
        day = min(current_due.day, 28)
        return date(year, month, day)
    elif recurrence == RecurrenceFrequency.QUARTERLY:
        month = current_due.month + 3
        year = current_due.year
        if month > 12:
            month -= 12
            year += 1
        day = min(current_due.day, 28)
        return date(year, month, day)
    elif recurrence == RecurrenceFrequency.YEARLY:
        return date(current_due.year + 1, current_due.month, min(current_due.day, 28))
    return None


@router.post("/obligations", response_model=ObligationResponse, status_code=status.HTTP_201_CREATED)
async def create_obligation(
    data: ObligationCreate,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    days = calculate_days_until_due(data.due_date)
    init_status = ObligationStatus.PENDING
    if days == 0:
        init_status = ObligationStatus.DUE_TODAY
    elif days < 0:
        init_status = ObligationStatus.OVERDUE

    new_ob = Obligation(
        id=str(uuid.uuid4()),
        household_id=household.id,
        created_by_user_id=current_user.id,
        assigned_member_id=data.assigned_member_id,
        source_document_id=data.source_document_id,
        title=data.title,
        obligation_type=data.obligation_type,
        category=data.category or "utility",
        biller_or_payee=data.biller_or_payee,
        account_or_consumer_no=data.account_or_consumer_no,
        amount=data.amount,
        currency=data.currency or "INR",
        due_date=data.due_date,
        late_payment_date=data.late_payment_date,
        priority=data.priority,
        status=init_status,
        recurrence=data.recurrence,
        notes=data.notes,
        is_active=True,
    )
    db.add(new_ob)
    await db.flush()

    # Record creation event
    event = ObligationEvent(
        id=str(uuid.uuid4()),
        obligation_id=new_ob.id,
        event_type="created",
        amount=new_ob.amount,
        notes="Obligation created",
        recorded_by_user_id=current_user.id,
    )
    db.add(event)

    # Schedule standard reminder (2 days before)
    remind_time = datetime.combine(data.due_date, datetime.min.time(), tzinfo=timezone.utc) - timedelta(days=2)
    reminder = Reminder(
        id=str(uuid.uuid4()),
        obligation_id=new_ob.id,
        household_id=household.id,
        remind_at=remind_time,
        days_before=2,
    )
    db.add(reminder)

    await db.commit()

    # Re-fetch
    res = await db.execute(
        select(Obligation)
        .options(selectinload(Obligation.assigned_member).selectinload(HouseholdMember.user))
        .where(Obligation.id == new_ob.id)
    )
    loaded = res.scalar_one()
    return serialize_obligation(loaded)


@router.get("/obligations", response_model=List[ObligationResponse])
async def list_obligations(
    category: Optional[str] = Query(None),
    obligation_type: Optional[ObligationType] = Query(None),
    status_filter: Optional[ObligationStatus] = Query(None, alias="status"),
    assigned_member_id: Optional[str] = Query(None),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Obligation)
        .options(selectinload(Obligation.assigned_member).selectinload(HouseholdMember.user))
        .where(Obligation.household_id == household.id, Obligation.is_active == True)
    )

    if category:
        query = query.where(Obligation.category == category)
    if obligation_type:
        query = query.where(Obligation.obligation_type == obligation_type)
    if status_filter:
        query = query.where(Obligation.status == status_filter)
    if assigned_member_id:
        query = query.where(Obligation.assigned_member_id == assigned_member_id)

    query = query.order_by(Obligation.due_date.asc())
    result = await db.execute(query)
    obs = result.scalars().all()
    return [serialize_obligation(o) for o in obs]


@router.get("/obligations/{obligation_id}", response_model=ObligationResponse)
async def get_obligation(
    obligation_id: str,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Obligation)
        .options(selectinload(Obligation.assigned_member).selectinload(HouseholdMember.user))
        .where(Obligation.id == obligation_id, Obligation.household_id == household.id)
    )
    ob = result.scalar_one_or_none()
    if not ob:
        raise HTTPException(status_code=404, detail="Obligation not found.")
    return serialize_obligation(ob)


@router.patch("/obligations/{obligation_id}", response_model=ObligationResponse)
async def update_obligation(
    obligation_id: str,
    data: ObligationUpdate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Obligation)
        .options(selectinload(Obligation.assigned_member).selectinload(HouseholdMember.user))
        .where(Obligation.id == obligation_id, Obligation.household_id == household.id)
    )
    ob = result.scalar_one_or_none()
    if not ob:
        raise HTTPException(status_code=404, detail="Obligation not found.")

    if data.title is not None:
        ob.title = data.title
    if data.amount is not None:
        ob.amount = data.amount
    if data.due_date is not None:
        ob.due_date = data.due_date
    if data.late_payment_date is not None:
        ob.late_payment_date = data.late_payment_date
    if data.status is not None:
        ob.status = data.status
    if data.priority is not None:
        ob.priority = data.priority
    if data.recurrence is not None:
        ob.recurrence = data.recurrence
    if data.assigned_member_id is not None:
        ob.assigned_member_id = data.assigned_member_id
    if data.notes is not None:
        ob.notes = data.notes

    db.add(ob)
    await db.commit()
    await db.refresh(ob)
    return serialize_obligation(ob)


@router.delete("/obligations/{obligation_id}", status_code=status.HTTP_200_OK)
async def delete_obligation(
    obligation_id: str,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Obligation).where(Obligation.id == obligation_id, Obligation.household_id == household.id)
    )
    ob = result.scalar_one_or_none()
    if not ob:
        raise HTTPException(status_code=404, detail="Obligation not found.")

    ob.is_active = False
    await db.commit()
    return {"message": "Obligation removed."}


@router.post("/obligations/{obligation_id}/mark-paid", response_model=ObligationResponse)
@router.post("/obligations/{obligation_id}/pay", response_model=ObligationResponse)
async def mark_obligation_paid(
    obligation_id: str,
    data: MarkPaidRequest,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Obligation)
        .options(selectinload(Obligation.assigned_member).selectinload(HouseholdMember.user))
        .where(Obligation.id == obligation_id, Obligation.household_id == household.id)
    )
    ob = result.scalar_one_or_none()
    if not ob:
        raise HTTPException(status_code=404, detail="Obligation not found.")

    paid_amt = data.paid_amount if data.paid_amount is not None else ob.amount
    now = datetime.now(timezone.utc)

    ob.status = ObligationStatus.PAID
    ob.paid_at = now
    ob.paid_amount = paid_amt
    ob.payment_reference = data.payment_reference or "Self-Reported Payment"
    db.add(ob)

    # 1. Log Payment Event
    event = ObligationEvent(
        id=str(uuid.uuid4()),
        obligation_id=ob.id,
        event_type="paid",
        amount=paid_amt,
        payment_method=data.payment_method or "UPI",
        notes=data.notes or f"Paid ₹{paid_amt} via {data.payment_method or 'UPI'}",
        recorded_by_user_id=current_user.id,
        event_date=now,
    )
    db.add(event)

    # 2. Recurring Obligation Intelligence: Auto-Schedule Next Cycle
    next_date = calculate_next_due_date(ob.due_date, ob.recurrence)
    if next_date and ob.recurrence != RecurrenceFrequency.NONE:
        next_ob = Obligation(
            id=str(uuid.uuid4()),
            household_id=household.id,
            created_by_user_id=current_user.id,
            assigned_member_id=ob.assigned_member_id,
            source_document_id=ob.source_document_id,
            title=ob.title,
            obligation_type=ob.obligation_type,
            category=ob.category,
            biller_or_payee=ob.biller_or_payee,
            account_or_consumer_no=ob.account_or_consumer_no,
            amount=ob.amount,
            currency=ob.currency,
            due_date=next_date,
            priority=ob.priority,
            status=ObligationStatus.PENDING,
            recurrence=ob.recurrence,
            is_active=True,
        )
        db.add(next_ob)

    await db.commit()
    await db.refresh(ob)
    return serialize_obligation(ob)


@router.post("/obligations/{obligation_id}/snooze", response_model=ObligationResponse)
async def snooze_obligation(
    obligation_id: str,
    data: SnoozeRequest,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Obligation)
        .options(selectinload(Obligation.assigned_member).selectinload(HouseholdMember.user))
        .where(Obligation.id == obligation_id, Obligation.household_id == household.id)
    )
    ob = result.scalar_one_or_none()
    if not ob:
        raise HTTPException(status_code=404, detail="Obligation not found.")

    snooze_target = data.snooze_until or (date.today() + timedelta(days=data.snooze_days or 3))
    ob.snoozed_until = snooze_target
    ob.status = ObligationStatus.SNOOZED
    db.add(ob)

    event = ObligationEvent(
        id=str(uuid.uuid4()),
        obligation_id=ob.id,
        event_type="snoozed",
        notes=f"Snoozed until {snooze_target}",
        recorded_by_user_id=current_user.id,
    )
    db.add(event)
    await db.commit()
    await db.refresh(ob)
    return serialize_obligation(ob)


# -------------------------------------------------------------
# CORE VIEW A: TODAY DASHBOARD
# -------------------------------------------------------------
@router.get("/today", response_model=TodayViewResponse)
async def get_today_view(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Obligation)
        .options(selectinload(Obligation.assigned_member).selectinload(HouseholdMember.user))
        .where(Obligation.household_id == household.id, Obligation.is_active == True)
        .order_by(Obligation.due_date.asc())
    )
    all_obs = result.scalars().all()

    today = date.today()
    critical: List[ObligationResponse] = []
    due_today: List[ObligationResponse] = []
    due_soon: List[ObligationResponse] = []
    upcoming: List[ObligationResponse] = []
    completed: List[ObligationResponse] = []
    snoozed: List[ObligationResponse] = []

    total_pending = 0.0
    due_today_cnt = 0

    for ob in all_obs:
        serialized = serialize_obligation(ob)
        days = serialized.days_until_due

        if ob.status == ObligationStatus.PAID or ob.status == ObligationStatus.COMPLETED:
            completed.append(serialized)
            continue

        if ob.status == ObligationStatus.SNOOZED:
            # Check if snooze expired
            if ob.snoozed_until and ob.snoozed_until <= today:
                ob.status = ObligationStatus.PENDING
            else:
                snoozed.append(serialized)
                continue

        total_pending += ob.amount

        # Prioritize into buckets
        if days < 0 or (days <= 2 and ob.priority == ObligationPriority.CRITICAL):
            critical.append(serialized)
        elif days == 0:
            due_today.append(serialized)
            due_today_cnt += 1
        elif 1 <= days <= 7:
            due_soon.append(serialized)
        else:
            upcoming.append(serialized)

    return TodayViewResponse(
        critical=critical,
        due_today=due_today,
        due_soon=due_soon,
        upcoming=upcoming,
        completed=completed,
        snoozed=snoozed,
        total_pending_amount=total_pending,
        total_obligations_count=len(all_obs),
        due_today_count=due_today_cnt,
    )


# -------------------------------------------------------------
# CORE VIEW B: CALENDAR VIEW
# -------------------------------------------------------------
@router.get("/calendar", response_model=CalendarViewResponse)
async def get_calendar_view(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    member_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    target_date = date.today()
    target_month = month or target_date.month
    target_year = year or target_date.year

    query = (
        select(Obligation)
        .options(selectinload(Obligation.assigned_member).selectinload(HouseholdMember.user))
        .where(
            Obligation.household_id == household.id,
            Obligation.is_active == True,
            extract("month", Obligation.due_date) == target_month,
            extract("year", Obligation.due_date) == target_year,
        )
    )

    if member_id:
        query = query.where(Obligation.assigned_member_id == member_id)
    if category:
        query = query.where(Obligation.category == category)

    query = query.order_by(Obligation.due_date.asc())
    result = await db.execute(query)
    obs = result.scalars().all()

    items = []
    total_amt = 0.0
    for o in obs:
        total_amt += o.amount
        assigned_name = None
        if o.assigned_member:
            assigned_name = o.assigned_member.display_name or (
                o.assigned_member.user.full_name if o.assigned_member.user else None
            )
        items.append(
            CalendarItem(
                id=o.id,
                title=o.title,
                obligation_type=o.obligation_type,
                category=o.category,
                amount=o.amount,
                due_date=o.due_date,
                status=o.status,
                priority=o.priority,
                assigned_to=assigned_name,
                biller=o.biller_or_payee,
            )
        )

    return CalendarViewResponse(
        month=target_month,
        year=target_year,
        total_count=len(items),
        total_amount=total_amt,
        items=items,
    )


# -------------------------------------------------------------
# CORE VIEW C: MONEY VIEW
# -------------------------------------------------------------
@router.get("/money", response_model=MoneyViewResponse)
async def get_money_view(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    target_date = date.today()
    target_month = month or target_date.month
    target_year = year or target_date.year

    # 1. Fetch Household Money Profile
    prof_res = await db.execute(
        select(HouseholdMoneyProfile).where(HouseholdMoneyProfile.household_id == household.id)
    )
    profile = prof_res.scalar_one_or_none()
    income = profile.expected_monthly_income if profile else 85000.0
    savings = profile.planned_monthly_savings if profile else 15000.0
    rent = profile.rent_expense if (profile and profile.rent_expense is not None) else 18000.0
    groceries = profile.groceries_expense if (profile and profile.groceries_expense is not None) else 12000.0
    utilities = profile.utilities_expense if (profile and profile.utilities_expense is not None) else 5000.0
    other = profile.other_expenses if (profile and profile.other_expenses is not None) else 5000.0
    total_living_expenses = rent + groceries + utilities + other

    # 2. Fetch all obligations for this month
    result = await db.execute(
        select(Obligation)
        .options(selectinload(Obligation.assigned_member).selectinload(HouseholdMember.user))
        .where(
            Obligation.household_id == household.id,
            Obligation.is_active == True,
            extract("month", Obligation.due_date) == target_month,
            extract("year", Obligation.due_date) == target_year,
        )
        .order_by(Obligation.due_date.asc())
    )
    obs = result.scalars().all()

    total_obs = 0.0
    paid_obs = 0.0
    pending_obs = 0.0
    categories_dict: Dict[str, Dict[str, float]] = {}
    upcoming_list: List[ObligationResponse] = []

    for o in obs:
        total_obs += o.amount
        cat = o.category or "other"
        if cat not in categories_dict:
            categories_dict[cat] = {"amount": 0.0, "count": 0}
        categories_dict[cat]["amount"] += o.amount
        categories_dict[cat]["count"] += 1

        if o.status in [ObligationStatus.PAID, ObligationStatus.COMPLETED]:
            paid_obs += (o.paid_amount or o.amount)
        else:
            pending_obs += o.amount
            upcoming_list.append(serialize_obligation(o))

    # Category breakdown
    cat_items = []
    for cat, data in categories_dict.items():
        pct = (data["amount"] / total_obs * 100) if total_obs > 0 else 0.0
        cat_items.append(
            CategoryBreakdownItem(
                category=cat.capitalize(),
                total_amount=data["amount"],
                count=int(data["count"]),
                percentage=round(pct, 1),
            )
        )

    projected_bal = income - (total_obs + savings)
    remaining_bal = income - (total_living_expenses + total_obs + savings)

    warning = None
    if remaining_bal < 0:
        warning = f"Cash-flow Alert: Living expenses (₹{total_living_expenses:,.0f}), scheduled bills (₹{total_obs:,.0f}), and savings (₹{savings:,.0f}) exceed monthly income by ₹{abs(remaining_bal):,.0f}."
    elif projected_bal < 0:
        warning = f"Cash-flow Alert: Planned obligations (₹{total_obs:,.0f}) and savings (₹{savings:,.0f}) exceed monthly income by ₹{abs(projected_bal):,.0f}."

    return MoneyViewResponse(
        expected_income=income,
        total_obligations=total_obs,
        paid_obligations=paid_obs,
        pending_obligations=pending_obs,
        planned_savings=savings,
        projected_balance=projected_bal,
        rent_expense=rent,
        groceries_expense=groceries,
        utilities_expense=utilities,
        other_expenses=other,
        total_living_expenses=total_living_expenses,
        remaining_balance=remaining_bal,
        category_breakdown=cat_items,
        upcoming_payments=upcoming_list,
        cash_flow_warning=warning,
    )


@router.post("/money-profile", status_code=status.HTTP_200_OK)
async def update_money_profile(
    data: UpdateMoneyProfileRequest,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    prof_res = await db.execute(
        select(HouseholdMoneyProfile).where(HouseholdMoneyProfile.household_id == household.id)
    )
    profile = prof_res.scalar_one_or_none()
    if not profile:
        profile = HouseholdMoneyProfile(
            id=str(uuid.uuid4()),
            household_id=household.id,
            expected_monthly_income=data.expected_monthly_income,
            planned_monthly_savings=data.planned_monthly_savings,
            rent_expense=data.rent_expense if data.rent_expense is not None else 18000.0,
            groceries_expense=data.groceries_expense if data.groceries_expense is not None else 12000.0,
            utilities_expense=data.utilities_expense if data.utilities_expense is not None else 5000.0,
            other_expenses=data.other_expenses if data.other_expenses is not None else 5000.0,
            notes=data.notes,
        )
        db.add(profile)
    else:
        profile.expected_monthly_income = data.expected_monthly_income
        profile.planned_monthly_savings = data.planned_monthly_savings
        if data.rent_expense is not None:
            profile.rent_expense = data.rent_expense
        if data.groceries_expense is not None:
            profile.groceries_expense = data.groceries_expense
        if data.utilities_expense is not None:
            profile.utilities_expense = data.utilities_expense
        if data.other_expenses is not None:
            profile.other_expenses = data.other_expenses
        profile.notes = data.notes
        db.add(profile)

    await db.commit()
    return {
        "message": "Household money profile updated.",
        "expected_monthly_income": profile.expected_monthly_income,
        "planned_monthly_savings": profile.planned_monthly_savings,
        "rent_expense": profile.rent_expense,
        "groceries_expense": profile.groceries_expense,
        "utilities_expense": profile.utilities_expense,
        "other_expenses": profile.other_expenses,
        "total_living_expenses": profile.rent_expense + profile.groceries_expense + profile.utilities_expense + profile.other_expenses,
    }


@router.get("/radar", response_model=HouseholdRadarResponse)
async def get_household_radar(
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    """
    Household Life-Event Radar:
    Cross-document predictive timeline connecting upcoming deadlines
    (insurance expiries, vehicle renewals, school fees, utilities) into an actionable household timeline.
    """
    return await HouseholdRadarEngine.build_radar(household.id, db)


@router.post("/radar/create-obligation", response_model=ObligationResponse, status_code=status.HTTP_201_CREATED)
async def create_obligation_from_radar(
    data: ObligationCreate,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates an active Obligation and renewal reminder directly from a Life-Event Radar item.
    """
    new_ob = Obligation(
        id=str(uuid.uuid4()),
        household_id=household.id,
        created_by_user_id=current_user.id,
        assigned_member_id=data.assigned_member_id,
        source_document_id=data.source_document_id,
        title=data.title,
        obligation_type=data.obligation_type,
        category=data.category,
        biller_or_payee=data.biller_or_payee or data.title,
        account_or_consumer_no=data.account_or_consumer_no,
        amount=data.amount,
        currency=data.currency or "INR",
        due_date=data.due_date,
        priority=data.priority,
        status=ObligationStatus.PENDING,
        recurrence=data.recurrence,
        notes=data.notes or "Created from Household Life-Event Radar",
    )
    db.add(new_ob)
    await db.commit()
    await db.refresh(new_ob)

    res = await db.execute(
        select(Obligation)
        .options(selectinload(Obligation.assigned_member))
        .where(Obligation.id == new_ob.id)
    )
    loaded_ob = res.scalar_one()
    return serialize_obligation(loaded_ob)


@router.get("/responsibility-intelligence", response_model=FamilyResponsibilityIntelligenceResponse)
async def get_family_responsibility_intelligence(
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    """
    Family Responsibility Intelligence:
    Maps household obligations to responsible family members,
    detects unassigned obligations and bottlenecks, and suggests intelligent responsibility transfers.
    """
    return await FamilyResponsibilityEngine.analyze_responsibilities(household.id, db)


@router.post("/obligations/{obligation_id}/transfer", response_model=ObligationResponse)
async def transfer_obligation_responsibility(
    obligation_id: str,
    payload: TransferObligationRequest,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    """
    Transfers responsibility of an obligation to another authorized family member with audit tracking.
    """
    try:
        return await FamilyResponsibilityEngine.transfer_responsibility(
            obligation_id=obligation_id,
            target_member_id=payload.target_member_id,
            household_id=household.id,
            current_user_id=current_user.id,
            reason=payload.reason,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
