import { apiClient } from './api';
import {
  AddContributionPayload,
  AddContributorPayload,
  AddWithdrawalPayload,
  CreateGoalPayload,
  GoalContribution,
  GoalContributor,
  GoalDetail,
  GoalListItem,
  GoalRiskAnalysis,
  GoalWithdrawal,
  LakshyaOverview,
} from '../types/lakshya';

export const lakshyaService = {
  getOverview: async (): Promise<LakshyaOverview> => {
    const { data } = await apiClient.get<LakshyaOverview>('/lakshya/overview');
    return data;
  },

  listGoals: async (params?: { category?: string; status?: string }): Promise<GoalListItem[]> => {
    const { data } = await apiClient.get<GoalListItem[]>('/lakshya/goals', { params });
    return data;
  },

  getGoal: async (goalId: string): Promise<GoalDetail> => {
    const { data } = await apiClient.get<GoalDetail>(`/lakshya/goals/${goalId}`);
    return data;
  },

  createGoal: async (payload: CreateGoalPayload): Promise<GoalDetail> => {
    const { data } = await apiClient.post<GoalDetail>('/lakshya/goals', payload);
    return data;
  },

  updateGoal: async (goalId: string, payload: Partial<CreateGoalPayload>): Promise<GoalDetail> => {
    const { data } = await apiClient.patch<GoalDetail>(`/lakshya/goals/${goalId}`, payload);
    return data;
  },

  deleteGoal: async (goalId: string): Promise<void> => {
    await apiClient.delete(`/lakshya/goals/${goalId}`);
  },

  addContributor: async (
    goalId: string,
    payload: AddContributorPayload
  ): Promise<GoalContributor> => {
    const { data } = await apiClient.post<GoalContributor>(
      `/lakshya/goals/${goalId}/contributors`,
      payload
    );
    return data;
  },

  removeContributor: async (contributorId: string): Promise<void> => {
    await apiClient.delete(`/lakshya/contributors/${contributorId}`);
  },

  recordContribution: async (
    goalId: string,
    payload: AddContributionPayload
  ): Promise<GoalContribution> => {
    const { data } = await apiClient.post<GoalContribution>(
      `/lakshya/goals/${goalId}/contributions`,
      payload
    );
    return data;
  },

  recordWithdrawal: async (
    goalId: string,
    payload: AddWithdrawalPayload
  ): Promise<GoalWithdrawal> => {
    const { data } = await apiClient.post<GoalWithdrawal>(
      `/lakshya/goals/${goalId}/withdrawals`,
      payload
    );
    return data;
  },

  getRiskAnalysis: async (goalId: string): Promise<GoalRiskAnalysis> => {
    const { data } = await apiClient.get<GoalRiskAnalysis>(`/lakshya/goals/${goalId}/risk`);
    return data;
  },
};
