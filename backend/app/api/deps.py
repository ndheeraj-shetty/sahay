from typing import Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import decode_token
from app.db.session import get_db
from app.models.auth import Household, HouseholdMember, MemberRole, User

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(auth.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject invalid.",
        )

    result = await db.execute(
        select(User)
        .options(selectinload(User.memberships).selectinload(HouseholdMember.household))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token does not exist.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    return user


async def get_current_household_membership(
    current_user: User = Depends(get_current_user),
    x_household_id: Optional[str] = Header(None, alias="X-Household-ID"),
    db: AsyncSession = Depends(get_db),
) -> HouseholdMember:
    """Resolves the user's active household membership based on header or primary status."""
    memberships = current_user.memberships
    if not memberships:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not belong to any household. Please create or join a household.",
        )

    # 1. Check if user specified a household ID in header
    if x_household_id:
        for m in memberships:
            if m.household_id == x_household_id and m.is_active:
                return m
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not an active member of the specified household.",
        )

    # 2. Prefer primary membership
    for m in memberships:
        if m.is_primary and m.is_active:
            return m

    # 3. Otherwise first active membership
    for m in memberships:
        if m.is_active:
            return m

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No active household memberships found for user.",
    )


async def get_current_household(
    membership: HouseholdMember = Depends(get_current_household_membership),
    db: AsyncSession = Depends(get_db),
) -> Household:
    result = await db.execute(
        select(Household)
        .options(selectinload(Household.members).selectinload(HouseholdMember.user))
        .where(Household.id == membership.household_id)
    )
    household = result.scalar_one_or_none()
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")
    return household


async def require_household_owner(
    membership: HouseholdMember = Depends(get_current_household_membership),
) -> HouseholdMember:
    if membership.role != MemberRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires Household Owner permissions.",
        )
    return membership


async def require_household_adult_or_owner(
    membership: HouseholdMember = Depends(get_current_household_membership),
) -> HouseholdMember:
    if membership.role not in [MemberRole.OWNER, MemberRole.ADULT]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires Adult or Owner permissions.",
        )
    return membership
