import { apiClient } from './api';
import {
  SessionResponse,
  TokenResponse,
  UserProfile,
} from '../types/auth';

export const authService = {
  register: async (payload: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    household_name?: string;
    invite_code?: string;
    is_owner?: boolean;
  }): Promise<TokenResponse> => {
    const { data } = await apiClient.post<TokenResponse>('/auth/register', payload);
    return data;
  },

  login: async (payload: {
    email: string;
    password: string;
    device_info?: string;
  }): Promise<TokenResponse> => {
    const { data } = await apiClient.post<TokenResponse>('/auth/login', payload);
    return data;
  },

  getMe: async (): Promise<UserProfile> => {
    const { data } = await apiClient.get<UserProfile>('/auth/me');
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('sahay_access_token');
      localStorage.removeItem('sahay_refresh_token');
      localStorage.removeItem('sahay_active_household_id');
    }
  },

  updateProfile: async (payload: {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
  }): Promise<UserProfile> => {
    const { data } = await apiClient.patch<UserProfile>('/auth/profile', payload);
    return data;
  },

  getSessions: async (): Promise<SessionResponse[]> => {
    const { data } = await apiClient.get<SessionResponse[]>('/auth/sessions');
    return data;
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/auth/sessions/${sessionId}`);
  },

  revokeAllOtherSessions: async (): Promise<void> => {
    await apiClient.delete('/auth/sessions');
  },

  forgotPassword: async (email: string): Promise<{ message: string; demo_reset_code?: string }> => {
    const { data } = await apiClient.post('/auth/forgot-password', { email });
    return data;
  },

  resetPassword: async (payload: {
    email: string;
    reset_code: string;
    new_password: string;
  }): Promise<{ message: string }> => {
    const { data } = await apiClient.post('/auth/reset-password', payload);
    return data;
  },
};