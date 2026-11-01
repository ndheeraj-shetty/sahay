export type ActionType =
  | 'create_goal'
  | 'create_obligation'
  | 'mark_paid'
  | 'add_goal_contribution'
  | 'add_allergy'
  | 'add_medicine'
  | 'update_money_profile'
  | 'custom';

export type ActionStatus = 'pending' | 'confirmed' | 'rejected' | 'executed' | 'failed';

export interface AICitation {
  source_type: 'document' | 'obligation' | 'health' | 'goal' | string;
  source_id: string;
  title: string;
  snippet: string;
  file_name?: string | null;
  page_number?: number | null;
  evidence?: string | null;
  confidence_score?: number | null;
  verified_by_user?: boolean | null;
}

export interface AIActionResponse {
  id: string;
  action_type: ActionType;
  confirmation_prompt: string;
  action_payload: Record<string, any>;
  status: ActionStatus;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: AICitation[];
  suggested_action?: AIActionResponse | null;
  created_at: string;
}

export interface AIConversationListItem {
  id: string;
  title: string;
  message_count: number;
  updated_at: string;
}

export interface AIConversationResponse {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ConfirmActionResponse {
  action_id: string;
  status: ActionStatus;
  message: string;
  result?: Record<string, any>;
}
