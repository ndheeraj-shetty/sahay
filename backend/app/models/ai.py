import enum
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Boolean,
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


class ActionType(str, enum.Enum):
    CREATE_GOAL = "create_goal"
    CREATE_OBLIGATION = "create_obligation"
    MARK_PAID = "mark_paid"
    ADD_GOAL_CONTRIBUTION = "add_goal_contribution"
    ADD_ALLERGY = "add_allergy"
    ADD_MEDICINE = "add_medicine"
    UPDATE_MONEY_PROFILE = "update_money_profile"
    CUSTOM = "custom"


class ActionStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    EXECUTED = "executed"
    FAILED = "failed"


class AIConversation(Base, TimestampMixin):
    __tablename__ = "ai_conversations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    household_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), default="New Household Conversation", nullable=False)

    # Relationships
    household: Mapped["Household"] = orm_relationship("Household")
    user: Mapped["User"] = orm_relationship("User")
    messages: Mapped[List["AIMessage"]] = orm_relationship(
        "AIMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="AIMessage.created_at"
    )


class AIMessage(Base, TimestampMixin):
    __tablename__ = "ai_messages"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    conversation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON serialized citations

    # Relationships
    conversation: Mapped["AIConversation"] = orm_relationship("AIConversation", back_populates="messages")
    action_request: Mapped[Optional["AIActionRequest"]] = orm_relationship(
        "AIActionRequest", back_populates="message", uselist=False, cascade="all, delete-orphan"
    )


class AIActionRequest(Base, TimestampMixin):
    __tablename__ = "ai_action_requests"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    message_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ai_messages.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    action_type: Mapped[ActionType] = mapped_column(
        SQLEnum(ActionType, native_enum=False),
        default=ActionType.CUSTOM,
        nullable=False,
    )
    action_payload_json: Mapped[str] = mapped_column(Text, nullable=False)  # JSON serialized parameters
    confirmation_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ActionStatus] = mapped_column(
        SQLEnum(ActionStatus, native_enum=False),
        default=ActionStatus.PENDING,
        nullable=False,
        index=True,
    )
    executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    result_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    message: Mapped["AIMessage"] = orm_relationship("AIMessage", back_populates="action_request")


class AIRetrievalLog(Base, TimestampMixin):
    __tablename__ = "ai_retrieval_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    household_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    query: Mapped[str] = mapped_column(Text, nullable=False)
    retrieved_doc_ids_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retrieved_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
