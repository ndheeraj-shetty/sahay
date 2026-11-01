import React, { useState } from 'react';
import { X, Activity, Sparkles } from 'lucide-react';
import { ConditionStatus, CreateConditionPayload } from '../../types/health';

interface AddConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (payload: CreateConditionPayload) => Promise<void>;
}

const COMMON_PRESETS = [
  { name: 'Type 2 Diabetes Mellitus', status: 'managed' as ConditionStatus, is_critical: true },
  { name: 'Hypertension (High BP)', status: 'managed' as ConditionStatus, is_critical: true },
  { name: 'Bronchial Asthma', status: 'active' as ConditionStatus, is_critical: true },
  { name: 'Hypothyroidism', status: 'managed' as ConditionStatus, is_critical: false },
  { name: 'Hypercholesterolemia', status: 'managed' as ConditionStatus, is_critical: false },
  { name: 'Osteoarthritis', status: 'managed' as ConditionStatus, is_critical: false },
];

export const AddConditionModal: React.FC<AddConditionModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [diagnosedDate, setDiagnosedDate] = useState('');
  const [status, setStatus] = useState<ConditionStatus>('active');
  const [isCritical, setIsCritical] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: typeof COMMON_PRESETS[0]) => {
    setName(preset.name);
    setStatus(preset.status);
    setIsCritical(preset.is_critical);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a medical condition name.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onAdd({
        name: name.trim(),
        diagnosed_date: diagnosedDate || undefined,
        status,
        is_critical: isCritical,
        notes: notes || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to add medical condition');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Add Medical Condition</h3>
              <p className="text-xs text-slate-500">Record chronic or diagnosed health condition</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {/* Presets */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Common Family Conditions</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 text-slate-700 transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Condition Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Type 2 Diabetes, Bronchial Asthma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ConditionStatus)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="active">Active</option>
                <option value="managed">Managed / Under Control</option>
                <option value="in_remission">In Remission</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Diagnosed Date
              </label>
              <input
                type="date"
                value={diagnosedDate}
                onChange={(e) => setDiagnosedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl flex items-start gap-2.5">
            <input
              type="checkbox"
              id="isCritical"
              checked={isCritical}
              onChange={(e) => setIsCritical(e.target.checked)}
              className="mt-0.5 rounded text-red-600 focus:ring-red-500 w-4 h-4"
            />
            <label htmlFor="isCritical" className="text-xs text-slate-700">
              <strong className="text-red-900">Critical Emergency Flag</strong>
              <p className="text-red-700 text-[11px] mt-0.5">
                Displays prominently on the Emergency Card so ER doctors or paramedics are notified immediately.
              </p>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Notes & History (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Under medication since 2021, monitored quarterly"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Condition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
