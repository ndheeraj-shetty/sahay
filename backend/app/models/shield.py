import enum
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship as orm_relationship
from app.db.base import Base, TimestampMixin


class AuditStatus(str, enum.Enum):
    SUCCESS = "success"
    DENIED = "denied"
    FAILED = "failed"


class SecuritySeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ConsentType(str, enum.Enum):
    OCR_PROCESSING = "ocr_processing"
    AI_RETRIEVAL = "ai_retrieval"
    EMERGENCY_SHARING = "emergency_sharing"
    HEALTH_PROCESSING = "health_processing"
    SMS_BILL_READING = "sms_bill_reading"
    DATA_SHARING = "data_sharing"


class DataRequestType(str, enum.Enum):
    EXPORT = "export"
    DELETION = "deletion"


class DataRequestStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    REJECTED = "rejected"


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    household_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    module: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # vault, health, daily, etc.
    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    status: Mapped[AuditStatus] = mapped_column(
        SQLEnum(AuditStatus, native_enum=False),
        default=AuditStatus.SUCCESS,
        nullable=False,
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    details_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    household: Mapped["Household"] = orm_relationship("Household")
    user: Mapped["User"] = orm_relationship("User")


class ConsentRecord(Base, TimestampMixin):
    __tablename__ = "consent_records"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    household_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    consent_type: Mapped[ConsentType] = mapped_column(
        SQLEnum(ConsentType, native_enum=False), nullable=False, index=True
    )
    purpose_description: Mapped[str] = mapped_column(String(255), nullable=False)
    is_granted: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    withdrawn_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Relationships
    household: Mapped["Household"] = orm_relationship("Household")
    user: Mapped["User"] = orm_relationship("User")


class SecurityEvent(Base, TimestampMixin):
    __tablename__ = "security_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    household_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    severity: Mapped[SecuritySeverity] = mapped_column(
        SQLEnum(SecuritySeverity, native_enum=False), default=SecuritySeverity.LOW, nullable=False
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    household: Mapped["Household"] = orm_relationship("Household")
    user: Mapped[Optional["User"]] = orm_relationship("User")


class DataRequest(Base, TimestampMixin):
    __tablename__ = "data_requests"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    household_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    request_type: Mapped[DataRequestType] = mapped_column(
        SQLEnum(DataRequestType, native_enum=False), nullable=False, index=True
    )
    status: Mapped[DataRequestStatus] = mapped_column(
        SQLEnum(DataRequestStatus, native_enum=False), default=DataRequestStatus.PENDING, nullable=False
    )
    download_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    summary_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    household: Mapped["Household"] = orm_relationship("Household")
    user: Mapped["User"] = orm_relationship("User")
