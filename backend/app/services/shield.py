import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import Household, HouseholdMember, User
from app.models.daily import Obligation
from app.models.health import HealthProfile
from app.models.lakshya import GoalVault
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
from app.models.vault import Document

logger = logging.getLogger("sahay.shield")


class ShieldService:
    @staticmethod
    async def log_audit(
        db: AsyncSession,
        household_id: str,
        user_id: str,
        action: str,
        module: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        status: AuditStatus = AuditStatus.SUCCESS,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Records an immutable audit event in Sahay Shield."""
        log_entry = AuditLog(
            id=str(uuid.uuid4()),
            household_id=household_id,
            user_id=user_id,
            action=action,
            module=module,
            resource_type=resource_type,
            resource_id=resource_id,
            status=status,
            ip_address=ip_address,
            user_agent=user_agent,
            details_json=json.dumps(details) if details else None,
        )
        db.add(log_entry)
        try:
            await db.commit()
            await db.refresh(log_entry)
        except Exception as e:
            logger.error(f"Failed to record audit log: {e}")
        return log_entry

    @staticmethod
    async def log_security_event(
        db: AsyncSession,
        household_id: str,
        event_type: str,
        description: str,
        severity: SecuritySeverity = SecuritySeverity.LOW,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SecurityEvent:
        """Records a security anomaly or compliance warning."""
        event = SecurityEvent(
            id=str(uuid.uuid4()),
            household_id=household_id,
            user_id=user_id,
            event_type=event_type,
            severity=severity,
            description=description,
            metadata_json=json.dumps(metadata) if metadata else None,
            is_resolved=False,
        )
        db.add(event)
        try:
            await db.commit()
            await db.refresh(event)
        except Exception as e:
            logger.error(f"Failed to record security event: {e}")
        return event

    @staticmethod
    async def check_consent(
        db: AsyncSession,
        household_id: str,
        consent_type: ConsentType,
    ) -> bool:
        """Checks if a household has an active, non-withdrawn consent for an operation."""
        res = await db.execute(
            select(ConsentRecord).where(
                ConsentRecord.household_id == household_id,
                ConsentRecord.consent_type == consent_type,
                ConsentRecord.is_granted == True,
            )
        )
        return res.scalar_one_or_none() is not None

    @staticmethod
    async def generate_data_export(
        db: AsyncSession,
        household_id: str,
        user_id: str,
        include_documents: bool = True,
        include_health: bool = True,
        include_daily: bool = True,
        include_goals: bool = True,
    ) -> DataRequest:
        """Aggregates household records for compliant data portability (DPDP / GDPR)."""
        summary_counts: Dict[str, Any] = {}

        if include_documents:
            docs = (await db.execute(select(Document).where(Document.household_id == household_id))).scalars().all()
            summary_counts["documents_count"] = len(docs)
            summary_counts["document_titles"] = [d.title for d in docs]

        if include_daily:
            obs = (await db.execute(select(Obligation).where(Obligation.household_id == household_id))).scalars().all()
            summary_counts["obligations_count"] = len(obs)

        if include_health:
            hps = (await db.execute(select(HealthProfile).where(HealthProfile.household_id == household_id))).scalars().all()
            summary_counts["health_profiles_count"] = len(hps)

        if include_goals:
            goals = (await db.execute(select(GoalVault).where(GoalVault.household_id == household_id))).scalars().all()
            summary_counts["goals_count"] = len(goals)

        req = DataRequest(
            id=str(uuid.uuid4()),
            household_id=household_id,
            user_id=user_id,
            request_type=DataRequestType.EXPORT,
            status=DataRequestStatus.COMPLETED,
            completed_at=datetime.now(timezone.utc),
            download_url=f"/api/v1/security/exports/download/{uuid.uuid4().hex[:12]}",
            summary_json=json.dumps(summary_counts),
        )
        db.add(req)
        await db.commit()
        await db.refresh(req)

        await ShieldService.log_audit(
            db=db,
            household_id=household_id,
            user_id=user_id,
            action="data.export_generated",
            module="security",
            resource_type="data_request",
            resource_id=req.id,
            details=summary_counts,
        )

        return req
