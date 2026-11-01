import axios from 'axios';
import { HealthResponse, SystemStatusResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Attach Authorization and Active Household headers
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sahay_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const householdId = localStorage.getItem('sahay_active_household_id');
  if (householdId) {
    config.headers['X-Household-ID'] = householdId;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect if we're on login or health check
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('sahay_access_token');
      }
    }
    return Promise.reject(error);
  }
);

export const systemService = {
  getHealth: async (): Promise<HealthResponse> => {
    const { data } = await apiClient.get<HealthResponse>('/health');
    return data;
  },
  getStatus: async (): Promise<SystemStatusResponse> => {
    const { data } = await apiClient.get<SystemStatusResponse>('/status');
    return data;
  },
};
