from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.doctor import JobStatus


class ExtractedFieldResponse(BaseModel):
    id: str
    job_id: str
    document_id: str
    field_name: str
    field_value: Optional[str] = None
    confidence: float
    source_evidence: Optional[str] = None
    is_masked: bool = False
    user_confirmed_value: Optional[str] = None
    is_verified_by_user: bool = False

    model_config = ConfigDict(from_attributes=True)


class DocumentDoctorJobResponse(BaseModel):
    id: str
    document_id: str
    household_id: str
    status: JobStatus
    document_classification: Optional[str] = None
    confidence_score: float
    error_message: Optional[str] = None
    extracted_fields: List[ExtractedFieldResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FieldVerificationItem(BaseModel):
    field_name: str
    confirmed_value: Optional[str] = None


class VerifyDocumentRequest(BaseModel):
    confirmed_fields: List[FieldVerificationItem]
    confirm_as_obligation: bool = True  # If true, prepared for Phase 4 obligation creation


class FinancialEventRequest(BaseModel):
    sms_or_alert_text: str = Field(..., min_length=5, max_length=1000)


class FinancialEventResponse(BaseModel):
    event_type: str
    amount: float
    account_reference: Optional[str] = None
    raw_text: str
    detected_at: str
    suggest_recurring: bool
