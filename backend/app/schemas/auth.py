from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Minimum 6 characters")
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    household_name: Optional[str] = Field(
        None, max_length=150, description="Optional custom name for user's primary household"
    )
    invite_code: Optional[str] = Field(None, max_length=50, description="Invite code from household owner for family members")
    is_owner: Optional[bool] = Field(True, description="True if owner registering new household, False if family member")


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    device_info: Optional[str] = "Web Browser"


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class UserProfile(BaseModel):
    id: str
    email: str
    phone: Optional[str] = None
    full_name: str
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class SessionResponse(BaseModel):
    id: str
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    expires_at: datetime
    is_revoked: bool
    is_current: bool = False
    last_seen_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Forward reference for TokenResponse
class HouseholdBasic(BaseModel):
    id: str
    name: str
    role: str
    is_primary: bool

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserProfile
    primary_household: Optional[HouseholdBasic] = None
    households: List[HouseholdBasic] = []


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str = Field(..., min_length=4)
    new_password: str = Field(..., min_length=6)
