import enum
import uuid
from datetime import date, datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship as orm_relationship
from app.db.base import Base, TimestampMixin


class DocumentCategory(str, enum.Enum):
    IDENTITY = "identity"
    FINANCIAL = "financial"
    HEALTH = "health"
    EDUCATION = "education"
    HOUSEHOLD = "household"
    OTHER = "other"


class DocumentAccessLevel(str, enum.Enum):
    PRIVATE = "private"  # Only the owner / uploader
    SHARED_ADULTS = "shared_adults"  # Adult members and owner in household
    HOUSEHOLD = "household"  # All members of the household


class AccessRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DECLINED = "declined"


class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    household_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_member_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("household_members.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    category: Mapped[DocumentCategory] = mapped_column(
        SQLEnum(DocumentCategory, native_enum=False),
        default=DocumentCategory.OTHER,
        nullable=False,
        index=True,
    )
    document_type: Mapped[str] = mapped_column(String(100), default="general", nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), default="application/pdf", nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # SHA-256
    access_level: Mapped[DocumentAccessLevel] = mapped_column(
        SQLEnum(DocumentAccessLevel, native_enum=False),
        default=DocumentAccessLevel.SHARED_ADULTS,
        nullable=False,
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    encryption_algorithm: Mapped[str] = mapped_column(String(50), default="AES-256-GCM", nullable=False)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    issuer: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # Relationships
    household: Mapped["Household"] = orm_relationship("Household")
    owner_user: Mapped["User"] = orm_relationship("User")
    target_member: Mapped[Optional["HouseholdMember"]] = orm_relationship("HouseholdMember")
    versions: Mapped[List["DocumentVersion"]] = orm_relationship(
        "DocumentVersion", back_populates="document", cascade="all, delete-orphan"
    )
    access_requests: Mapped[List["DocumentRequest"]] = orm_relationship(
        "DocumentRequest", back_populates="document", cascade="all, delete-orphan"
    )
    access_grants: Mapped[List["DocumentAccessGrant"]] = orm_relationship(
        "DocumentAccessGrant", back_populates="document", cascade="all, delete-orphan"
    )


class DocumentVersion(Base, TimestampMixin):
    __tablename__ = "document_versions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    document: Mapped["Document"] = orm_relationship("Document", back_populates="versions")


class DocumentRequest(Base, TimestampMixin):
    __tablename__ = "document_requests"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    requester_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[AccessRequestStatus] = mapped_column(
        SQLEnum(AccessRequestStatus, native_enum=False),
        default=AccessRequestStatus.PENDING,
        nullable=False,
    )
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    document: Mapped["Document"] = orm_relationship("Document", back_populates="access_requests")
    requester: Mapped["User"] = orm_relationship("User")


class DocumentAccessGrant(Base, TimestampMixin):
    __tablename__ = "document_access_grants"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    granted_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    document: Mapped["Document"] = orm_relationship("Document", back_populates="access_grants")
    user: Mapped["User"] = orm_relationship("User", foreign_keys=[user_id])
