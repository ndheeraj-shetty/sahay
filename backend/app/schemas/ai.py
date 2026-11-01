import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.ai import ActionStatus, ActionType


class ChatQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=2000)
    conversation_id: Optional[str] = None


class AICitation(BaseModel):
    source_type: str  # document, obligation, health, goal, money_profile
    source_id: str
    title: str
    snippet: str
    file_name: Optional[str] = None
    page_number: Optional[int] = 1
    evidence: Optional[str] = None
    confidence_score: Optional[float] = 0.95
    verified_by_user: bool = False


class AIActionResponse(BaseModel):
    id: str
    action_type: ActionType
    confirmation_prompt: str
    action_payload: Dict[str, Any] = {}
    status: ActionStatus


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    citations: List[AICitation] = []
    suggested_action: Optional[AIActionResponse] = None
    created_at: datetime


class AIConversationResponse(BaseModel):
    id: str
    title: str
    messages: List[ChatMessageResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AIConversationListItem(BaseModel):
    id: str
    title: str
    message_count: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConfirmActionRequest(BaseModel):
    action_id: str
    confirmed: bool = True


class ConfirmActionResponse(BaseModel):
    action_id: str
    status: ActionStatus
    message: str
    result: Optional[Dict[str, Any]] = None
