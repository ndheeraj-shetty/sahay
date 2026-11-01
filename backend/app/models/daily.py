import enum
import uuid
from datetime import date, datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SQLEnum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship as orm_relationship
from app.db.base import Base, TimestampMixin


class ObligationType(str, enum.Enum):
    BILL = "bill"
    EMI = "emi"
    INSURANCE = "insurance"
    SCHOOL_FEE = "school_fee"
    HEALTH_TASK = "health_task"
    GOAL_CONTRIBUTION = "goal_contribution"
    DOCUMENT_RENEWAL = "document_renewal"
    CUSTOM_TASK = "custom_task"


class ObligationPriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ObligationStatus(str, enum.Enum):
    PENDING = "pending"
    DUE_TODAY = "due_today"
    OVERDUE = "overdue"
    PAID = "paid"
    COMPLETED = "completed"
    SNOOZED = "snoozed"


class RecurrenceFrequency(str, enum.Enum):
    NONE = "none"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    HALF_YEARLY = "half_yearly"
    YEARLY = "yearly"


class Obligation(Base, TimestampMixin):
    __tablename__ = "obligations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    household_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    assigned_member_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("household_members.id", ondelete="SET NULL"), nullable=True, index=True
    )
    source_document_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    obligation_type: Mapped[ObligationType] = mapped_column(
        SQLEnum(ObligationType, native_enum=False),
        default=ObligationType.BILL,
        nullable=False,
        index=True,
    )
    category: Mapped[str] = mapped_column(String(50), default="utility", nullable=False)
    biller_or_payee: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    account_or_consumer_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    late_payment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    priority: Mapped[ObligationPriority] = mapped_column(
        SQLEnum(ObligationPriority, native_enum=False),
        default=ObligationPriority.MEDIUM,
        nullable=False,
    )
    status: Mapped[ObligationStatus] = mapped_column(
        SQLEnum(ObligationStatus, native_enum=False),
        default=ObligationStatus.PENDING,
        nullable=False,
        index=True,
    )
    recurrence: Mapped[RecurrenceFrequency] = mapped_column(
        SQLEnum(RecurrenceFrequency, native_enum=False),
        default=RecurrenceFrequency.MONTHLY,
        nullable=False,
    )
    snoozed_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    payment_reference: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    household: Mapped["Household"] = orm_relationship("Household")
    creator: Mapped["User"] = orm_relationship("User")
    assigned_member: Mapped[Optional["HouseholdMember"]] = orm_relationship("HouseholdMember")
    source_document: Mapped[Optional["Document"]] = orm_relationship("Document")
    events: Mapped[List["ObligationEvent"]] = orm_relationship(
        "ObligationEvent", back_populates="obligation", cascade="all, delete-orphan"
    )
    reminders: Mapped[List["Reminder"]] = orm_relationship(
        "Reminder", back_populates="obligation", cascade="all, delete-orphan"
    )


class ObligationEvent(Base, TimestampMixin):
    __tablename__ = "obligation_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    obligation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("obligations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # created, paid, snoozed, renewed
    amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # UPI, AutoPay, NetBanking
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    recorded_by_user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    event_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    obligation: Mapped["Obligation"] = orm_relationship("Obligation", back_populates="events")


class Reminder(Base, TimestampMixin):
    __tablename__ = "reminders"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    obligation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("obligations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    household_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    remind_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    remind_type: Mapped[str] = mapped_column(String(30), default="in_app", nullable=False)
    days_before: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    is_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    obligation: Mapped["Obligation"] = orm_relationship("Obligation", back_populates="reminders")


class HouseholdMoneyProfile(Base, TimestampMixin):
    __tablename__ = "household_money_profiles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    household_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("households.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    expected_monthly_income: Mapped[float] = mapped_column(Float, default=85000.0, nullable=False)
    planned_monthly_savings: Mapped[float] = mapped_column(Float, default=15000.0, nullable=False)
    rent_expense: Mapped[float] = mapped_column(Float, default=18000.0, nullable=False)
    groceries_expense: Mapped[float] = mapped_column(Float, default=12000.0, nullable=False)
    utilities_expense: Mapped[float] = mapped_column(Float, default=5000.0, nullable=False)
    other_expenses: Mapped[float] = mapped_column(Float, default=5000.0, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    household: Mapped["Household"] = orm_relationship("Household")
