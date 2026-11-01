import { apiClient } from './api';
import {
  CalendarViewData,
  CreateObligationPayload,
  MarkPaidPayload,
  MoneyViewData,
  Obligation,
  SnoozePayload,
  TodayViewData,
  UpdateMoneyProfilePayload,
} from '../types/daily';

export const dailyService = {
  getTodayView: async (): Promise<TodayViewData> => {
    const { data } = await apiClient.get<TodayViewData>('/sahay-daily/today');
    return data;
  },

  getCalendarView: async (params?: {
    month?: number;
    year?: number;
    member_id?: string;
    category?: string;
  }): Promise<CalendarViewData> => {
    const { data } = await apiClient.get<CalendarViewData>('/sahay-daily/calendar', { params });
    return data;
  },

  getMoneyView: async (params?: {
    month?: number;
    year?: number;
  }): Promise<MoneyViewData> => {
    const { data } = await apiClient.get<MoneyViewData>('/sahay-daily/money', { params });
    return data;
  },

  listObligations: async (params?: {
    status?: string;
    obligation_type?: string;
    member_id?: string;
  }): Promise<Obligation[]> => {
    const { data } = await apiClient.get<Obligation[]>('/sahay-daily/obligations', { params });
    return data;
  },

  createObligation: async (payload: CreateObligationPayload): Promise<Obligation> => {
    const { data } = await apiClient.post<Obligation>('/sahay-daily/obligations', payload);
    return data;
  },

  markPaid: async (obligationId: string, payload: MarkPaidPayload): Promise<Obligation> => {
    const { data } = await apiClient.post<Obligation>(
      `/sahay-daily/obligations/${obligationId}/mark-paid`,
      payload
    );
    return data;
  },

  snooze: async (obligationId: string, payload: SnoozePayload): Promise<Obligation> => {
    const { data } = await apiClient.post<Obligation>(
      `/sahay-daily/obligations/${obligationId}/snooze`,
      payload
    );
    return data;
  },

  deleteObligation: async (obligationId: string): Promise<void> => {
    await apiClient.delete(`/sahay-daily/obligations/${obligationId}`);
  },

  updateMoneyProfile: async (
    payload: UpdateMoneyProfilePayload
  ): Promise<{ message: string; expected_monthly_income: number; planned_monthly_savings: number }> => {
    const { data } = await apiClient.post('/sahay-daily/money-profile', payload);
    return data;
  },
};
