from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.vault import DocumentCategory, DocumentAccessLevel, AccessRequestStatus


class DocumentResponse(BaseModel):
    id: str
    household_id: str
    owner_user_id: str
    owner_name: Optional[str] = None
    target_member_id: Optional[str] = None
    target_member_name: Optional[str] = None
    title: str
    category: DocumentCategory
    document_type: str
    file_name: str
    file_size: int
    mime_type: str
    file_hash: str
    access_level: DocumentAccessLevel
    is_verified: bool
    is_encrypted: bool = True
    encryption_algorithm: str = "AES-256-GCM"
    expiry_date: Optional[date] = None
    tags: Optional[str] = None
    issuer: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    can_access: bool = True

    model_config = ConfigDict(from_attributes=True)


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    category: Optional[DocumentCategory] = None
    document_type: Optional[str] = None
    expiry_date: Optional[date] = None
    tags: Optional[str] = None
    issuer: Optional[str] = None
    target_member_id: Optional[str] = None
    access_level: Optional[DocumentAccessLevel] = None


class AccessRequestCreate(BaseModel):
    reason: Optional[str] = Field(None, max_length=255)


class AccessRequestResponse(BaseModel):
    id: str
    document_id: str
    document_title: Optional[str] = None
    requester_user_id: str
    requester_name: Optional[str] = None
    reason: Optional[str] = None
    status: AccessRequestStatus
    created_at: datetime
    responded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
