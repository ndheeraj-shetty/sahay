export type BloodGroup =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-'
  | 'Unknown';

export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'life_threatening';

export type ConditionStatus = 'active' | 'managed' | 'in_remission' | 'resolved';

export type MedicineFrequency =
  | 'once_daily'
  | 'twice_daily'
  | 'thrice_daily'
  | 'four_times_daily'
  | 'as_needed'
  | 'weekly';

export type MedicineTiming =
  | 'before_food'
  | 'after_food'
  | 'with_food'
  | 'empty_stomach'
  | 'bedtime'
  | 'anytime';

export type ReportType =
  | 'lab_test'
  | 'prescription'
  | 'radiology'
  | 'discharge_summary'
  | 'vaccination'
  | 'other';

export interface MedicalCondition {
  id: string;
  health_profile_id: string;
  name: string;
  diagnosed_date?: string;
  status: ConditionStatus;
  is_critical: boolean;
  notes?: string;
  created_at: string;
}

export interface Allergy {
  id: string;
  health_profile_id: string;
  allergen: string;
  category: string;
  severity: AllergySeverity;
  reaction_description?: string;
  is_life_threatening: boolean;
  created_at: string;
}

export interface Medicine {
  id: string;
  health_profile_id: string;
  name: string;
  dosage: string;
  frequency: MedicineFrequency;
  timing: MedicineTiming;
  start_date?: string;
  end_date?: string;
  refill_date?: string;
  prescribed_by_doctor?: string;
  approx_price?: number | null;
  is_active: boolean;
  instructions?: string;
  source_document_id?: string;
  created_at: string;
}

export interface HealthReport {
  id: string;
  health_profile_id: string;
  title: string;
  report_type: ReportType;
  test_date?: string;
  lab_or_hospital_name?: string;
  summary_findings?: string;
  is_abnormal: boolean;
  source_document_id?: string;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  health_profile_id: string;
  name: string;
  relationship: string;
  phone_number: string;
  alternate_phone?: string;
  is_primary: boolean;
  created_at: string;
}

export interface HealthProfileListItem {
  id: string;
  member_id: string;
  member_name: string;
  member_role: string;
  blood_group: BloodGroup;
  active_conditions_count: number;
  allergies_count: number;
  active_medicines_count: number;
  has_life_threatening_allergy: boolean;
  preferred_hospital?: string;
  insurance_provider?: string;
}

export interface HealthProfile {
  id: string;
  household_id: string;
  member_id: string;
  member_name: string;
  member_role: string;
  blood_group: BloodGroup;
  height_cm?: number;
  weight_kg?: number;
  preferred_hospital?: string;
  preferred_doctor?: string;
  doctor_phone?: string;
  insurance_provider?: string;
  insurance_policy_no?: string;
  organ_donor: boolean;
  notes?: string;
  conditions: MedicalCondition[];
  allergies: Allergy[];
  medicines: Medicine[];
  reports: HealthReport[];
  emergency_contacts: EmergencyContact[];
  created_at: string;
  updated_at: string;
}

export interface EmergencyCardData {
  health_profile_id: string;
  patient_name: string;
  relationship_role: string;
  blood_group: BloodGroup;
  organ_donor: boolean;
  life_threatening_allergies: Allergy[];
  critical_conditions: MedicalCondition[];
  current_medications: Medicine[];
  emergency_contacts: EmergencyContact[];
  preferred_hospital?: string;
  preferred_doctor?: string;
  doctor_phone?: string;
  insurance_provider?: string;
  insurance_policy_no?: string;
  generated_at: string;
}

export interface EmergencyShareData {
  id: string;
  share_token: string;
  public_url: string;
  expires_at: string;
  is_active: boolean;
  access_count: number;
  created_at: string;
}

export interface UpdateVitalsPayload {
  blood_group?: BloodGroup;
  height_cm?: number;
  weight_kg?: number;
  preferred_hospital?: string;
  preferred_doctor?: string;
  doctor_phone?: string;
  insurance_provider?: string;
  insurance_policy_no?: string;
  organ_donor?: boolean;
  notes?: string;
}

export interface CreateConditionPayload {
  name: string;
  diagnosed_date?: string;
  status?: ConditionStatus;
  is_critical?: boolean;
  notes?: string;
}

export interface CreateAllergyPayload {
  allergen: string;
  category?: string;
  severity?: AllergySeverity;
  reaction_description?: string;
  is_life_threatening?: boolean;
}

export interface CreateMedicinePayload {
  name: string;
  dosage: string;
  frequency?: MedicineFrequency;
  timing?: MedicineTiming;
  start_date?: string;
  end_date?: string;
  refill_date?: string;
  prescribed_by_doctor?: string;
  approx_price?: number;
  instructions?: string;
  create_refill_reminder?: boolean;
}

export interface CreateEmergencyContactPayload {
  name: string;
  relationship: string;
  phone_number: string;
  alternate_phone?: string;
  is_primary?: boolean;
}
