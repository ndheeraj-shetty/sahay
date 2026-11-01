export type ActionType =
  | 'create_obligation'
  | 'mark_paid'
  | 'add_goal_contribution'
  | 'add_allergy'
  | 'add_medicine'
  | 'custom';

export type ActionStatus = 'pending' | 'confirmed' | 'rejected' | 'executed' | 'failed';

export interface AICitation {
  source_type: 'document' | 'obligation' | 'health' | 'goal' | string;
  source_id: string;
  title: string;
  snippet: string;
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
