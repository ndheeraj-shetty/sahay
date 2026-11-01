import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.shield import (
    AuditStatus,
    ConsentType,
    DataRequestStatus,
    DataRequestType,
    SecuritySeverity,
)


class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    action: str
    module: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    status: AuditStatus
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details_json: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConsentCreate(BaseModel):
    consent_type: ConsentType
    purpose_description: str = Field(..., min_length=5, max_length=255)


class ConsentResponse(BaseModel):
    id: str
    user_id: str
    consent_type: ConsentType
    purpose_description: str
    is_granted: bool
    granted_at: datetime
    withdrawn_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SecurityEventResponse(BaseModel):
    id: str
    event_type: str
    severity: SecuritySeverity
    description: str
    metadata_json: Optional[str] = None
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SecuritySessionResponse(BaseModel):
    id: str
    device_info: Optional[str] = "Web Browser"
    ip_address: Optional[str] = None
    last_seen_at: datetime
    is_current: bool = False
    is_revoked: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DataExportRequest(BaseModel):
    include_documents: bool = True
    include_health: bool = True
    include_daily: bool = True
    include_goals: bool = True


class DataExportResponse(BaseModel):
    request_id: str
    status: DataRequestStatus
    download_url: Optional[str] = None
    summary: Dict[str, Any] = {}
    created_at: datetime


class DataDeletionRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=500)
    confirm_password: str = Field(..., min_length=6)


class DataDeletionResponse(BaseModel):
    request_id: str
    status: DataRequestStatus
    message: str
    created_at: datetime


class SecurityActivityOverview(BaseModel):
    total_audit_events_count: int
    active_consents_count: int
    active_sessions_count: int
    unresolved_security_events_count: int
    encryption_standard: str = "AES-256-GCM Envelope Encryption"
    recent_activities: List[AuditLogResponse] = []
    recent_events: List[SecurityEventResponse] = []
