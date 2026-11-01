# SAHAY — Phase 2: Authentication & Household

## Overview
Phase 2 implements the identity and household governance foundation for **SAHAY: The Household Life-Admin OS**. Instead of isolated individual accounts, SAHAY is architected from the ground up around **Households** and **Role-Based Family Access Control**.

---

## Deliverables Completed

### 1. Database Architecture
Five core relational tables implemented with UUIDs, indexes, and relationship mappings:
- **`users`**: Secure account details, email (unique, lowercase), hashed password, phone, avatar, and active status.
- **`households`**: Household name, creator reference, currency (`INR`), timezone (`Asia/Kolkata`), address.
- **`household_members`**: Links users to households with distinct family roles (`owner`, `adult`, `elder`, `caregiver`, `child`), relationship descriptions, display names, and primary household indicators.
- **`sessions`**: Server-side session tracking with JWT jti identification, client device/IP auditing, expiry tracking, and revocation flags.
- **`invitations`**: Family invitations with single-use or shareable 12-character secure alphanumeric codes, role assignment, expiration, and status tracking.

### 2. Security Infrastructure
- **Password Security:** Industry-standard `bcrypt` salted password hashing with 12 rounds.
- **Session & Tokens:** Dual-token architecture using `PyJWT`:
  - **Access Tokens:** Signed with HMAC-SHA256, carrying user id, email, active household id, and member role.
  - **Refresh Tokens:** Long-lived tokens paired with tracked database sessions.
- **Session Revocation:** Support for logging out individual sessions or 1-click revoking all other active devices.

### 3. Role-Based Permissions
Supported household roles:
1. **Household Owner (`owner`):** Complete administrative authority. Can invite members, modify roles, revoke invites, edit household settings, and manage sessions.
2. **Adult Member (`adult`):** Manages own documents, participates in household goals, views shared obligations.
3. **Elder Member (`elder`):** Simplified, accessible interface focusing on view-only family documents, health cards, and emergency info.
4. **Caregiver / Helper (`caregiver`):** Restricted helper view for medicine schedules and daily care tasks.
5. **Child Member (`child`):** Emergency contacts and educational records access.

### 4. API Endpoints (`/api/v1`)
#### Authentication & Profiles
- `POST /api/v1/auth/register`: User registration + automated primary household creation + owner role assignment.
- `POST /api/v1/auth/login`: Credential verification, session creation, tokens issuance.
- `POST /api/v1/auth/refresh`: Access token refresh via database-validated session.
- `POST /api/v1/auth/logout`: Revokes active device session.
- `GET /api/v1/auth/me`: Authenticated user profile and membership list.
- `PATCH /api/v1/auth/profile`: Profile update (name, phone, avatar).
- `POST /api/v1/auth/change-password`: Secure password change with verification.
- `GET /api/v1/auth/sessions`: List all active user sessions with current-device indicator.
- `DELETE /api/v1/auth/sessions/{id}`: Revoke a specific session.
- `DELETE /api/v1/auth/sessions`: Revoke all other sessions.

#### Households & Membership
- `POST /api/v1/households`: Create a new household.
- `GET /api/v1/households`: List all households user belongs to.
- `GET /api/v1/households/current`: Detailed profile of active household and its roster.
- `PATCH /api/v1/households/current`: Update household details (Owner only).
- `GET /api/v1/households/members`: Roster of household members with roles and relationships.
- `PATCH /api/v1/households/members/{id}`: Update member role and relationship (Owner only).
- `DELETE /api/v1/households/members/{id}`: Remove a member (Owner only or self-leave).
- `POST /api/v1/households/invite`: Invite a family member with assigned role and relationship (Owner only).
- `GET /api/v1/households/invitations`: List pending invitations for active household (Owner only).
- `DELETE /api/v1/households/invitations/{id}`: Revoke pending invitation (Owner only).
- `POST /api/v1/households/invitations/accept`: Accept invite code and join household.

### 5. Frontend UI
- **`AuthContext`:** Context provider managing authentication state, token storage, and active household switching.
- **`AuthModal`:** Modal for Login and Registration with 1-click Demo Account presets (Rajesh Sharma - Owner, Satish Sharma - Elder).
- **`HouseholdView`:**
  - Household details banner with active household badge.
  - Family Member Roster with role badges, relationship tags, and Owner actions.
  - Pending Invitations panel with copyable codes and 1-click test actions.
  - "Join Family Household with Code" card for accepting invites.
  - Active Sessions & Device Security panel with 1-click "Log Out All Other Devices".
- **`Header`:** Updated with live user avatar, active household dropdown, role pill, and sign-out controls.
- **`Sidebar`:** Added "Household & Family" navigation with Phase 2 badge.

---

## Testing & Verification
- Pytest suite passes 6/6 tests covering full registration, login, token refresh, sessions, household creation, inviting, and invitation acceptance.
- Vite frontend build (`tsc -b && vite build`) passed with zero errors.
