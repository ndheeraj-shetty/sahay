import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.health import (
    AllergySeverity,
    BloodGroup,
    ConditionStatus,
    MedicineFrequency,
    MedicineTiming,
    ReportType,
)


class MedicalConditionBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    diagnosed_date: Optional[date] = None
    status: ConditionStatus = ConditionStatus.ACTIVE
    is_critical: bool = False
    notes: Optional[str] = None


class MedicalConditionCreate(MedicalConditionBase):
    pass


class MedicalConditionResponse(MedicalConditionBase):
    id: str
    health_profile_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AllergyBase(BaseModel):
    allergen: str = Field(..., min_length=2, max_length=150)
    category: str = "medication"
    severity: AllergySeverity = AllergySeverity.MODERATE
    reaction_description: Optional[str] = None
    is_life_threatening: bool = False


class AllergyCreate(AllergyBase):
    pass


class AllergyResponse(AllergyBase):
    id: str
    health_profile_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MedicineBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    dosage: str = Field(..., min_length=1, max_length=100)
    frequency: MedicineFrequency = MedicineFrequency.ONCE_DAILY
    timing: MedicineTiming = MedicineTiming.AFTER_FOOD
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    refill_date: Optional[date] = None
    prescribed_by_doctor: Optional[str] = None
    approx_price: Optional[float] = Field(0.0, ge=0.0)
    is_active: bool = True
    instructions: Optional[str] = None
    source_document_id: Optional[str] = None


class MedicineCreate(MedicineBase):
    create_refill_reminder: bool = True


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[MedicineFrequency] = None
    timing: Optional[MedicineTiming] = None
    end_date: Optional[date] = None
    refill_date: Optional[date] = None
    approx_price: Optional[float] = Field(None, ge=0.0)
    is_active: Optional[bool] = None
    instructions: Optional[str] = None


class MedicineResponse(MedicineBase):
    id: str
    health_profile_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HealthReportBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    report_type: ReportType = ReportType.LAB_TEST
    test_date: Optional[date] = None
    lab_or_hospital_name: Optional[str] = None
    summary_findings: Optional[str] = None
    is_abnormal: bool = False
    source_document_id: Optional[str] = None


class HealthReportCreate(HealthReportBase):
    pass


class HealthReportResponse(HealthReportBase):
    id: str
    health_profile_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmergencyContactBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    relationship: str = Field(..., min_length=2, max_length=50)
    phone_number: str = Field(..., min_length=5, max_length=30)
    alternate_phone: Optional[str] = None
    is_primary: bool = False


class EmergencyContactCreate(EmergencyContactBase):
    pass


class EmergencyContactResponse(EmergencyContactBase):
    id: str
    health_profile_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HealthProfileBase(BaseModel):
    blood_group: BloodGroup = BloodGroup.UNKNOWN
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    preferred_hospital: Optional[str] = None
    preferred_doctor: Optional[str] = None
    doctor_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_policy_no: Optional[str] = None
    organ_donor: bool = False
    notes: Optional[str] = None


class HealthProfileCreate(HealthProfileBase):
    member_id: str


class HealthProfileUpdate(BaseModel):
    blood_group: Optional[BloodGroup] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    preferred_hospital: Optional[str] = None
    preferred_doctor: Optional[str] = None
    doctor_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_policy_no: Optional[str] = None
    organ_donor: Optional[bool] = None
    notes: Optional[str] = None


class HealthProfileListItem(BaseModel):
    id: str
    member_id: str
    member_name: str
    member_role: str
    blood_group: BloodGroup
    active_conditions_count: int
    allergies_count: int
    active_medicines_count: int
    has_life_threatening_allergy: bool
    preferred_hospital: Optional[str] = None
    insurance_provider: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class HealthProfileResponse(HealthProfileBase):
    id: str
    household_id: str
    member_id: str
    member_name: Optional[str] = None
    member_role: Optional[str] = None
    conditions: List[MedicalConditionResponse] = []
    allergies: List[AllergyResponse] = []
    medicines: List[MedicineResponse] = []
    reports: List[HealthReportResponse] = []
    emergency_contacts: List[EmergencyContactResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmergencyCardResponse(BaseModel):
    health_profile_id: str
    patient_name: str
    relationship_role: str
    blood_group: BloodGroup
    organ_donor: bool
    life_threatening_allergies: List[AllergyResponse]
    critical_conditions: List[MedicalConditionResponse]
    current_medications: List[MedicineResponse]
    emergency_contacts: List[EmergencyContactResponse]
    preferred_hospital: Optional[str] = None
    preferred_doctor: Optional[str] = None
    doctor_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_policy_no: Optional[str] = None
    generated_at: datetime


class EmergencyShareCreate(BaseModel):
    validity_hours: int = Field(default=24, ge=1, le=168)  # Up to 7 days


class EmergencyShareResponse(BaseModel):
    id: str
    share_token: str
    public_url: str
    expires_at: datetime
    is_active: bool
    access_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
