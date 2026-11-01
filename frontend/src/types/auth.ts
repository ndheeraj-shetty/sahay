export type MemberRole = 'owner' | 'adult' | 'elder' | 'caregiver' | 'child';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';

export interface UserProfile {
  id: string;
  email: string;
  phone?: string | null;
  full_name: string;
  avatar_url?: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface HouseholdBasic {
  id: string;
  name: string;
  role: MemberRole;
  is_primary: boolean;
}

export interface MemberResponse {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: MemberRole;
  relationship?: string | null;
  display_name?: string | null;
  is_primary: boolean;
  is_active: boolean;
  joined_at: string;
}

export interface HouseholdDetail {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  address?: string | null;
  created_at: string;
  my_role?: MemberRole;
  members: MemberResponse[];
}

export interface SessionResponse {
  id: string;
  device_info?: string | null;
  ip_address?: string | null;
  expires_at: string;
  is_revoked: boolean;
  is_current: boolean;
  last_seen_at: string;
  created_at: string;
}

export interface InviteResponse {
  id: string;
  household_id: string;
  invitee_email: string;
  invitee_name?: string | null;
  role: MemberRole;
  relationship?: string | null;
  invite_code: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserProfile;
  primary_household?: HouseholdBasic | null;
  households: HouseholdBasic[];
}
