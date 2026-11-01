import React, { useState } from 'react';
import { X, Heart, Shield, Activity } from 'lucide-react';
import { BloodGroup, HealthProfile, UpdateVitalsPayload } from '../../types/health';

interface EditVitalsModalProps {
  profile: HealthProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: UpdateVitalsPayload) => Promise<void>;
}

export const EditVitalsModal: React.FC<EditVitalsModalProps> = ({
  profile,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(profile.blood_group);
  const [heightCm, setHeightCm] = useState<number | ''>(profile.height_cm || '');
  const [weightKg, setWeightKg] = useState<number | ''>(profile.weight_kg || '');
  const [preferredHospital, setPreferredHospital] = useState(profile.preferred_hospital || '');
  const [preferredDoctor, setPreferredDoctor] = useState(profile.preferred_doctor || '');
  const [doctorPhone, setDoctorPhone] = useState(profile.doctor_phone || '');
  const [insuranceProvider, setInsuranceProvider] = useState(profile.insurance_provider || '');
  const [insurancePolicyNo, setInsurancePolicyNo] = useState(profile.insurance_policy_no || '');
  const [organDonor, setOrganDonor] = useState(profile.organ_donor);
  const [notes, setNotes] = useState(profile.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live BMI calculation
  const calculateBmi = () => {
    if (heightCm && weightKg && heightCm > 0) {
      const heightM = Number(heightCm) / 100;
      return (Number(weightKg) / (heightM * heightM)).toFixed(1);
    }
    return null;
  };
  const bmi = calculateBmi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        blood_group: bloodGroup,
        height_cm: heightCm === '' ? undefined : Number(heightCm),
        weight_kg: weightKg === '' ? undefined : Number(weightKg),
        preferred_hospital: preferredHospital || undefined,
        preferred_doctor: preferredDoctor || undefined,
        doctor_phone: doctorPhone || undefined,
        insurance_provider: insuranceProvider || undefined,
        insurance_policy_no: insurancePolicyNo || undefined,
        organ_donor: organDonor,
        notes: notes || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update vitals');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Health Vitals & Baseline</h3>
              <p className="text-xs text-slate-500">{profile.member_name} ({profile.member_role})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Blood Group *
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-rose-700 bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Unknown">Unknown</option>
                <option value="A+">A+ (A Positive)</option>
                <option value="A-">A- (A Negative)</option>
                <option value="B+">B+ (B Positive)</option>
                <option value="B-">B- (B Negative)</option>
                <option value="AB+">AB+ (AB Positive)</option>
                <option value="AB-">AB- (AB Negative)</option>
                <option value="O+">O+ (O Positive)</option>
                <option value="O-">O- (O Negative)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Organ Donor
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="organDonor"
                  checked={organDonor}
                  onChange={(e) => setOrganDonor(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <label htmlFor="organDonor" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Registered Organ Donor
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="175"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="70"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Calculated BMI
              </label>
              <div className="px-3 py-2 border border-slate-100 rounded-lg bg-slate-50 text-sm font-semibold text-slate-800">
                {bmi ? `${bmi} kg/m²` : '—'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Preferred Hospital / ER
              </label>
              <input
                type="text"
                placeholder="e.g. Lilavati Hospital, Mumbai"
                value={preferredHospital}
                onChange={(e) => setPreferredHospital(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Primary Doctor
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. A. K. Verma"
                value={preferredDoctor}
                onChange={(e) => setPreferredDoctor(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Doctor Emergency Phone Number
            </label>
            <input
              type="tel"
              placeholder="+91 98200 12345"
              value={doctorPhone}
              onChange={(e) => setDoctorPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Health Insurance Provider
              </label>
              <input
                type="text"
                placeholder="e.g. Star Health / HDFC ERGO"
                value={insuranceProvider}
                onChange={(e) => setInsuranceProvider(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Insurance Policy Number
              </label>
              <input
                type="text"
                placeholder="e.g. POL-94819281-2026"
                value={insurancePolicyNo}
                onChange={(e) => setInsurancePolicyNo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              General Medical Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Prior appendectomy (2018), wears glasses, pacemaker status"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Vitals'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
