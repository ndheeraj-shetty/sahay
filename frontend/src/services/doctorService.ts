import { apiClient } from './api';
import {
  DocumentDoctorJobResponse,
  FinancialEventResponse,
  DocumentCompareResponse,
} from '../types/vault';

export const doctorService = {
  getResults: async (documentId: string): Promise<DocumentDoctorJobResponse> => {
    const { data } = await apiClient.get<DocumentDoctorJobResponse>(
      `/document-doctor/results/${documentId}`
    );
    return data;
  },

  verifyDocument: async (
    documentId: string,
    payload: {
      confirmed_fields: { field_name: string; confirmed_value?: string | null }[];
      confirm_as_obligation?: boolean;
    }
  ): Promise<DocumentDoctorJobResponse> => {
    const { data } = await apiClient.post<DocumentDoctorJobResponse>(
      `/document-doctor/verify/${documentId}`,
      payload
    );
    return data;
  },

  parseFinancialEvent: async (smsText: string): Promise<FinancialEventResponse> => {
    const { data } = await apiClient.post<FinancialEventResponse>(
      '/document-doctor/financial-event',
      { sms_or_alert_text: smsText }
    );
    return data;
  },

  compareDocuments: async (
    baselineDocumentId: string,
    updatedDocumentId: string
  ): Promise<DocumentCompareResponse> => {
    const { data } = await apiClient.post<DocumentCompareResponse>(
      '/document-doctor/compare',
      {
        baseline_document_id: baselineDocumentId,
        updated_document_id: updatedDocumentId,
      }
    );
    return data;
  },
};
