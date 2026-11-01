import { apiClient } from './api';
import { DocumentCategory, DocumentResponse } from '../types/vault';

export const vaultService = {
  uploadDocument: async (formData: FormData): Promise<DocumentResponse> => {
    const { data } = await apiClient.post<DocumentResponse>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  listDocuments: async (params?: {
    category?: DocumentCategory;
    member_id?: string;
    search?: string;
  }): Promise<DocumentResponse[]> => {
    const { data } = await apiClient.get<DocumentResponse[]>('/documents', { params });
    return data;
  },

  getDocument: async (documentId: string): Promise<DocumentResponse> => {
    const { data } = await apiClient.get<DocumentResponse>(`/documents/${documentId}`);
    return data;
  },

  downloadDocument: async (documentId: string, filename: string): Promise<void> => {
    const response = await apiClient.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  deleteDocument: async (documentId: string): Promise<void> => {
    await apiClient.delete(`/documents/${documentId}`);
  },

  requestAccess: async (documentId: string, reason?: string): Promise<void> => {
    await apiClient.post(`/documents/${documentId}/request-access`, { reason });
  },

  approveRequest: async (documentId: string, requestId: string): Promise<void> => {
    await apiClient.post(`/documents/${documentId}/approve-request/${requestId}`);
  },
};
