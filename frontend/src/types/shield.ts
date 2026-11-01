export type AuditStatus = 'success' | 'denied' | 'failed';
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';
export type ConsentType =
  | 'ocr_processing'
  | 'ai_retrieval'
  | 'emergency_sharing'
  | 'health_processing'
  | 'sms_bill_reading'
  | 'data_sharing';

export type DataRequestType = 'export' | 'deletion';
export type DataRequestStatus = 'pending' | 'processing' | 'completed' | 'rejected';

export interface AuditLogItem {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  module: string;
  resource_type?: string;
  resource_id?: string;
  status: AuditStatus;
  ip_address?: string;
  user_agent?: string;
  details_json?: string;
  created_at: string;
}

export interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  purpose_description: string;
  is_granted: boolean;
  granted_at: string;
  withdrawn_at?: string;
}

export interface SecurityEventItem {
  id: string;
  event_type: string;
  severity: SecuritySeverity;
  description: string;
  metadata_json?: string;
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

export interface SecuritySessionItem {
  id: string;
  device_info: string;
  ip_address?: string;
  last_seen_at: string;
  is_current: boolean;
  is_revoked: boolean;
  created_at: string;
}

export interface SecurityActivityOverview {
  total_audit_events_count: number;
  active_consents_count: number;
  active_sessions_count: number;
  unresolved_security_events_count: number;
  encryption_standard: string;
  recent_activities: AuditLogItem[];
  recent_events: SecurityEventItem[];
}

export interface DataExportResponse {
  request_id: string;
  status: DataRequestStatus;
  download_url?: string;
  summary: Record<string, any>;
  created_at: string;
}

export interface DataDeletionResponse {
  request_id: string;
  status: DataRequestStatus;
  message: string;
  created_at: string;
}
