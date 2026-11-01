import { apiClient } from './api';
import {
  Allergy,
  CreateAllergyPayload,
  CreateConditionPayload,
  CreateEmergencyContactPayload,
  CreateMedicinePayload,
  EmergencyCardData,
  EmergencyContact,
  EmergencyShareData,
  HealthProfile,
  HealthProfileListItem,
  MedicalCondition,
  Medicine,
  UpdateVitalsPayload,
} from '../types/health';

export const healthService = {
  listProfiles: async (): Promise<HealthProfileListItem[]> => {
    const { data } = await apiClient.get<HealthProfileListItem[]>('/health-shield/profiles');
    return data;
  },

  getProfile: async (profileId: string): Promise<HealthProfile> => {
    const { data } = await apiClient.get<HealthProfile>(`/health-shield/profiles/${profileId}`);
    return data;
  },

  updateProfile: async (profileId: string, payload: UpdateVitalsPayload): Promise<HealthProfile> => {
    const { data } = await apiClient.patch<HealthProfile>(`/health-shield/profiles/${profileId}`, payload);
    return data;
  },

  addCondition: async (profileId: string, payload: CreateConditionPayload): Promise<MedicalCondition> => {
    const { data } = await apiClient.post<MedicalCondition>(
      `/health-shield/profiles/${profileId}/conditions`,
      payload
    );
    return data;
  },

  deleteCondition: async (conditionId: string): Promise<void> => {
    await apiClient.delete(`/health-shield/conditions/${conditionId}`);
  },

  addAllergy: async (profileId: string, payload: CreateAllergyPayload): Promise<Allergy> => {
    const { data } = await apiClient.post<Allergy>(
      `/health-shield/profiles/${profileId}/allergies`,
      payload
    );
    return data;
  },

  deleteAllergy: async (allergyId: string): Promise<void> => {
    await apiClient.delete(`/health-shield/allergies/${allergyId}`);
  },

  addMedicine: async (profileId: string, payload: CreateMedicinePayload): Promise<Medicine> => {
    const { data } = await apiClient.post<Medicine>(
      `/health-shield/profiles/${profileId}/medicines`,
      payload
    );
    return data;
  },

  toggleMedicineActive: async (medicineId: string, isActive: boolean): Promise<Medicine> => {
    const { data } = await apiClient.patch<Medicine>(`/health-shield/medicines/${medicineId}`, {
      is_active: isActive,
    });
    return data;
  },

  deleteMedicine: async (medicineId: string): Promise<void> => {
    await apiClient.delete(`/health-shield/medicines/${medicineId}`);
  },

  addEmergencyContact: async (
    profileId: string,
    payload: CreateEmergencyContactPayload
  ): Promise<EmergencyContact> => {
    const { data } = await apiClient.post<EmergencyContact>(
      `/health-shield/profiles/${profileId}/emergency-contacts`,
      payload
    );
    return data;
  },

  deleteEmergencyContact: async (contactId: string): Promise<void> => {
    await apiClient.delete(`/health-shield/emergency-contacts/${contactId}`);
  },

  getEmergencyCard: async (profileId: string): Promise<EmergencyCardData> => {
    const { data } = await apiClient.get<EmergencyCardData>(
      `/health-shield/profiles/${profileId}/emergency-card`
    );
    return data;
  },

  createEmergencyShare: async (
    profileId: string,
    validityHours: number = 24
  ): Promise<EmergencyShareData> => {
    const { data } = await apiClient.post<EmergencyShareData>(
      `/health-shield/profiles/${profileId}/emergency-share`,
      { validity_hours: validityHours }
    );
    return data;
  },

  revokeEmergencyShare: async (shareId: string): Promise<void> => {
    await apiClient.post(`/health-shield/emergency-shares/${shareId}/revoke`);
  },

  getPublicEmergencyCard: async (shareToken: string): Promise<EmergencyCardData> => {
    const { data } = await apiClient.get<EmergencyCardData>(
      `/health-shield/emergency/${shareToken}`
    );
    return data;
  },
};
