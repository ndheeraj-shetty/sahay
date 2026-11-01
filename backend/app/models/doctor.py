import enum
import uuid
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    Enum as SQLEnum,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship as orm_relationship
from app.db.base import Base, TimestampMixin


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentProcessingJob(Base, TimestampMixin):
    __tablename__ = "document_processing_jobs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    household_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[JobStatus] = mapped_column(
        SQLEnum(JobStatus, native_enum=False), default=JobStatus.PENDING, nullable=False
    )
    ocr_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_classification: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    document: Mapped["Document"] = orm_relationship("Document")
    extracted_fields: Mapped[List["ExtractedDocumentField"]] = orm_relationship(
        "ExtractedDocumentField", back_populates="job", cascade="all, delete-orphan"
    )


class ExtractedDocumentField(Base, TimestampMixin):
    __tablename__ = "extracted_document_fields"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("document_processing_jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. amount_due, due_date
    field_value: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    source_evidence: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_masked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    user_confirmed_value: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_verified_by_user: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    job: Mapped["DocumentProcessingJob"] = orm_relationship(
        "DocumentProcessingJob", back_populates="extracted_fields"
    )
