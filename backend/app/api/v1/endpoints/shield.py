import json
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    get_current_household_membership,
    get_current_user,
    require_household_owner,
)
from app.core.security import verify_password
from app.db.session import get_db
from app.models.auth import HouseholdMember, Session as UserSession, User
from app.models.shield import (
    AuditLog,
    AuditStatus,
    ConsentRecord,
    ConsentType,
    DataRequest,
    DataRequestStatus,
    DataRequestType,
    SecurityEvent,
    SecuritySeverity,
)
from app.schemas.shield import (
    AuditLogResponse,
    ConsentCreate,
    ConsentResponse,
    DataDeletionRequest,
    DataDeletionResponse,
    DataExportRequest,
    DataExportResponse,
    SecurityActivityOverview,
    SecurityEventResponse,
    SecuritySessionResponse,
)
from app.services.shield import ShieldService

logger = logging.getLogger("sahay.security_endpoints")

router = APIRouter()


@router.get("/activity", response_model=SecurityActivityOverview)
async def get_security_activity_overview(
    current_user: User = Depends(get_current_user),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Overview of household security health:
    Total audit entries, active consents, active sessions, and unresolved security events.
    """
    household_id = membership.household_id

    # 1. Fetch recent audit logs
    audit_res = await db.execute(
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .where(AuditLog.household_id == household_id)
        .order_by(desc(AuditLog.created_at))
        .limit(10)
    )
    logs = audit_res.scalars().all()

    # 2. Fetch active consents
    consent_res = await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.household_id == household_id,
            ConsentRecord.is_granted == True,
        )
    )
    active_consents = consent_res.scalars().all()

    # 3. Fetch active sessions for user
    sess_res = await db.execute(
        select(UserSession).where(
            UserSession.user_id == current_user.id,
            UserSession.is_revoked == False,
        )
    )
    active_sessions = sess_res.scalars().all()

    # 4. Fetch unresolved security events
    ev_res = await db.execute(
        select(SecurityEvent).where(
            SecurityEvent.household_id == household_id,
            SecurityEvent.is_resolved == False,
        )
        .order_by(desc(SecurityEvent.created_at))
        .limit(10)
    )
    unresolved_events = ev_res.scalars().all()

    # Format audit response with user names
    recent_logs_fmt: List[AuditLogResponse] = []
    for l in logs:
        recent_logs_fmt.append(
            AuditLogResponse(
                id=l.id,
                user_id=l.user_id,
                user_name=l.user.full_name if l.user else "System",
                action=l.action,
                module=l.module,
                resource_type=l.resource_type,
                resource_id=l.resource_id,
                status=l.status,
                ip_address=l.ip_address,
                user_agent=l.user_agent,
                details_json=l.details_json,
                created_at=l.created_at,
            )
        )

    return SecurityActivityOverview(
        total_audit_events_count=len(logs),
        active_consents_count=len(active_consents),
        active_sessions_count=len(active_sessions),
        unresolved_security_events_count=len(unresolved_events),
        encryption_standard="AES-256-GCM Envelope Encryption",
        recent_activities=recent_logs_fmt,
        recent_events=[SecurityEventResponse.model_validate(e) for e in unresolved_events],
    )


@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    module: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full immutable audit trail for the household."""
    q = (
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .where(AuditLog.household_id == membership.household_id)
    )
    if module:
        q = q.where(AuditLog.module == module)
    if action:
        q = q.where(AuditLog.action == action)

    q = q.order_by(desc(AuditLog.created_at)).limit(limit).offset(offset)
    res = await db.execute(q)
    logs = res.scalars().all()

    return [
        AuditLogResponse(
            id=l.id,
            user_id=l.user_id,
            user_name=l.user.full_name if l.user else "System",
            action=l.action,
            module=l.module,
            resource_type=l.resource_type,
            resource_id=l.resource_id,
            status=l.status,
            ip_address=l.ip_address,
            user_agent=l.user_agent,
            details_json=l.details_json,
            created_at=l.created_at,
        )
        for l in logs
    ]


@router.get("/sessions", response_model=List[SecuritySessionResponse])
async def list_active_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists login sessions and active device tokens for current user."""
    res = await db.execute(
        select(UserSession)
        .where(UserSession.user_id == current_user.id)
        .order_by(desc(UserSession.last_seen_at))
    )
    sessions = res.scalars().all()

    return [
        SecuritySessionResponse(
            id=s.id,
            device_info=s.device_info or "Web Browser",
            ip_address=s.ip_address,
            last_seen_at=s.last_seen_at,
            is_current=False,
            is_revoked=s.is_revoked,
            created_at=s.created_at,
        )
        for s in sessions
    ]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    """Revokes a device session immediately."""
    res = await db.execute(
        select(UserSession).where(
            UserSession.id == session_id,
            UserSession.user_id == current_user.id,
        )
    )
    sess = res.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found.")

    sess.is_revoked = True
    await db.commit()

    await ShieldService.log_audit(
        db=db,
        household_id=membership.household_id,
        user_id=current_user.id,
        action="session.revocation",
        module="security",
        resource_type="session",
        resource_id=sess.id,
        details={"device_info": sess.device_info},
    )
    return None


@router.get("/consents", response_model=List[ConsentResponse])
async def list_consents(
    current_user: User = Depends(get_current_user),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    """Lists purpose-specific data processing consents for the household."""
    res = await db.execute(
        select(ConsentRecord)
        .where(ConsentRecord.household_id == membership.household_id)
        .order_by(desc(ConsentRecord.granted_at))
    )
    return res.scalars().all()


@router.post("/consents", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
async def grant_consent(
    payload: ConsentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    """Records explicit consent for a specific processing purpose."""
    # Check if existing consent of same type is already granted
    res = await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.household_id == membership.household_id,
            ConsentRecord.consent_type == payload.consent_type,
        )
    )
    existing = res.scalar_one_or_none()

    ip = request.client.host if request.client else None
    if existing:
        existing.is_granted = True
        existing.withdrawn_at = None
        existing.granted_at = datetime.now(timezone.utc)
        existing.purpose_description = payload.purpose_description
        await db.commit()
        record = existing
    else:
        record = ConsentRecord(
            id=str(uuid.uuid4()),
            household_id=membership.household_id,
            user_id=current_user.id,
            consent_type=payload.consent_type,
            purpose_description=payload.purpose_description,
            is_granted=True,
            ip_address=ip,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)

    await ShieldService.log_audit(
        db=db,
        household_id=membership.household_id,
        user_id=current_user.id,
        action="consent.granted",
        module="security",
        resource_type="consent",
        resource_id=record.id,
        details={"consent_type": payload.consent_type.value},
    )

    return record


@router.post("/consents/{consent_id}/withdraw", response_model=ConsentResponse)
async def withdraw_consent(
    consent_id: str,
    current_user: User = Depends(get_current_user),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    """Withdraws an active data processing consent."""
    res = await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.id == consent_id,
            ConsentRecord.household_id == membership.household_id,
        )
    )
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Consent record not found.")

    record.is_granted = False
    record.withdrawn_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(record)

    await ShieldService.log_audit(
        db=db,
        household_id=membership.household_id,
        user_id=current_user.id,
        action="consent.withdrawn",
        module="security",
        resource_type="consent",
        resource_id=record.id,
        details={"consent_type": record.consent_type.value},
    )

    return record


@router.post("/export", response_model=DataExportResponse)
async def request_data_export(
    payload: DataExportRequest,
    current_user: User = Depends(get_current_user),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    """Triggers DPDP/GDPR compliant data export for the household."""
    req = await ShieldService.generate_data_export(
        db=db,
        household_id=membership.household_id,
        user_id=current_user.id,
        include_documents=payload.include_documents,
        include_health=payload.include_health,
        include_daily=payload.include_daily,
        include_goals=payload.include_goals,
    )
    summary = json.loads(req.summary_json) if req.summary_json else {}

    return DataExportResponse(
        request_id=req.id,
        status=req.status,
        download_url=req.download_url,
        summary=summary,
        created_at=req.created_at,
    )


@router.post("/deletion-request", response_model=DataDeletionResponse)
async def request_data_deletion(
    payload: DataDeletionRequest,
    current_user: User = Depends(get_current_user),
    membership: HouseholdMember = Depends(require_household_owner),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits a verified data deletion request.
    Restricted strictly to the Household Owner and requires password verification.
    """
    if not verify_password(payload.confirm_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password verification failed. Data deletion cancelled.",
        )

    req = DataRequest(
        id=str(uuid.uuid4()),
        household_id=membership.household_id,
        user_id=current_user.id,
        request_type=DataRequestType.DELETION,
        status=DataRequestStatus.PENDING,
        summary_json=json.dumps({"reason": payload.reason}),
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    await ShieldService.log_audit(
        db=db,
        household_id=membership.household_id,
        user_id=current_user.id,
        action="data.deletion_requested",
        module="security",
        resource_type="data_request",
        resource_id=req.id,
        details={"reason": payload.reason},
    )

    await ShieldService.log_security_event(
        db=db,
        household_id=membership.household_id,
        user_id=current_user.id,
        event_type="deletion_requested",
        severity=SecuritySeverity.HIGH,
        description=f"Household data deletion requested by Owner {current_user.full_name}: '{payload.reason}'",
    )

    return DataDeletionResponse(
        request_id=req.id,
        status=req.status,
        message="Data deletion request has been registered and placed in grace retention period.",
        created_at=req.created_at,
    )


@router.get("/events", response_model=List[SecurityEventResponse])
async def list_security_events(
    current_user: User = Depends(get_current_user),
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    """Lists security events and anomaly monitoring alerts."""
    res = await db.execute(
        select(SecurityEvent)
        .where(SecurityEvent.household_id == membership.household_id)
        .order_by(desc(SecurityEvent.created_at))
    )
    return res.scalars().all()
