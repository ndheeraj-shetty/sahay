import React, { useState } from 'react';
import { X, Pill, Sparkles, Calendar, Clock } from 'lucide-react';
import {
  CreateMedicinePayload,
  MedicineFrequency,
  MedicineTiming,
} from '../../types/health';

interface AddMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (payload: CreateMedicinePayload) => Promise<void>;
}

const MEDICINE_PRESETS = [
  {
    name: 'Metformin Hydrochloride',
    dosage: '500 mg',
    frequency: 'twice_daily' as MedicineFrequency,
    timing: 'after_food' as MedicineTiming,
    approxPrice: 145,
    instructions: 'Take 1 tab after breakfast & dinner for diabetes management',
  },
  {
    name: 'Telmisartan (Telma)',
    dosage: '40 mg',
    frequency: 'once_daily' as MedicineFrequency,
    timing: 'before_food' as MedicineTiming,
    approxPrice: 120,
    instructions: 'Take 1 tab every morning for blood pressure control',
  },
  {
    name: 'Atorvastatin (Atorva)',
    dosage: '10 mg',
    frequency: 'once_daily' as MedicineFrequency,
    timing: 'bedtime' as MedicineTiming,
    approxPrice: 180,
    instructions: 'Take 1 tab at night for lipid/cholesterol management',
  },
  {
    name: 'Thyronorm',
    dosage: '50 mcg',
    frequency: 'once_daily' as MedicineFrequency,
    timing: 'empty_stomach' as MedicineTiming,
    approxPrice: 110,
    instructions: 'Take early morning on an empty stomach with a glass of water',
  },
  {
    name: 'Pantocid DSR',
    dosage: '40 mg',
    frequency: 'once_daily' as MedicineFrequency,
    timing: 'before_food' as MedicineTiming,
    approxPrice: 160,
    instructions: 'Take 30 minutes before breakfast for acidity/reflux',
  },
];

export const AddMedicineModal: React.FC<AddMedicineModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  if (!isOpen) return null;

  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<MedicineFrequency>('once_daily');
  const [timing, setTiming] = useState<MedicineTiming>('after_food');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [refillDate, setRefillDate] = useState(in30Days);
  const [approxPrice, setApproxPrice] = useState<string>('150');
  const [doctor, setDoctor] = useState('');
  const [instructions, setInstructions] = useState('');
  const [createRefillReminder, setCreateRefillReminder] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: typeof MEDICINE_PRESETS[0]) => {
    setName(preset.name);
    setDosage(preset.dosage);
    setFrequency(preset.frequency);
    setTiming(preset.timing);
    setInstructions(preset.instructions);
    if (preset.approxPrice) {
      setApproxPrice(preset.approxPrice.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim()) {
      setError('Please provide medicine name and dosage.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onAdd({
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        timing,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        refill_date: refillDate || undefined,
        approx_price: approxPrice ? parseFloat(approxPrice) : undefined,
        prescribed_by_doctor: doctor || undefined,
        instructions: instructions || undefined,
        create_refill_reminder: createRefillReminder && !!refillDate,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to add medicine');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Add Medicine & Schedule</h3>
              <p className="text-xs text-slate-500">Track dosage, times, instructions & refills</p>
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

          {/* Presets */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Common Prescriptions</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MEDICINE_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 text-slate-700 transition-colors"
                >
                  {p.name} ({p.dosage})
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Medicine Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Metformin, Telmisartan, Dolo 650"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Dosage *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 500 mg, 1 tab"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as MedicineFrequency)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="once_daily">Once Daily (1x)</option>
                <option value="twice_daily">Twice Daily (2x)</option>
                <option value="thrice_daily">Thrice Daily (3x)</option>
                <option value="four_times_daily">Four Times Daily (4x)</option>
                <option value="weekly">Weekly</option>
                <option value="as_needed">As Needed (SOS)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Timing
              </label>
              <select
                value={timing}
                onChange={(e) => setTiming(e.target.value as MedicineTiming)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="after_food">After Food / Meal</option>
                <option value="before_food">Before Food / 30 mins before</option>
                <option value="empty_stomach">Empty Stomach (Morning)</option>
                <option value="with_food">With Food</option>
                <option value="bedtime">Bedtime / Night</option>
                <option value="anytime">Anytime</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Refill Date
              </label>
              <input
                type="date"
                value={refillDate}
                onChange={(e) => setRefillDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Approx Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 150"
                value={approxPrice}
                onChange={(e) => setApproxPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Prescribing Doctor / Hospital
            </label>
            <input
              type="text"
              placeholder="e.g. Dr. R. K. Joshi, Apollo Hospital"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Instructions
            </label>
            <input
              type="text"
              placeholder="e.g. Take with warm water, avoid dairy for 1 hour"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-start gap-2.5">
            <input
              type="checkbox"
              id="createRefillReminder"
              checked={createRefillReminder}
              onChange={(e) => setCreateRefillReminder(e.target.checked)}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <label htmlFor="createRefillReminder" className="text-xs text-slate-700">
              <strong className="text-emerald-900">Auto-create Refill Reminder in Sahay Daily</strong>
              <p className="text-emerald-800 text-[11px] mt-0.5">
                Automatically adds a pharmacy refill reminder task to Today & Calendar views when this batch runs low.
              </p>
            </label>
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
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
