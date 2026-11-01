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


class BloodGroup(str, enum.Enum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"
    UNKNOWN = "Unknown"


class AllergySeverity(str, enum.Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    LIFE_THREATENING = "life_threatening"


class ConditionStatus(str, enum.Enum):
    ACTIVE = "active"
    MANAGED = "managed"
    IN_REMISSION = "in_remission"
    RESOLVED = "resolved"


class MedicineFrequency(str, enum.Enum):
    ONCE_DAILY = "once_daily"
    TWICE_DAILY = "twice_daily"
    THRICE_DAILY = "thrice_daily"
    FOUR_TIMES_DAILY = "four_times_daily"
    AS_NEEDED = "as_needed"
    WEEKLY = "weekly"


class MedicineTiming(str, enum.Enum):
    BEFORE_FOOD = "before_food"
    AFTER_FOOD = "after_food"
    WITH_FOOD = "with_food"
    EMPTY_STOMACH = "empty_stomach"
    BEDTIME = "bedtime"
    ANYTIME = "anytime"


class ReportType(str, enum.Enum):
    LAB_TEST = "lab_test"
    PRESCRIPTION = "prescription"
    RADIOLOGY = "radiology"
    DISCHARGE_SUMMARY = "discharge_summary"
    VACCINATION = "vaccination"
    OTHER = "other"


class HealthProfile(Base, TimestampMixin):
    __tablename__ = "health_profiles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    household_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    member_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("household_members.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    blood_group: Mapped[BloodGroup] = mapped_column(
        SQLEnum(BloodGroup, native_enum=False),
        default=BloodGroup.UNKNOWN,
        nullable=False,
    )
    height_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    preferred_hospital: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    preferred_doctor: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    doctor_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    insurance_provider: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    insurance_policy_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    organ_donor: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    household: Mapped["Household"] = orm_relationship("Household")
    member: Mapped["HouseholdMember"] = orm_relationship("HouseholdMember")
    conditions: Mapped[List["MedicalCondition"]] = orm_relationship(
        "MedicalCondition", back_populates="health_profile", cascade="all, delete-orphan"
    )
    allergies: Mapped[List["Allergy"]] = orm_relationship(
        "Allergy", back_populates="health_profile", cascade="all, delete-orphan"
    )
    medicines: Mapped[List["Medicine"]] = orm_relationship(
        "Medicine", back_populates="health_profile", cascade="all, delete-orphan"
    )
    reports: Mapped[List["HealthReport"]] = orm_relationship(
        "HealthReport", back_populates="health_profile", cascade="all, delete-orphan"
    )
    emergency_contacts: Mapped[List["EmergencyContact"]] = orm_relationship(
        "EmergencyContact", back_populates="health_profile", cascade="all, delete-orphan"
    )
    emergency_shares: Mapped[List["EmergencyShare"]] = orm_relationship(
        "EmergencyShare", back_populates="health_profile", cascade="all, delete-orphan"
    )


class MedicalCondition(Base, TimestampMixin):
    __tablename__ = "medical_conditions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    health_profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("health_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    diagnosed_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[ConditionStatus] = mapped_column(
        SQLEnum(ConditionStatus, native_enum=False),
        default=ConditionStatus.ACTIVE,
        nullable=False,
    )
    is_critical: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    health_profile: Mapped["HealthProfile"] = orm_relationship("HealthProfile", back_populates="conditions")


class Allergy(Base, TimestampMixin):
    __tablename__ = "allergies"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    health_profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("health_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    allergen: Mapped[str] = mapped_column(String(150), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="medication", nullable=False)
    severity: Mapped[AllergySeverity] = mapped_column(
        SQLEnum(AllergySeverity, native_enum=False),
        default=AllergySeverity.MODERATE,
        nullable=False,
    )
    reaction_description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_life_threatening: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    health_profile: Mapped["HealthProfile"] = orm_relationship("HealthProfile", back_populates="allergies")


class Medicine(Base, TimestampMixin):
    __tablename__ = "medicines"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    health_profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("health_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "500 mg", "1 tablet"
    frequency: Mapped[MedicineFrequency] = mapped_column(
        SQLEnum(MedicineFrequency, native_enum=False),
        default=MedicineFrequency.ONCE_DAILY,
        nullable=False,
    )
    timing: Mapped[MedicineTiming] = mapped_column(
        SQLEnum(MedicineTiming, native_enum=False),
        default=MedicineTiming.AFTER_FOOD,
        nullable=False,
    )
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    refill_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    prescribed_by_doctor: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    approx_price: Mapped[Optional[float]] = mapped_column(Float, default=0.0, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_document_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )

    health_profile: Mapped["HealthProfile"] = orm_relationship("HealthProfile", back_populates="medicines")
    source_document: Mapped[Optional["Document"]] = orm_relationship("Document")


class HealthReport(Base, TimestampMixin):
    __tablename__ = "health_reports"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    health_profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("health_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    report_type: Mapped[ReportType] = mapped_column(
        SQLEnum(ReportType, native_enum=False),
        default=ReportType.LAB_TEST,
        nullable=False,
    )
    test_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    lab_or_hospital_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    summary_findings: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_abnormal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source_document_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )

    health_profile: Mapped["HealthProfile"] = orm_relationship("HealthProfile", back_populates="reports")
    source_document: Mapped[Optional["Document"]] = orm_relationship("Document")


class EmergencyContact(Base, TimestampMixin):
    __tablename__ = "emergency_contacts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    health_profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("health_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    relationship: Mapped[str] = mapped_column(String(50), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(30), nullable=False)
    alternate_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    health_profile: Mapped["HealthProfile"] = orm_relationship("HealthProfile", back_populates="emergency_contacts")


class EmergencyShare(Base, TimestampMixin):
    __tablename__ = "emergency_shares"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    health_profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("health_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    share_token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    access_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_accessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    health_profile: Mapped["HealthProfile"] = orm_relationship("HealthProfile", back_populates="emergency_shares")
