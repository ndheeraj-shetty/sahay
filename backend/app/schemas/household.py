from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.auth import MemberRole, InvitationStatus


class HouseholdCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    currency: Optional[str] = "INR"
    timezone: Optional[str] = "Asia/Kolkata"
    address: Optional[str] = None


class HouseholdUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    currency: Optional[str] = None
    timezone: Optional[str] = None
    address: Optional[str] = None


class MemberResponse(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    role: MemberRole
    relationship: Optional[str] = None
    display_name: Optional[str] = None
    is_primary: bool
    is_active: bool
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MemberUpdate(BaseModel):
    role: Optional[MemberRole] = None
    relationship: Optional[str] = None
    display_name: Optional[str] = None
    is_active: Optional[bool] = None


class HouseholdDetail(BaseModel):
    id: str
    name: str
    currency: str
    timezone: str
    address: Optional[str] = None
    created_at: datetime
    my_role: Optional[MemberRole] = None
    members: List[MemberResponse] = []

    model_config = ConfigDict(from_attributes=True)


class InviteCreate(BaseModel):
    invitee_email: EmailStr
    invitee_name: Optional[str] = Field(None, max_length=100)
    role: MemberRole = MemberRole.ADULT
    relationship: Optional[str] = Field(
        None, max_length=50, description="e.g., Father, Mother, Brother, Spouse, Helper"
    )


class InviteResponse(BaseModel):
    id: str
    household_id: str
    invitee_email: str
    invitee_name: Optional[str] = None
    role: MemberRole
    relationship: Optional[str] = None
    invite_code: str
    status: InvitationStatus
    expires_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AcceptInviteRequest(BaseModel):
    invite_code: str
