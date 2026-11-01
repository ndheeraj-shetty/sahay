import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    get_current_household_membership,
    get_current_user,
)
from app.db.session import get_db
from app.models.ai import (
    ActionStatus,
    ActionType,
    AIActionRequest,
    AIConversation,
    AIMessage,
    AIRetrievalLog,
)
from app.models.auth import HouseholdMember, User
from app.schemas.ai import (
    AIActionResponse,
    AICitation,
    AIConversationListItem,
    AIConversationResponse,
    ChatMessageResponse,
    ChatQueryRequest,
    ConfirmActionRequest,
    ConfirmActionResponse,
)
from app.services.ai_assistant import AIAssistantService

logger = logging.getLogger("sahay.ai_endpoints")

router = APIRouter()


def serialize_action_request(action: Optional[AIActionRequest]) -> Optional[AIActionResponse]:
    if not action:
        return None
    try:
        payload = json.loads(action.action_payload_json) if action.action_payload_json else {}
    except Exception:
        payload = {}

    return AIActionResponse(
        id=action.id,
        action_type=action.action_type,
        confirmation_prompt=action.confirmation_prompt,
        action_payload=payload,
        status=action.status,
    )


def serialize_message(msg: AIMessage, action: Optional[AIActionRequest] = None) -> ChatMessageResponse:
    citations: List[AICitation] = []
    if msg.citations_json:
        try:
            cit_data = json.loads(msg.citations_json)
            citations = [AICitation(**c) for c in cit_data]
        except Exception:
            citations = []

    act = action
    if act is None and "action_request" in msg.__dict__:
        act = msg.__dict__["action_request"]

    return ChatMessageResponse(
        id=msg.id,
        role=msg.role,
        content=msg.content,
        citations=citations,
        suggested_action=serialize_action_request(act),
        created_at=msg.created_at,
    )


@router.post("/chat", response_model=ChatMessageResponse)
async def handle_chat_message(
    payload: ChatQueryRequest,
    current_user: User = Depends(get_current_user),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits a user query to Sahay AI Assistant.
    Retrieves permission-aware household context, generates citations, checks for action proposals,
    and returns assistant message.
    """
    household_id = membership.household_id

    # 1. Resolve or create Conversation
    conversation: Optional[AIConversation] = None
    if payload.conversation_id:
        res = await db.execute(
            select(AIConversation).where(
                AIConversation.id == payload.conversation_id,
                AIConversation.user_id == current_user.id,
            )
        )
        conversation = res.scalar_one_or_none()

    if not conversation:
        title_snippet = payload.query[:40] + ("..." if len(payload.query) > 40 else "")
        conversation = AIConversation(
            household_id=household_id,
            user_id=current_user.id,
            title=title_snippet,
        )
        db.add(conversation)
        await db.flush()

    # 2. Save User Message
    user_msg = AIMessage(
        conversation_id=conversation.id,
        role="user",
        content=payload.query,
    )
    db.add(user_msg)
    await db.flush()

    # Check for direct affirmation to execute pending action (e.g. user says "yes", "sure", "create it")
    q_clean = payload.query.strip().lower().strip(".!?,")
    affirmative_phrases = {
        "yes", "yes please", "sure", "create it", "build it", "do it",
        "yup", "yeah", "ok", "confirm", "proceed", "go ahead",
        "please create it", "create the goal", "build the goal vault",
        "yes build it", "yes create it", "yes please create it"
    }
    is_affirmative = (q_clean in affirmative_phrases) or q_clean.startswith("yes ") or q_clean.startswith("sure ")

    if is_affirmative:
        res_action = await db.execute(
            select(AIActionRequest)
            .join(AIMessage, AIActionRequest.message_id == AIMessage.id)
            .where(
                AIMessage.conversation_id == conversation.id,
                AIActionRequest.status == ActionStatus.PENDING,
            )
            .order_by(desc(AIActionRequest.created_at))
        )
        pending_act = res_action.scalar_one_or_none()

        if not pending_act:
            res_act2 = await db.execute(
                select(AIActionRequest)
                .join(AIMessage, AIActionRequest.message_id == AIMessage.id)
                .join(AIConversation, AIMessage.conversation_id == AIConversation.id)
                .where(
                    AIConversation.household_id == household_id,
                    AIActionRequest.status == ActionStatus.PENDING,
                )
                .order_by(desc(AIActionRequest.created_at))
            )
            pending_act = res_act2.scalar_one_or_none()

        if pending_act:
            pending_act.status = ActionStatus.EXECUTED
            pending_act.resolved_at = datetime.now(timezone.utc)
            exec_res = await AIAssistantService.execute_confirmed_action(
                pending_act, household_id, current_user, db
            )

            if pending_act.action_type == ActionType.CREATE_GOAL:
                target_amt = exec_res.get("target_amount", 100000.0)
                monthly_amt = exec_res.get("monthly_commitment", 5000.0)
                title = exec_res.get("title", "Goal Vault")
                cat = exec_res.get("category", "custom").replace("_", " ").title()
                confirm_text = (
                    f"### 🎉 Lakshya Goal Vault Created Successfully!\n\n"
                    f"I have built your new goal vault in **Lakshya Goal Vaults**:\n\n"
                    f"| Goal Detail | Specification |\n"
                    f"| :--- | :--- |\n"
                    f"| **Goal Title** | **{title}** |\n"
                    f"| **Category** | {cat} |\n"
                    f"| **Target Amount** | **₹{target_amt:,.0f}** |\n"
                    f"| **Monthly Commitment** | **₹{monthly_amt:,.0f} / mo** |\n"
                    f"| **Progression Milestones** | 🟢 25%, 50%, 75%, 100% active |\n\n"
                    f"> 💡 **Automated Rule Active**: A monthly commitment of ₹{monthly_amt:,.0f} has been scheduled for this goal. You can track, adjust, or deposit contributions anytime from the **Lakshya** tab."
                )
            elif pending_act.action_type == ActionType.MARK_PAID:
                confirm_text = f"✅ Marked **{exec_res.get('title', 'obligation')}** as paid in Sahay Daily!"
            elif pending_act.action_type == ActionType.UPDATE_MONEY_PROFILE:
                confirm_text = f"✅ Updated household monthly income to **₹{exec_res.get('expected_monthly_income', 0):,.0f}** and planned savings to **₹{exec_res.get('planned_monthly_savings', 0):,.0f}**!"
            else:
                confirm_text = "✅ Action has been executed successfully."

            assistant_msg = AIMessage(
                conversation_id=conversation.id,
                role="assistant",
                content=confirm_text,
                citations_json="[]",
            )
            db.add(assistant_msg)
            await db.commit()
            await db.refresh(assistant_msg)
            return serialize_message(assistant_msg, action=pending_act)

    # 3. Retrieve permission-aware household context
    context = await AIAssistantService.retrieve_permission_aware_context(
        household_id=household_id,
        current_user=current_user,
        membership=membership,
        query=payload.query,
        db=db,
    )

    # 4. Generate Citations & Action Intent
    citations = AIAssistantService.match_citations(payload.query, context)
    action_intent = AIAssistantService.detect_action_intent(payload.query, context)

    # 5. Log retrieval for audit & transparency
    retrieval_log = AIRetrievalLog(
        household_id=household_id,
        user_id=current_user.id,
        query=payload.query,
        retrieved_doc_ids_json=json.dumps([c.source_id for c in citations if c.source_type == "document"]),
        retrieved_summary=f"Matched {len(citations)} sources",
    )
    db.add(retrieval_log)

    # 6. Generate Assistant Response
    assistant_text = AIAssistantService.generate_grounded_response(
        query=payload.query,
        context=context,
        citations=citations,
        action_proposal=action_intent,
    )

    citations_json = json.dumps([c.model_dump() for c in citations])
    assistant_msg = AIMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=assistant_text,
        citations_json=citations_json,
    )
    db.add(assistant_msg)
    await db.flush()

    # 7. Attach Pending Action Request if detected
    action_req: Optional[AIActionRequest] = None
    if action_intent:
        act_type, act_payload, conf_prompt = action_intent
        action_req = AIActionRequest(
            message_id=assistant_msg.id,
            action_type=act_type,
            action_payload_json=json.dumps(act_payload),
            confirmation_prompt=conf_prompt,
            status=ActionStatus.PENDING,
        )
        db.add(action_req)
        await db.flush()

    await db.commit()
    await db.refresh(assistant_msg)
    if action_req:
        await db.refresh(action_req)

    return serialize_message(assistant_msg, action=action_req)


@router.get("/conversations", response_model=List[AIConversationListItem])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists past AI conversations for the logged-in user."""
    res = await db.execute(
        select(AIConversation)
        .options(selectinload(AIConversation.messages))
        .where(AIConversation.user_id == current_user.id)
        .order_by(desc(AIConversation.updated_at))
    )
    convs = res.scalars().all()

    results = []
    for c in convs:
        count = len(c.messages)
        results.append(
            AIConversationListItem(
                id=c.id,
                title=c.title,
                message_count=count,
                updated_at=c.updated_at,
            )
        )
    return results


@router.get("/conversations/{conversation_id}", response_model=AIConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full conversation trajectory and action states."""
    res = await db.execute(
        select(AIConversation)
        .options(
            selectinload(AIConversation.messages).selectinload(AIMessage.action_request)
        )
        .where(
            AIConversation.id == conversation_id,
            AIConversation.user_id == current_user.id,
        )
    )
    conv = res.scalar_one_or_none()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return AIConversationResponse(
        id=conv.id,
        title=conv.title,
        messages=[serialize_message(m, getattr(m, "action_request", None)) for m in conv.messages],
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deletes an AI conversation."""
    res = await db.execute(
        select(AIConversation).where(
            AIConversation.id == conversation_id,
            AIConversation.user_id == current_user.id,
        )
    )
    conv = res.scalar_one_or_none()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    await db.delete(conv)
    await db.commit()
    return None


@router.post("/actions/confirm", response_model=ConfirmActionResponse)
async def confirm_action(
    payload: ConfirmActionRequest,
    current_user: User = Depends(get_current_user),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Confirms or rejects an AI suggested action.
    If confirmed=True, executes the requested mutation against the database.
    """
    res = await db.execute(
        select(AIActionRequest).where(AIActionRequest.id == payload.action_id)
    )
    action = res.scalar_one_or_none()

    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action request not found",
        )

    if action.status != ActionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Action cannot be confirmed; current status is '{action.status.value}'.",
        )

    household_id = membership.household_id

    if not payload.confirmed:
        action.status = ActionStatus.REJECTED
        await db.commit()
        return ConfirmActionResponse(
            action_id=action.id,
            status=ActionStatus.REJECTED,
            message="Action proposal was rejected and dismissed.",
            result=None,
        )

    # Execute Confirmed Action
    try:
        exec_result = await AIAssistantService.execute_confirmed_action(
            action=action,
            household_id=household_id,
            current_user=current_user,
            db=db,
        )
        action.status = ActionStatus.EXECUTED
        action.executed_at = datetime.now(timezone.utc)
        action.result_summary = json.dumps(exec_result)
        await db.commit()

        return ConfirmActionResponse(
            action_id=action.id,
            status=ActionStatus.EXECUTED,
            message=f"Action '{action.action_type.value}' was successfully confirmed and executed.",
            result=exec_result,
        )
    except Exception as e:
        logger.error(f"Failed to execute action {action.id}: {e}", exc_info=True)
        action.status = ActionStatus.FAILED
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute action: {str(e)}",
        )
