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
    require_household_owner,
)
from app.db.session import get_db
from app.models.auth import (
    Household,
    HouseholdMember,
    Invitation,
    InvitationStatus,
    MemberRole,
    User,
)
from app.schemas.household import (
    AcceptInviteRequest,
    HouseholdCreate,
    HouseholdDetail,
    HouseholdUpdate,
    InviteCreate,
    InviteResponse,
    MemberResponse,
    MemberUpdate,
)

router = APIRouter()


def serialize_member(m: HouseholdMember) -> MemberResponse:
    return MemberResponse(
        id=m.id,
        user_id=m.user_id,
        email=m.user.email if m.user else "",
        full_name=m.user.full_name if m.user else "",
        avatar_url=m.user.avatar_url if m.user else None,
        role=m.role,
        relationship=m.relationship,
        display_name=m.display_name or (m.user.full_name if m.user else None),
        is_primary=m.is_primary,
        is_active=m.is_active,
        joined_at=m.joined_at,
    )


@router.post("", response_model=HouseholdDetail, status_code=status.HTTP_201_CREATED)
async def create_household(
    data: HouseholdCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    new_household = Household(
        id=str(uuid.uuid4()),
        name=data.name,
        created_by_user_id=current_user.id,
        currency=data.currency or "INR",
        timezone=data.timezone or "Asia/Kolkata",
        address=data.address,
    )
    db.add(new_household)
    await db.flush()

    new_member = HouseholdMember(
        id=str(uuid.uuid4()),
        household_id=new_household.id,
        user_id=current_user.id,
        role=MemberRole.OWNER,
        relationship="Self",
        display_name=current_user.full_name,
        is_primary=False,
        is_active=True,
    )
    db.add(new_member)
    await db.commit()

    # Re-query with members
    result = await db.execute(
        select(Household)
        .options(selectinload(Household.members).selectinload(HouseholdMember.user))
        .where(Household.id == new_household.id)
    )
    created_h = result.scalar_one()

    return HouseholdDetail(
        id=created_h.id,
        name=created_h.name,
        currency=created_h.currency,
        timezone=created_h.timezone,
        address=created_h.address,
        created_at=created_h.created_at,
        my_role=MemberRole.OWNER,
        members=[serialize_member(m) for m in created_h.members],
    )


@router.get("", response_model=List[HouseholdDetail])
async def list_my_households(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch all households where user is an active member
    result = await db.execute(
        select(HouseholdMember)
        .options(
            selectinload(HouseholdMember.household)
            .selectinload(Household.members)
            .selectinload(HouseholdMember.user)
        )
        .where(
            HouseholdMember.user_id == current_user.id,
            HouseholdMember.is_active == True,
        )
    )
    memberships = result.scalars().all()
    households = []
    for m in memberships:
        h = m.household
        if h:
            households.append(
                HouseholdDetail(
                    id=h.id,
                    name=h.name,
                    currency=h.currency,
                    timezone=h.timezone,
                    address=h.address,
                    created_at=h.created_at,
                    my_role=m.role,
                    members=[serialize_member(mem) for mem in h.members],
                )
            )
    return households


@router.get("/current", response_model=HouseholdDetail)
async def get_current_household_detail(
    household: Household = Depends(get_current_household),
    membership: HouseholdMember = Depends(get_current_household_membership),
):
    return HouseholdDetail(
        id=household.id,
        name=household.name,
        currency=household.currency,
        timezone=household.timezone,
        address=household.address,
        created_at=household.created_at,
        my_role=membership.role,
        members=[serialize_member(m) for m in household.members],
    )


@router.patch("/current", response_model=HouseholdDetail)
async def update_current_household(
    data: HouseholdUpdate,
    household: Household = Depends(get_current_household),
    _owner_check: HouseholdMember = Depends(require_household_owner),
    db: AsyncSession = Depends(get_db),
):
    if data.name is not None:
        household.name = data.name
    if data.currency is not None:
        household.currency = data.currency
    if data.timezone is not None:
        household.timezone = data.timezone
    if data.address is not None:
        household.address = data.address

    db.add(household)
    await db.commit()
    await db.refresh(household)

    return HouseholdDetail(
        id=household.id,
        name=household.name,
        currency=household.currency,
        timezone=household.timezone,
        address=household.address,
        created_at=household.created_at,
        my_role=_owner_check.role,
        members=[serialize_member(m) for m in household.members],
    )


@router.get("/members", response_model=List[MemberResponse])
async def list_household_members(
    household: Household = Depends(get_current_household),
):
    return [serialize_member(m) for m in household.members]


@router.patch("/members/{member_id}", response_model=MemberResponse)
async def update_household_member(
    member_id: str,
    data: MemberUpdate,
    household: Household = Depends(get_current_household),
    _owner_check: HouseholdMember = Depends(require_household_owner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HouseholdMember)
        .options(selectinload(HouseholdMember.user))
        .where(
            HouseholdMember.id == member_id,
            HouseholdMember.household_id == household.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Household member not found.")

    if data.role is not None:
        # Prevent demoting the only owner
        if member.role == MemberRole.OWNER and data.role != MemberRole.OWNER:
            owners_count = sum(1 for m in household.members if m.role == MemberRole.OWNER and m.is_active)
            if owners_count <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot demote the sole owner of the household. Assign another owner first.",
                )
        member.role = data.role

    if data.relationship is not None:
        member.relationship = data.relationship
    if data.display_name is not None:
        member.display_name = data.display_name
    if data.is_active is not None:
        member.is_active = data.is_active

    db.add(member)
    await db.commit()
    await db.refresh(member)
    return serialize_member(member)


@router.delete("/members/{member_id}", status_code=status.HTTP_200_OK)
async def remove_household_member(
    member_id: str,
    household: Household = Depends(get_current_household),
    current_membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
):
    # Only owner can remove someone, or user can remove themselves
    if current_membership.role != MemberRole.OWNER and current_membership.id != member_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to remove this member.",
        )

    result = await db.execute(
        select(HouseholdMember).where(
            HouseholdMember.id == member_id,
            HouseholdMember.household_id == household.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found.")

    if member.role == MemberRole.OWNER:
        owners_count = sum(1 for m in household.members if m.role == MemberRole.OWNER and m.is_active)
        if owners_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove the sole owner of the household.",
            )

    await db.delete(member)
    await db.commit()
    return {"message": "Member removed from household."}


@router.post("/invite", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
async def invite_member(
    data: InviteCreate,
    household: Household = Depends(get_current_household),
    current_user: User = Depends(get_current_user),
    _owner_check: HouseholdMember = Depends(require_household_owner),
    db: AsyncSession = Depends(get_db),
):
    # Check if active member already has this email
    existing_mem = next(
        (m for m in household.members if m.user and m.user.email.lower() == data.invitee_email.lower() and m.is_active),
        None,
    )
    if existing_mem:
        raise HTTPException(
            status_code=400,
            detail="This user is already an active member of this household.",
        )

    # Check for existing pending invitation
    pending_res = await db.execute(
        select(Invitation).where(
            Invitation.household_id == household.id,
            Invitation.invitee_email == data.invitee_email.lower(),
            Invitation.status == InvitationStatus.PENDING,
        )
    )
    existing_invite = pending_res.scalar_one_or_none()
    if existing_invite:
        # Refresh expiry
        existing_invite.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        existing_invite.role = data.role
        existing_invite.relationship = data.relationship
        existing_invite.invitee_name = data.invitee_name
        db.add(existing_invite)
        await db.commit()
        await db.refresh(existing_invite)
        return InviteResponse.model_validate(existing_invite)

    new_invite = Invitation(
        id=str(uuid.uuid4()),
        household_id=household.id,
        inviter_user_id=current_user.id,
        invitee_email=data.invitee_email.lower(),
        invitee_name=data.invitee_name,
        role=data.role,
        relationship=data.relationship,
        status=InvitationStatus.PENDING,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(new_invite)
    await db.commit()
    await db.refresh(new_invite)
    return InviteResponse.model_validate(new_invite)


@router.get("/invitations", response_model=List[InviteResponse])
async def list_household_invitations(
    household: Household = Depends(get_current_household),
    _owner_check: HouseholdMember = Depends(require_household_owner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invitation)
        .where(
            Invitation.household_id == household.id,
            Invitation.status == InvitationStatus.PENDING,
        )
        .order_by(Invitation.created_at.desc())
    )
    return [InviteResponse.model_validate(i) for i in result.scalars().all()]


@router.delete("/invitations/{invite_id}", status_code=status.HTTP_200_OK)
async def revoke_invitation(
    invite_id: str,
    household: Household = Depends(get_current_household),
    _owner_check: HouseholdMember = Depends(require_household_owner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invitation).where(
            Invitation.id == invite_id,
            Invitation.household_id == household.id,
        )
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found.")
    inv.status = InvitationStatus.REVOKED
    await db.commit()
    return {"message": "Invitation revoked."}


@router.post("/invitations/accept", response_model=HouseholdDetail)
async def accept_invitation(
    data: AcceptInviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    code = data.invite_code.strip().upper()
    result = await db.execute(
        select(Invitation)
        .options(selectinload(Invitation.household).selectinload(Household.members).selectinload(HouseholdMember.user))
        .where(
            Invitation.invite_code == code,
            Invitation.status == InvitationStatus.PENDING,
        )
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation code.",
        )

    exp = inv.expires_at.replace(tzinfo=timezone.utc) if inv.expires_at.tzinfo is None else inv.expires_at
    if exp < datetime.now(timezone.utc):
        inv.status = InvitationStatus.EXPIRED
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has expired.",
        )

    # Check if user is already a member
    household = inv.household
    existing_mem = next((m for m in household.members if m.user_id == current_user.id), None)
    if existing_mem:
        if not existing_mem.is_active:
            existing_mem.is_active = True
            existing_mem.role = inv.role
            existing_mem.relationship = inv.relationship or existing_mem.relationship
            db.add(existing_mem)
        inv.status = InvitationStatus.ACCEPTED
        await db.commit()
    else:
        new_member = HouseholdMember(
            id=str(uuid.uuid4()),
            household_id=household.id,
            user_id=current_user.id,
            role=inv.role,
            relationship=inv.relationship,
            display_name=current_user.full_name,
            is_primary=False,
            is_active=True,
        )
        db.add(new_member)
        inv.status = InvitationStatus.ACCEPTED
        await db.commit()

    # Query all active members of the household
    members_res = await db.execute(
        select(HouseholdMember)
        .options(selectinload(HouseholdMember.user))
        .where(HouseholdMember.household_id == household.id, HouseholdMember.is_active == True)
    )
    members_list = members_res.scalars().all()

    return HouseholdDetail(
        id=household.id,
        name=household.name,
        currency=household.currency,
        timezone=household.timezone,
        address=household.address,
        created_at=household.created_at,
        my_role=inv.role,
        members=[serialize_member(m) for m in members_list],
    )
