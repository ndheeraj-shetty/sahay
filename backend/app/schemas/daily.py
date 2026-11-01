from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.daily import (
    ObligationPriority,
    ObligationStatus,
    ObligationType,
    RecurrenceFrequency,
)


class ObligationCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    obligation_type: ObligationType = ObligationType.BILL
    category: str = "utility"
    biller_or_payee: Optional[str] = None
    account_or_consumer_no: Optional[str] = None
    amount: float = Field(..., ge=0.0)
    currency: Optional[str] = "INR"
    due_date: date
    late_payment_date: Optional[date] = None
    priority: ObligationPriority = ObligationPriority.MEDIUM
    recurrence: RecurrenceFrequency = RecurrenceFrequency.MONTHLY
    assigned_member_id: Optional[str] = None
    source_document_id: Optional[str] = None
    notes: Optional[str] = None


class ObligationUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[date] = None
    late_payment_date: Optional[date] = None
    status: Optional[ObligationStatus] = None
    priority: Optional[ObligationPriority] = None
    recurrence: Optional[RecurrenceFrequency] = None
    assigned_member_id: Optional[str] = None
    notes: Optional[str] = None


class ObligationResponse(BaseModel):
    id: str
    household_id: str
    title: str
    obligation_type: ObligationType
    category: str
    biller_or_payee: Optional[str] = None
    account_or_consumer_no: Optional[str] = None
    amount: float
    currency: str
    due_date: date
    late_payment_date: Optional[date] = None
    priority: ObligationPriority
    status: ObligationStatus
    recurrence: RecurrenceFrequency
    snoozed_until: Optional[date] = None
    paid_at: Optional[datetime] = None
    paid_amount: Optional[float] = None
    payment_reference: Optional[str] = None
    assigned_member_id: Optional[str] = None
    assigned_member_name: Optional[str] = None
    source_document_id: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime
    days_until_due: int

    model_config = ConfigDict(from_attributes=True)


class MarkPaidRequest(BaseModel):
    paid_amount: Optional[float] = None
    payment_method: Optional[str] = "UPI"
    payment_reference: Optional[str] = None
    notes: Optional[str] = None


class SnoozeRequest(BaseModel):
    snooze_days: Optional[int] = 3
    snooze_until: Optional[date] = None


class TodayViewResponse(BaseModel):
    critical: List[ObligationResponse] = []
    due_today: List[ObligationResponse] = []
    due_soon: List[ObligationResponse] = []
    upcoming: List[ObligationResponse] = []
    completed: List[ObligationResponse] = []
    snoozed: List[ObligationResponse] = []
    total_pending_amount: float
    total_obligations_count: int
    due_today_count: int


class CalendarItem(BaseModel):
    id: str
    title: str
    obligation_type: ObligationType
    category: str
    amount: float
    due_date: date
    status: ObligationStatus
    priority: ObligationPriority
    assigned_to: Optional[str] = None
    biller: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CalendarViewResponse(BaseModel):
    month: int
    year: int
    total_count: int
    total_amount: float
    items: List[CalendarItem]


class CategoryBreakdownItem(BaseModel):
    category: str
    total_amount: float
    count: int
    percentage: float


class MoneyViewResponse(BaseModel):
    expected_income: float
    total_obligations: float
    paid_obligations: float
    pending_obligations: float
    planned_savings: float
    projected_balance: float
    rent_expense: float = 18000.0
    groceries_expense: float = 12000.0
    utilities_expense: float = 5000.0
    other_expenses: float = 5000.0
    total_living_expenses: float = 40000.0
    remaining_balance: float = 0.0
    category_breakdown: List[CategoryBreakdownItem]
    upcoming_payments: List[ObligationResponse]
    cash_flow_warning: Optional[str] = None


class UpdateMoneyProfileRequest(BaseModel):
    expected_monthly_income: float = Field(..., ge=0.0)
    planned_monthly_savings: float = Field(..., ge=0.0)
    rent_expense: Optional[float] = Field(None, ge=0.0)
    groceries_expense: Optional[float] = Field(None, ge=0.0)
    utilities_expense: Optional[float] = Field(None, ge=0.0)
    other_expenses: Optional[float] = Field(None, ge=0.0)
    notes: Optional[str] = None
