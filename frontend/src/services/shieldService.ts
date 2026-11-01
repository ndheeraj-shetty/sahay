import { apiClient } from './api';
import {
  AuditLogItem,
  ConsentRecord,
  ConsentType,
  DataDeletionResponse,
  DataExportResponse,
  SecurityActivityOverview,
  SecurityEventItem,
  SecuritySessionItem,
} from '../types/shield';

export const shieldService = {
  getActivityOverview: async (): Promise<SecurityActivityOverview> => {
    const { data } = await apiClient.get<SecurityActivityOverview>('/security/activity');
    return data;
  },

  listAuditLogs: async (params?: {
    module?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogItem[]> => {
    const { data } = await apiClient.get<AuditLogItem[]>('/security/audit-logs', { params });
    return data;
  },

  listSessions: async (): Promise<SecuritySessionItem[]> => {
    const { data } = await apiClient.get<SecuritySessionItem[]>('/security/sessions');
    return data;
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/security/sessions/${sessionId}`);
  },

  listConsents: async (): Promise<ConsentRecord[]> => {
    const { data } = await apiClient.get<ConsentRecord[]>('/security/consents');
    return data;
  },

  grantConsent: async (payload: {
    consent_type: ConsentType;
    purpose_description: string;
  }): Promise<ConsentRecord> => {
    const { data } = await apiClient.post<ConsentRecord>('/security/consents', payload);
    return data;
  },

  withdrawConsent: async (consentId: string): Promise<ConsentRecord> => {
    const { data } = await apiClient.post<ConsentRecord>(`/security/consents/${consentId}/withdraw`);
    return data;
  },

  requestDataExport: async (payload: {
    include_documents?: boolean;
    include_health?: boolean;
    include_daily?: boolean;
    include_goals?: boolean;
  }): Promise<DataExportResponse> => {
    const { data } = await apiClient.post<DataExportResponse>('/security/export', payload);
    return data;
  },

  requestDataDeletion: async (payload: {
    reason: string;
    confirm_password: string;
  }): Promise<DataDeletionResponse> => {
    const { data } = await apiClient.post<DataDeletionResponse>('/security/deletion-request', payload);
    return data;
  },

  listEvents: async (): Promise<SecurityEventItem[]> => {
    const { data } = await apiClient.get<SecurityEventItem[]>('/security/events');
    return data;
  },
};
