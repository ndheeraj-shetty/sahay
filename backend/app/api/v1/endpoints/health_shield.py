import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    get_current_household,
    get_current_household_membership,
    get_current_user,
)
from app.db.session import get_db
from app.models.auth import Household, HouseholdMember, User
from app.models.daily import (
    Obligation,
    ObligationPriority,
    ObligationStatus,
    ObligationType,
    RecurrenceFrequency,
)
from app.models.health import (
    Allergy,
    BloodGroup,
    EmergencyContact,
    EmergencyShare,
    HealthProfile,
    HealthReport,
    MedicalCondition,
    Medicine,
)
from app.schemas.health_shield import (
    AllergyCreate,
    AllergyResponse,
    EmergencyCardResponse,
    EmergencyContactCreate,
    EmergencyContactResponse,
    EmergencyShareCreate,
    EmergencyShareResponse,
    HealthProfileCreate,
    HealthProfileListItem,
    HealthProfileResponse,
    HealthProfileUpdate,
    HealthReportCreate,
    HealthReportResponse,
    MedicalConditionCreate,
    MedicalConditionResponse,
    MedicineCreate,
    MedicineResponse,
    MedicineUpdate,
)

router = APIRouter()


# -------------------------------------------------------------
# HELPER: Ensure Health Profile Exists for Member
# -------------------------------------------------------------
async def get_or_create_health_profile(
    member: HouseholdMember, household_id: str, db: AsyncSession
) -> HealthProfile:
    res = await db.execute(
        select(HealthProfile)
        .options(
            selectinload(HealthProfile.conditions),
            selectinload(HealthProfile.allergies),
            selectinload(HealthProfile.medicines),
            selectinload(HealthProfile.reports),
            selectinload(HealthProfile.emergency_contacts),
            selectinload(HealthProfile.member).selectinload(HouseholdMember.user),
        )
        .where(HealthProfile.member_id == member.id)
    )
    profile = res.scalar_one_or_none()
    if not profile:
        profile = HealthProfile(
            id=str(uuid.uuid4()),
            household_id=household_id,
            member_id=member.id,
            blood_group=BloodGroup.UNKNOWN,
        )
        db.add(profile)
        await db.commit()
        # Re-fetch with eager loading
        res2 = await db.execute(
            select(HealthProfile)
            .options(
                selectinload(HealthProfile.conditions),
                selectinload(HealthProfile.allergies),
                selectinload(HealthProfile.medicines),
                selectinload(HealthProfile.reports),
                selectinload(HealthProfile.emergency_contacts),
                selectinload(HealthProfile.member).selectinload(HouseholdMember.user),
            )
            .where(HealthProfile.id == profile.id)
        )
        profile = res2.scalar_one()
    return profile


def serialize_health_profile(profile: HealthProfile) -> HealthProfileResponse:
    member_name = profile.member.display_name if profile.member else "Family Member"
    if profile.member and profile.member.user and profile.member.user.full_name:
        member_name = profile.member.user.full_name
    member_role = profile.member.role.value if profile.member and profile.member.role else "member"

    return HealthProfileResponse(
        id=profile.id,
        household_id=profile.household_id,
        member_id=profile.member_id,
        member_name=member_name,
        member_role=member_role,
        blood_group=profile.blood_group,
        height_cm=profile.height_cm,
        weight_kg=profile.weight_kg,
        preferred_hospital=profile.preferred_hospital,
        preferred_doctor=profile.preferred_doctor,
        doctor_phone=profile.doctor_phone,
        insurance_provider=profile.insurance_provider,
        insurance_policy_no=profile.insurance_policy_no,
        organ_donor=profile.organ_donor,
        notes=profile.notes,
        conditions=[MedicalConditionResponse.model_validate(c) for c in profile.conditions],
        allergies=[AllergyResponse.model_validate(a) for a in profile.allergies],
        medicines=[MedicineResponse.model_validate(m) for m in profile.medicines],
        reports=[HealthReportResponse.model_validate(r) for r in profile.reports],
        emergency_contacts=[EmergencyContactResponse.model_validate(e) for e in profile.emergency_contacts],
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


# -------------------------------------------------------------
# 1. HEALTH PROFILES MANAGEMENT
# -------------------------------------------------------------
@router.get("/profiles", response_model=List[HealthProfileListItem])
async def list_health_profiles(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    # Fetch all members of this household
    members_res = await db.execute(
        select(HouseholdMember)
        .options(selectinload(HouseholdMember.user))
        .where(HouseholdMember.household_id == household.id, HouseholdMember.is_active == True)
    )
    members = members_res.scalars().all()

    items: List[HealthProfileListItem] = []
    for m in members:
        profile = await get_or_create_health_profile(m, household.id, db)
        member_name = m.display_name or (m.user.full_name if m.user else "Family Member")
        active_conds = sum(1 for c in profile.conditions if c.status == "active")
        active_meds = sum(1 for med in profile.medicines if med.is_active)
        has_lt = any(a.is_life_threatening for a in profile.allergies)

        items.append(
            HealthProfileListItem(
                id=profile.id,
                member_id=m.id,
                member_name=member_name,
                member_role=m.role.value if m.role else "member",
                blood_group=profile.blood_group,
                active_conditions_count=active_conds,
                allergies_count=len(profile.allergies),
                active_medicines_count=active_meds,
                has_life_threatening_allergy=has_lt,
                preferred_hospital=profile.preferred_hospital,
                insurance_provider=profile.insurance_provider,
            )
        )
    return items


@router.get("/profiles/{profile_id}", response_model=HealthProfileResponse)
async def get_health_profile_detail(
    profile_id: str,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(HealthProfile)
        .options(
            selectinload(HealthProfile.conditions),
            selectinload(HealthProfile.allergies),
            selectinload(HealthProfile.medicines),
            selectinload(HealthProfile.reports),
            selectinload(HealthProfile.emergency_contacts),
            selectinload(HealthProfile.member).selectinload(HouseholdMember.user),
        )
        .where(HealthProfile.id == profile_id, HealthProfile.household_id == household.id)
    )
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Health profile not found.")
    return serialize_health_profile(profile)


@router.patch("/profiles/{profile_id}", response_model=HealthProfileResponse)
async def update_health_profile(
    profile_id: str,
    data: HealthProfileUpdate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(HealthProfile)
        .options(
            selectinload(HealthProfile.conditions),
            selectinload(HealthProfile.allergies),
            selectinload(HealthProfile.medicines),
            selectinload(HealthProfile.reports),
            selectinload(HealthProfile.emergency_contacts),
            selectinload(HealthProfile.member).selectinload(HouseholdMember.user),
        )
        .where(HealthProfile.id == profile_id, HealthProfile.household_id == household.id)
    )
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Health profile not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(profile, field, val)

    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return serialize_health_profile(profile)


# -------------------------------------------------------------
# 2. MEDICAL CONDITIONS
# -------------------------------------------------------------
@router.post("/profiles/{profile_id}/conditions", response_model=MedicalConditionResponse, status_code=201)
async def add_medical_condition(
    profile_id: str,
    data: MedicalConditionCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(HealthProfile).where(HealthProfile.id == profile_id, HealthProfile.household_id == household.id)
    )
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Health profile not found.")

    cond = MedicalCondition(
        id=str(uuid.uuid4()),
        health_profile_id=profile.id,
        name=data.name,
        diagnosed_date=data.diagnosed_date,
        status=data.status,
        is_critical=data.is_critical,
        notes=data.notes,
    )
    db.add(cond)
    await db.commit()
    await db.refresh(cond)
    return MedicalConditionResponse.model_validate(cond)


@router.delete("/conditions/{condition_id}", status_code=200)
async def delete_medical_condition(
    condition_id: str,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(MedicalCondition)
        .join(HealthProfile, MedicalCondition.health_profile_id == HealthProfile.id)
        .where(MedicalCondition.id == condition_id, HealthProfile.household_id == household.id)
    )
    cond = res.scalar_one_or_none()
    if not cond:
        raise HTTPException(status_code=404, detail="Condition not found.")
    await db.delete(cond)
    await db.commit()
    return {"message": "Condition removed."}


# -------------------------------------------------------------
# 3. ALLERGIES
# -------------------------------------------------------------
@router.post("/profiles/{profile_id}/allergies", response_model=AllergyResponse, status_code=201)
async def add_allergy(
    profile_id: str,
    data: AllergyCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(HealthProfile).where(HealthProfile.id == profile_id, HealthProfile.household_id == household.id)
    )
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Health profile not found.")

    allergy = Allergy(
        id=str(uuid.uuid4()),
        health_profile_id=profile.id,
        allergen=data.allergen,
        category=data.category,
        severity=data.severity,
        reaction_description=data.reaction_description,
        is_life_threatening=data.is_life_threatening,
    )
    db.add(allergy)
    await db.commit()
    await db.refresh(allergy)
    return AllergyResponse.model_validate(allergy)


@router.delete("/allergies/{allergy_id}", status_code=200)
async def delete_allergy(
    allergy_id: str,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Allergy)
        .join(HealthProfile, Allergy.health_profile_id == HealthProfile.id)
        .where(Allergy.id == allergy_id, HealthProfile.household_id == household.id)
    )
    allergy = res.scalar_one_or_none()
    if not allergy:
        raise HTTPException(status_code=404, detail="Allergy not found.")
    await db.delete(allergy)
    await db.commit()
    return {"message": "Allergy removed."}


# -------------------------------------------------------------
# 4. MEDICINES & REFILL REMINDERS
# -------------------------------------------------------------
@router.post("/profiles/{profile_id}/medicines", response_model=MedicineResponse, status_code=201)
async def add_medicine(
    profile_id: str,
    data: MedicineCreate,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(HealthProfile)
        .options(selectinload(HealthProfile.member).selectinload(HouseholdMember.user))
        .where(HealthProfile.id == profile_id, HealthProfile.household_id == household.id)
    )
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Health profile not found.")

    med = Medicine(
        id=str(uuid.uuid4()),
        health_profile_id=profile.id,
        name=data.name,
        dosage=data.dosage,
        frequency=data.frequency,
        timing=data.timing,
        start_date=data.start_date,
        end_date=data.end_date,
        refill_date=data.refill_date,
        prescribed_by_doctor=data.prescribed_by_doctor,
        approx_price=data.approx_price or 0.0,
        is_active=data.is_active,
        instructions=data.instructions,
        source_document_id=data.source_document_id,
    )
    db.add(med)

    # Cross-module Linkage: Auto-schedule Refill Reminder in Sahay Daily
    if data.create_refill_reminder and data.refill_date:
        member_name = (
            profile.member.display_name or (profile.member.user.full_name if profile.member and profile.member.user else "Family")
        )
        price_val = float(data.approx_price or 0.0)
        ob = Obligation(
            id=str(uuid.uuid4()),
            household_id=household.id,
            created_by_user_id=current_user.id,
            assigned_member_id=profile.member_id,
            source_document_id=data.source_document_id,
            title=f"Medicine Refill: {data.name} ({member_name})",
            obligation_type=ObligationType.HEALTH_TASK,
            category="health",
            biller_or_payee=data.prescribed_by_doctor or "Pharmacy",
            amount=price_val,
            currency="INR",
            due_date=data.refill_date,
            priority=ObligationPriority.HIGH,
            status=ObligationStatus.PENDING,
            recurrence=RecurrenceFrequency.MONTHLY,
            notes=f"Refill prescription for {data.dosage} ({data.timing.value}). Approx cost: ₹{price_val:.2f}.",
        )
        db.add(ob)

    await db.commit()
    await db.refresh(med)
    return MedicineResponse.model_validate(med)


@router.patch("/medicines/{medicine_id}", response_model=MedicineResponse)
async def update_medicine(
    medicine_id: str,
    data: MedicineUpdate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Medicine)
        .join(HealthProfile, Medicine.health_profile_id == HealthProfile.id)
        .where(Medicine.id == medicine_id, HealthProfile.household_id == household.id)
    )
    med = res.scalar_one_or_none()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(med, field, val)

    db.add(med)
    await db.commit()
    await db.refresh(med)
    return MedicineResponse.model_validate(med)


@router.delete("/medicines/{medicine_id}", status_code=200)
async def delete_medicine(
    medicine_id: str,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Medicine)
        .join(HealthProfile, Medicine.health_profile_id == HealthProfile.id)
        .where(Medicine.id == medicine_id, HealthProfile.household_id == household.id)
    )
    med = res.scalar_one_or_none()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found.")
    await db.delete(med)
    await db.commit()
    return {"message": "Medicine removed."}


# -------------------------------------------------------------
# 5. HEALTH REPORTS & PRESCRIPTIONS
# -------------------------------------------------------------
@router.post("/profiles/{profile_id}/reports", response_model=HealthReportResponse, status_code=201)
async def add_health_report(
    profile_id: str,
    data: HealthReportCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(HealthProfile).where(HealthProfile.id == profile_id, HealthProfile.household_id == household.id)
    )
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Health profile not found.")

    report = HealthReport(
        id=str(uuid.uuid4()),
        health_profile_id=profile.id,
        title=data.title,
        report_type=data.report_type,
        test_date=data.test_date,
        lab_or_hospital_name=data.lab_or_hospital_name,
        summary_findings=data.summary_findings,
        is_abnormal=data.is_abnormal,
        source_document_id=data.source_document_id,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return HealthReportResponse.model_validate(report)


@router.delete("/reports/{report_id}", status_code=200)
async def delete_health_report(
    report_id: str,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(HealthReport)
        .join(HealthProfile, HealthReport.health_profile_id == HealthProfile.id)
        .where(HealthReport.id == report_id, HealthProfile.household_id == household.id)
    )
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    await db.delete(report)
    await db.commit()
    return {"message": "Report removed."}


# -------------------------------------------------------------
# 6. EMERGENCY CONTACTS
# -------------------------------------------------------------
@router.post("/profiles/{profile_id}/emergency-contacts", response_model=EmergencyContactResponse, status_code=201)
async def add_emergency_contact(
    profile_id: str,
    data: EmergencyContactCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(HealthProfile).where(HealthProfile.id == profile_id, HealthProfile.household_id == household.id)
    )
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Health profile not found.")

    contact = EmergencyContact(
        id=str(uuid.uuid4()),
        health_profile_id=profile.id,
        name=data.name,
        relationship=data.relationship,
        phone_number=data.phone_number,
        alternate_phone=data.alternate_phone,
        is_primary=data.is_primary,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return EmergencyContactResponse.model_validate(contact)


@router.delete("/emergency-contacts/{contact_id}", status_code=200)
async def delete_emergency_contact(
    contact_id: str,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(EmergencyContact)
        .join(HealthProfile, EmergencyContact.health_profile_id == HealthProfile.id)
        .where(EmergencyContact.id == contact_id, HealthProfile.household_id == household.id)
    )
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Emergency contact not found.")
    await db.delete(contact)
    await db.commit()
    return {"message": "Contact removed."}


# -------------------------------------------------------------
# 7. EMERGENCY MODE CORE & TEMPORARY ACCESS SHARING
# -------------------------------------------------------------
@router.get("/profiles/{profile_id}/emergency-card", response_model=EmergencyCardResponse)
async def get_emergency_card(
    profile_id: str,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(HealthProfile)
        .options(
            selectinload(HealthProfile.conditions),
            selectinload(HealthProfile.allergies),
            selectinload(HealthProfile.medicines),
            selectinload(HealthProfile.emergency_contacts),
            selectinload(HealthProfile.member).selectinload(HouseholdMember.user),
        )
        .where(HealthProfile.id == profile_id, HealthProfile.household_id == household.id)
    )
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Health profile not found.")

    member_name = profile.member.display_name if profile.member else "Family Member"
    if profile.member and profile.member.user and profile.member.user.full_name:
        member_name = profile.member.user.full_name
    member_role = profile.member.role.value if profile.member and profile.member.role else "member"

    # Filter critical health facts
    lt_allergies = [a for a in profile.allergies if a.is_life_threatening or a.severity.value in ["severe", "life_threatening"]]
    critical_conds = [c for c in profile.conditions if c.is_critical or c.status.value == "active"]
    active_meds = [m for m in profile.medicines if m.is_active]

    return EmergencyCardResponse(
        health_profile_id=profile.id,
        patient_name=member_name,
        relationship_role=member_role,
        blood_group=profile.blood_group,
        organ_donor=profile.organ_donor,
        life_threatening_allergies=[AllergyResponse.model_validate(a) for a in lt_allergies],
        critical_conditions=[MedicalConditionResponse.model_validate(c) for c in critical_conds],
        current_medications=[MedicineResponse.model_validate(m) for m in active_meds],
        emergency_contacts=[EmergencyContactResponse.model_validate(e) for e in profile.emergency_contacts],
        preferred_hospital=profile.preferred_hospital,
        preferred_doctor=profile.preferred_doctor,
        doctor_phone=profile.doctor_phone,
        insurance_provider=profile.insurance_provider,
        insurance_policy_no=profile.insurance_policy_no,
        generated_at=datetime.now(timezone.utc),
    )


@router.post("/profiles/{profile_id}/emergency-share", response_model=EmergencyShareResponse)
async def create_emergency_share(
    profile_id: str,
    data: EmergencyShareCreate,
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(HealthProfile).where(HealthProfile.id == profile_id, HealthProfile.household_id == household.id)
    )
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Health profile not found.")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=data.validity_hours)

    share = EmergencyShare(
        id=str(uuid.uuid4()),
        health_profile_id=profile.id,
        created_by_user_id=current_user.id,
        share_token=token,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(share)
    await db.commit()
    await db.refresh(share)

    return EmergencyShareResponse(
        id=share.id,
        share_token=share.share_token,
        public_url=f"/emergency-mode/{token}",
        expires_at=share.expires_at,
        is_active=share.is_active,
        access_count=share.access_count,
        created_at=share.created_at,
    )


@router.post("/emergency-shares/{share_id}/revoke", status_code=200)
async def revoke_emergency_share(
    share_id: str,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(EmergencyShare)
        .join(HealthProfile, EmergencyShare.health_profile_id == HealthProfile.id)
        .where(EmergencyShare.id == share_id, HealthProfile.household_id == household.id)
    )
    share = res.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Share token not found.")
    share.is_active = False
    db.add(share)
    await db.commit()
    return {"message": "Emergency share token revoked."}


# -------------------------------------------------------------
# 8. PUBLIC EMERGENCY CARD (NO LOGIN REQUIRED FOR FIRST RESPONDERS)
# -------------------------------------------------------------
@router.get("/emergency/{share_token}", response_model=EmergencyCardResponse)
async def access_public_emergency_card(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(EmergencyShare)
        .options(
            selectinload(EmergencyShare.health_profile)
            .selectinload(HealthProfile.conditions),
            selectinload(EmergencyShare.health_profile)
            .selectinload(HealthProfile.allergies),
            selectinload(EmergencyShare.health_profile)
            .selectinload(HealthProfile.medicines),
            selectinload(EmergencyShare.health_profile)
            .selectinload(HealthProfile.emergency_contacts),
            selectinload(EmergencyShare.health_profile)
            .selectinload(HealthProfile.member)
            .selectinload(HouseholdMember.user),
        )
        .where(EmergencyShare.share_token == share_token)
    )
    share = res.scalar_one_or_none()
    if not share or not share.is_active:
        raise HTTPException(status_code=404, detail="Invalid or deactivated emergency link.")

    now = datetime.now(timezone.utc)
    exp = share.expires_at.replace(tzinfo=timezone.utc) if share.expires_at.tzinfo is None else share.expires_at
    if exp < now:
        raise HTTPException(status_code=410, detail="This emergency access link has expired.")

    # Record access audit
    share.access_count += 1
    share.last_accessed_at = now
    db.add(share)
    await db.commit()

    profile = share.health_profile
    member_name = profile.member.display_name if profile.member else "Patient"
    if profile.member and profile.member.user and profile.member.user.full_name:
        member_name = profile.member.user.full_name
    member_role = profile.member.role.value if profile.member and profile.member.role else "member"

    lt_allergies = [a for a in profile.allergies if a.is_life_threatening or a.severity.value in ["severe", "life_threatening"]]
    critical_conds = [c for c in profile.conditions if c.is_critical or c.status.value == "active"]
    active_meds = [m for m in profile.medicines if m.is_active]

    return EmergencyCardResponse(
        health_profile_id=profile.id,
        patient_name=member_name,
        relationship_role=member_role,
        blood_group=profile.blood_group,
        organ_donor=profile.organ_donor,
        life_threatening_allergies=[AllergyResponse.model_validate(a) for a in lt_allergies],
        critical_conditions=[MedicalConditionResponse.model_validate(c) for c in critical_conds],
        current_medications=[MedicineResponse.model_validate(m) for m in active_meds],
        emergency_contacts=[EmergencyContactResponse.model_validate(e) for e in profile.emergency_contacts],
        preferred_hospital=profile.preferred_hospital,
        preferred_doctor=profile.preferred_doctor,
        doctor_phone=profile.doctor_phone,
        insurance_provider=profile.insurance_provider,
        insurance_policy_no=profile.insurance_policy_no,
        generated_at=now,
    )
