import { apiClient } from './api';
import {
  HouseholdDetail,
  InviteResponse,
  MemberResponse,
  MemberRole,
} from '../types/auth';

export const householdService = {
  getCurrentHousehold: async (): Promise<HouseholdDetail> => {
    const { data } = await apiClient.get<HouseholdDetail>('/households/current');
    return data;
  },

  listMyHouseholds: async (): Promise<HouseholdDetail[]> => {
    const { data } = await apiClient.get<HouseholdDetail[]>('/households');
    return data;
  },

  createHousehold: async (payload: {
    name: string;
    currency?: string;
    timezone?: string;
    address?: string;
  }): Promise<HouseholdDetail> => {
    const { data } = await apiClient.post<HouseholdDetail>('/households', payload);
    return data;
  },

  updateHousehold: async (payload: {
    name?: string;
    currency?: string;
    timezone?: string;
    address?: string;
  }): Promise<HouseholdDetail> => {
    const { data } = await apiClient.patch<HouseholdDetail>('/households/current', payload);
    return data;
  },

  listMembers: async (): Promise<MemberResponse[]> => {
    const { data } = await apiClient.get<MemberResponse[]>('/households/members');
    return data;
  },

  updateMember: async (
    memberId: string,
    payload: {
      role?: MemberRole;
      relationship?: string;
      display_name?: string;
      is_active?: boolean;
    }
  ): Promise<MemberResponse> => {
    const { data } = await apiClient.patch<MemberResponse>(
      `/households/members/${memberId}`,
      payload
    );
    return data;
  },

  removeMember: async (memberId: string): Promise<void> => {
    await apiClient.delete(`/households/members/${memberId}`);
  },

  inviteMember: async (payload: {
    invitee_email: string;
    invitee_name?: string;
    role: MemberRole;
    relationship?: string;
  }): Promise<InviteResponse> => {
    const { data } = await apiClient.post<InviteResponse>('/households/invite', payload);
    return data;
  },

  listInvitations: async (): Promise<InviteResponse[]> => {
    const { data } = await apiClient.get<InviteResponse[]>('/households/invitations');
    return data;
  },

  revokeInvitation: async (inviteId: string): Promise<void> => {
    await apiClient.delete(`/households/invitations/${inviteId}`);
  },

  acceptInvitation: async (inviteCode: string): Promise<HouseholdDetail> => {
    const { data } = await apiClient.post<HouseholdDetail>(
      '/households/invitations/accept',
      { invite_code: inviteCode }
    );
    return data;
  },
};
