import { apiClient } from './api';
import {
  AIConversationListItem,
  AIConversationResponse,
  ChatMessage,
  ConfirmActionResponse,
} from '../types/ai';

export const aiService = {
  sendChatMessage: async (
    query: string,
    conversationId?: string
  ): Promise<ChatMessage> => {
    const { data } = await apiClient.post<ChatMessage>('/ai/chat', {
      query,
      conversation_id: conversationId || undefined,
    });
    return data;
  },

  listConversations: async (): Promise<AIConversationListItem[]> => {
    const { data } = await apiClient.get<AIConversationListItem[]>('/ai/conversations');
    return data;
  },

  getConversation: async (conversationId: string): Promise<AIConversationResponse> => {
    const { data } = await apiClient.get<AIConversationResponse>(
      `/ai/conversations/${conversationId}`
    );
    return data;
  },

  deleteConversation: async (conversationId: string): Promise<void> => {
    await apiClient.delete(`/ai/conversations/${conversationId}`);
  },

  confirmAction: async (
    actionId: string,
    confirmed: boolean
  ): Promise<ConfirmActionResponse> => {
    const { data } = await apiClient.post<ConfirmActionResponse>('/ai/actions/confirm', {
      action_id: actionId,
      confirmed,
    });
    return data;
  },
};
