export type DocumentCategory =
  | 'identity'
  | 'financial'
  | 'health'
  | 'education'
  | 'household'
  | 'other';

export type DocumentAccessLevel = 'private' | 'shared_adults' | 'household';

export interface DocumentResponse {
  id: string;
  household_id: string;
  owner_user_id: string;
  owner_name?: string | null;
  target_member_id?: string | null;
  target_member_name?: string | null;
  title: string;
  category: DocumentCategory;
  document_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_hash: string;
  access_level: DocumentAccessLevel;
  is_verified: boolean;
  is_encrypted?: boolean;
  encryption_algorithm?: string;
  expiry_date?: string | null;
  tags?: string | null;
  issuer?: string | null;
  created_at: string;
  updated_at: string;
  can_access: boolean;
}

export interface ExtractedFieldResponse {
  id: string;
  job_id: string;
  document_id: string;
  field_name: string;
  field_value?: string | null;
  confidence: number;
  source_evidence?: string | null;
  is_masked: boolean;
  user_confirmed_value?: string | null;
  is_verified_by_user: boolean;
}

export interface DocumentDoctorJobResponse {
  id: string;
  document_id: string;
  household_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  document_classification?: string | null;
  confidence_score: number;
  error_message?: string | null;
  extracted_fields: ExtractedFieldResponse[];
  created_at: string;
  updated_at: string;
}

export interface FinancialEventResponse {
  event_type: string;
  amount: number;
  account_reference?: string | null;
  raw_text: string;
  detected_at: string;
  suggest_recurring: boolean;
}

export interface CompareFieldChange {
  field_name: string;
  baseline_value?: string | null;
  updated_value?: string | null;
  change_type: 'increased' | 'decreased' | 'modified' | 'added' | 'removed' | 'unchanged';
  significance: 'high' | 'medium' | 'low';
  impact_summary: string;
}

export interface DocumentCompareResponse {
  baseline_document_id: string;
  baseline_title: string;
  baseline_type: string;
  updated_document_id: string;
  updated_title: string;
  updated_type: string;
  executive_summary: string;
  key_alerts: string[];
  field_changes: CompareFieldChange[];
  ai_explanation: string;
  created_at: string;
}
