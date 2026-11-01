import React, { useState, useEffect } from 'react';
import {
  Heart,
  Shield,
  Activity,
  AlertTriangle,
  Pill,
  Plus,
  Phone,
  Hospital,
  FileText,
  User,
  Clock,
  Trash2,
  CheckCircle2,
  Calendar,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { healthService } from '../../services/healthService';
import {
  CreateAllergyPayload,
  CreateConditionPayload,
  CreateEmergencyContactPayload,
  CreateMedicinePayload,
  HealthProfile,
  HealthProfileListItem,
  UpdateVitalsPayload,
} from '../../types/health';
import { EditVitalsModal } from './EditVitalsModal';
import { AddConditionModal } from './AddConditionModal';
import { AddAllergyModal } from './AddAllergyModal';
import { AddMedicineModal } from './AddMedicineModal';
import { AddEmergencyContactModal } from './AddEmergencyContactModal';
import { EmergencyCardModal } from './EmergencyCardModal';

export const HealthShieldView: React.FC = () => {
  const [profileList, setProfileList] = useState<HealthProfileListItem[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<HealthProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isEditVitalsOpen, setIsEditVitalsOpen] = useState(false);
  const [isAddConditionOpen, setIsAddConditionOpen] = useState(false);
  const [isAddAllergyOpen, setIsAddAllergyOpen] = useState(false);
  const [isAddMedicineOpen, setIsAddMedicineOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const list = await healthService.listProfiles();
      setProfileList(list);
      if (list.length > 0) {
        const activeId = selectedProfileId || list[0].id;
        setSelectedProfileId(activeId);
        await loadProfileDetail(activeId);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load household health profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfileDetail = async (id: string) => {
    try {
      const detail = await healthService.getProfile(id);
      setCurrentProfile(detail);
    } catch (err: any) {
      console.error('Failed to load profile details:', err);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleSelectMember = async (profileId: string) => {
    setSelectedProfileId(profileId);
    await loadProfileDetail(profileId);
  };

  // Actions
  const handleUpdateVitals = async (payload: UpdateVitalsPayload) => {
    if (!selectedProfileId) return;
    await healthService.updateProfile(selectedProfileId, payload);
    await loadProfiles();
  };

  const handleAddCondition = async (payload: CreateConditionPayload) => {
    if (!selectedProfileId) return;
    await healthService.addCondition(selectedProfileId, payload);
    await loadProfileDetail(selectedProfileId);
  };

  const handleDeleteCondition = async (id: string) => {
    if (window.confirm('Delete this condition?')) {
      await healthService.deleteCondition(id);
      if (selectedProfileId) await loadProfileDetail(selectedProfileId);
    }
  };

  const handleAddAllergy = async (payload: CreateAllergyPayload) => {
    if (!selectedProfileId) return;
    await healthService.addAllergy(selectedProfileId, payload);
    await loadProfileDetail(selectedProfileId);
  };

  const handleDeleteAllergy = async (id: string) => {
    if (window.confirm('Delete this allergy record?')) {
      await healthService.deleteAllergy(id);
      if (selectedProfileId) await loadProfileDetail(selectedProfileId);
    }
  };

  const handleAddMedicine = async (payload: CreateMedicinePayload) => {
    if (!selectedProfileId) return;
    await healthService.addMedicine(selectedProfileId, payload);
    await loadProfileDetail(selectedProfileId);
  };

  const handleToggleMedicine = async (medId: string, currentActive: boolean) => {
    await healthService.toggleMedicineActive(medId, !currentActive);
    if (selectedProfileId) await loadProfileDetail(selectedProfileId);
  };

  const handleDeleteMedicine = async (id: string) => {
    if (window.confirm('Remove this medicine?')) {
      await healthService.deleteMedicine(id);
      if (selectedProfileId) await loadProfileDetail(selectedProfileId);
    }
  };

  const handleAddEmergencyContact = async (payload: CreateEmergencyContactPayload) => {
    if (!selectedProfileId) return;
    await healthService.addEmergencyContact(selectedProfileId, payload);
    await loadProfileDetail(selectedProfileId);
  };

  const handleDeleteContact = async (id: string) => {
    if (window.confirm('Delete this contact?')) {
      await healthService.deleteEmergencyContact(id);
      if (selectedProfileId) await loadProfileDetail(selectedProfileId);
    }
  };

  // Live BMI calculation
  const getBmi = () => {
    if (currentProfile?.height_cm && currentProfile?.weight_kg && currentProfile.height_cm > 0) {
      const hM = currentProfile.height_cm / 100;
      return (currentProfile.weight_kg / (hM * hM)).toFixed(1);
    }
    return null;
  };
  const bmiVal = getBmi();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Health Shield</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
              Active Module
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Centralized Family Medical Records, Medicine Schedules & Rapid Emergency Access
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadProfiles()}
            disabled={isLoading}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Health Records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* CRITICAL EMERGENCY MODE CTA BUTTON */}
          <button
            onClick={() => setIsEmergencyModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-200 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <span>Open Emergency Mode</span>
          </button>
        </div>
      </div>

      {/* Member Switcher Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {profileList.map((item) => {
          const isSelected = item.id === selectedProfileId;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectMember(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm ring-1 ring-rose-200'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isSelected ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.blood_group !== 'Unknown' ? item.blood_group : <User className="w-3 h-3" />}
              </div>
              <div className="text-left">
                <p className="font-semibold">{item.member_name}</p>
                <p className="text-[10px] text-slate-500 capitalize">{item.member_role}</p>
              </div>
              {item.has_life_threatening_allergy && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Life-threatening allergy" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Member Health Profile */}
      {currentProfile && (
        <div className="space-y-6">
          {/* Member Vitals Hero Banner */}
          <div className="bg-gradient-to-r from-white via-rose-50/20 to-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-100 flex flex-col items-center justify-center border border-rose-200 shadow-sm shrink-0">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Blood</span>
                <span className="text-xl font-black text-rose-700">{currentProfile.blood_group}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{currentProfile.member_name}</h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize">
                    {currentProfile.member_role}
                  </span>
                  {currentProfile.organ_donor && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                      Organ Donor
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                  <span>Height: <strong className="text-slate-800">{currentProfile.height_cm ? `${currentProfile.height_cm} cm` : '—'}</strong></span>
                  <span>Weight: <strong className="text-slate-800">{currentProfile.weight_kg ? `${currentProfile.weight_kg} kg` : '—'}</strong></span>
                  <span>BMI: <strong className="text-slate-800">{bmiVal ? `${bmiVal} kg/m²` : '—'}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditVitalsOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Activity className="w-3.5 h-3.5 text-rose-600" />
                <span>Edit Vitals & Baseline</span>
              </button>
            </div>
          </div>

          {/* Core Health Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Life-Threatening & Known Allergies */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="text-base font-bold text-slate-900">Allergies & Sensitivities</h3>
                </div>
                <button
                  onClick={() => setIsAddAllergyOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-colors border border-red-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Allergy</span>
                </button>
              </div>

              <div className="space-y-2">
                {currentProfile.allergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      allergy.is_life_threatening
                        ? 'bg-red-50/70 border-red-200 text-red-900'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold">{allergy.allergen}</strong>
                        {allergy.is_life_threatening && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-600 text-white">
                            Life Threatening
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                          {allergy.category}
                        </span>
                      </div>
                      {allergy.reaction_description && (
                        <p className="text-[11px] text-slate-600 mt-0.5">{allergy.reaction_description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteAllergy(allergy.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="Delete allergy"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {currentProfile.allergies.length === 0 && (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No allergies recorded. Click "Add Allergy" to add known drug or food sensitivities.
                  </p>
                )}
              </div>
            </div>

            {/* 2. Medical Conditions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-600" />
                  <h3 className="text-base font-bold text-slate-900">Medical Conditions</h3>
                </div>
                <button
                  onClick={() => setIsAddConditionOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition-colors border border-amber-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Condition</span>
                </button>
              </div>

              <div className="space-y-2">
                {currentProfile.conditions.map((cond) => (
                  <div
                    key={cond.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900">{cond.name}</strong>
                        {cond.is_critical && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Critical
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-700 capitalize">
                          {cond.status}
                        </span>
                      </div>
                      {cond.notes && <p className="text-[11px] text-slate-500 mt-0.5">{cond.notes}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteCondition(cond.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="Delete condition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {currentProfile.conditions.length === 0 && (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No medical conditions recorded. Click "Add Condition" to document chronic conditions.
                  </p>
                )}
              </div>
            </div>

            {/* 3. Medications & Schedule */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">Current Medications & Refill Schedule</h3>
                </div>
                <button
                  onClick={() => setIsAddMedicineOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold transition-colors border border-emerald-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Medicine</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentProfile.medicines.map((med) => (
                  <div
                    key={med.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      med.is_active ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{med.name}</h4>
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                            {med.dosage}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                          <span className="capitalize">{med.frequency.replace('_', ' ')}</span>
                          <span>•</span>
                          <span className="capitalize text-slate-700 font-medium">
                            {med.timing.replace('_', ' ')}
                          </span>
                          {med.approx_price !== undefined && med.approx_price !== null && med.approx_price > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[11px]">
                                ₹{med.approx_price.toLocaleString('en-IN')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleMedicine(med.id, med.is_active)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            med.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {med.is_active ? 'Active' : 'Paused'}
                        </button>
                        <button
                          onClick={() => handleDeleteMedicine(med.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {med.instructions && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {med.instructions}
                      </p>
                    )}

                    {med.refill_date && (
                      <div className="flex items-center justify-between text-xs text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Refill Due: <strong className="text-slate-800">{med.refill_date}</strong>
                        </span>
                        <span className="text-[11px] text-emerald-700 font-medium">
                          {med.approx_price ? `₹${med.approx_price.toLocaleString('en-IN')} • Sahay Daily` : 'Tracked in Sahay Daily'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {currentProfile.medicines.length === 0 && (
                  <div className="col-span-2 py-4 text-center text-xs text-slate-400">
                    No medications listed. Click "Add Medicine" to track prescriptions and refill schedules.
                  </div>
                )}
              </div>
            </div>

            {/* 4. Immediate Emergency Contacts */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-rose-600" />
                  <h3 className="text-base font-bold text-slate-900">Emergency Contacts</h3>
                </div>
                <button
                  onClick={() => setIsAddContactOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg text-xs font-semibold transition-colors border border-rose-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Contact</span>
                </button>
              </div>

              <div className="space-y-2">
                {currentProfile.emergency_contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900">{contact.name}</strong>
                        {contact.is_primary && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-600 text-white">
                            Primary
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">({contact.relationship})</span>
                      </div>
                      <p className="text-xs text-slate-700 font-mono mt-0.5">{contact.phone_number}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${contact.phone_number}`}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                      >
                        Call
                      </a>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {currentProfile.emergency_contacts.length === 0 && (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No emergency contacts added yet.
                  </p>
                )}
              </div>
            </div>

            {/* 5. Hospital & Insurance Details */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2">
                <Hospital className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Hospital & Insurance Desk</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Preferred Hospital / ER
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {currentProfile.preferred_hospital || 'Not specified'}
                  </p>
                  {currentProfile.preferred_doctor && (
                    <p className="text-xs text-slate-600 mt-1">
                      Doctor: {currentProfile.preferred_doctor} {currentProfile.doctor_phone && `(${currentProfile.doctor_phone})`}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Health Insurance Policy
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {currentProfile.insurance_provider || 'No provider listed'}
                  </p>
                  {currentProfile.insurance_policy_no && (
                    <p className="text-xs font-mono font-bold text-slate-700 mt-1">
                      Policy No: {currentProfile.insurance_policy_no}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {currentProfile && (
        <>
          <EditVitalsModal
            profile={currentProfile}
            isOpen={isEditVitalsOpen}
            onClose={() => setIsEditVitalsOpen(false)}
            onSave={handleUpdateVitals}
          />

          <AddConditionModal
            isOpen={isAddConditionOpen}
            onClose={() => setIsAddConditionOpen(false)}
            onAdd={handleAddCondition}
          />

          <AddAllergyModal
            isOpen={isAddAllergyOpen}
            onClose={() => setIsAddAllergyOpen(false)}
            onAdd={handleAddAllergy}
          />

          <AddMedicineModal
            isOpen={isAddMedicineOpen}
            onClose={() => setIsAddMedicineOpen(false)}
            onAdd={handleAddMedicine}
          />

          <AddEmergencyContactModal
            isOpen={isAddContactOpen}
            onClose={() => setIsAddContactOpen(false)}
            onAdd={handleAddEmergencyContact}
          />

          <EmergencyCardModal
            profileId={currentProfile.id}
            isOpen={isEmergencyModalOpen}
            onClose={() => setIsEmergencyModalOpen(false)}
          />
        </>
      )}
    </div>
  );
};
