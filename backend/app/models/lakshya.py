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


class GoalCategory(str, enum.Enum):
    CHILD_EDUCATION = "child_education"
    HIGHER_EDUCATION = "higher_education"
    EMERGENCY_FUND = "emergency_fund"
    MEDICAL_FUND = "medical_fund"
    HOME_DOWN_PAYMENT = "home_down_payment"
    HOME_RENOVATION = "home_renovation"
    VEHICLE_PURCHASE = "vehicle_purchase"
    TRAVEL_VACATION = "travel_vacation"
    WEDDING = "wedding"
    ELDER_CARE = "elder_care"
    RETIREMENT = "retirement"
    CUSTOM = "custom"


class GoalPriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class GoalStatus(str, enum.Enum):
    ACTIVE = "active"
    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    BEHIND = "behind"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class GoalVault(Base, TimestampMixin):
    __tablename__ = "goal_vaults"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    household_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    target_member_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("household_members.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[GoalCategory] = mapped_column(
        SQLEnum(GoalCategory, native_enum=False),
        default=GoalCategory.CUSTOM,
        nullable=False,
        index=True,
    )
    target_amount: Mapped[float] = mapped_column(Float, nullable=False)
    current_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    start_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    target_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    priority: Mapped[GoalPriority] = mapped_column(
        SQLEnum(GoalPriority, native_enum=False),
        default=GoalPriority.MEDIUM,
        nullable=False,
    )
    status: Mapped[GoalStatus] = mapped_column(
        SQLEnum(GoalStatus, native_enum=False),
        default=GoalStatus.ACTIVE,
        nullable=False,
        index=True,
    )
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    household: Mapped["Household"] = orm_relationship("Household")
    creator: Mapped["User"] = orm_relationship("User")
    target_member: Mapped[Optional["HouseholdMember"]] = orm_relationship("HouseholdMember")
    contributors: Mapped[List["GoalContributor"]] = orm_relationship(
        "GoalContributor", back_populates="goal", cascade="all, delete-orphan"
    )
    contributions: Mapped[List["GoalContribution"]] = orm_relationship(
        "GoalContribution", back_populates="goal", cascade="all, delete-orphan"
    )
    withdrawals: Mapped[List["GoalWithdrawal"]] = orm_relationship(
        "GoalWithdrawal", back_populates="goal", cascade="all, delete-orphan"
    )
    milestones: Mapped[List["GoalMilestone"]] = orm_relationship(
        "GoalMilestone", back_populates="goal", cascade="all, delete-orphan"
    )


class GoalContributor(Base, TimestampMixin):
    __tablename__ = "goal_contributors"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    goal_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("goal_vaults.id", ondelete="CASCADE"), nullable=False, index=True
    )
    member_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("household_members.id", ondelete="CASCADE"), nullable=False, index=True
    )
    monthly_commitment_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    target_share_percentage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    goal: Mapped["GoalVault"] = orm_relationship("GoalVault", back_populates="contributors")
    member: Mapped["HouseholdMember"] = orm_relationship("HouseholdMember")


class GoalContribution(Base, TimestampMixin):
    __tablename__ = "goal_contributions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    goal_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("goal_vaults.id", ondelete="CASCADE"), nullable=False, index=True
    )
    contributor_member_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("household_members.id", ondelete="SET NULL"), nullable=True, index=True
    )
    recorded_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    contribution_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), default="UPI", nullable=False)
    transaction_reference: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    goal: Mapped["GoalVault"] = orm_relationship("GoalVault", back_populates="contributions")
    contributor: Mapped[Optional["HouseholdMember"]] = orm_relationship("HouseholdMember")
    recorded_by: Mapped["User"] = orm_relationship("User")


class GoalWithdrawal(Base, TimestampMixin):
    __tablename__ = "goal_withdrawals"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    goal_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("goal_vaults.id", ondelete="CASCADE"), nullable=False, index=True
    )
    authorized_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    withdrawal_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    goal: Mapped["GoalVault"] = orm_relationship("GoalVault", back_populates="withdrawals")
    authorized_by: Mapped["User"] = orm_relationship("User")


class GoalMilestone(Base, TimestampMixin):
    __tablename__ = "goal_milestones"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    goal_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("goal_vaults.id", ondelete="CASCADE"), nullable=False, index=True
    )
    milestone_name: Mapped[str] = mapped_column(String(100), nullable=False)
    target_percentage: Mapped[float] = mapped_column(Float, nullable=False)  # 25, 50, 75, 100
    target_amount: Mapped[float] = mapped_column(Float, nullable=False)
    reached_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_reached: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    goal: Mapped["GoalVault"] = orm_relationship("GoalVault", back_populates="milestones")
