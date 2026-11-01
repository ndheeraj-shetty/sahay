import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { Obligation, SnoozePayload } from '../../types/daily';

interface SnoozeModalProps {
  obligation: Obligation | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (obligationId: string, payload: SnoozePayload) => Promise<void>;
}

export const SnoozeModal: React.FC<SnoozeModalProps> = ({
  obligation,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !obligation) return null;

  const [selectedDays, setSelectedDays] = useState<number>(3);
  const [customDate, setCustomDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(obligation.id, {
        snooze_days: customDate ? undefined : selectedDays,
        snooze_until: customDate || undefined,
        reason: reason || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to snooze obligation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-purple-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Snooze Obligation</h3>
              <p className="text-xs text-slate-500">{obligation.title}</p>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Quick Snooze
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '+1 Day', days: 1 },
                { label: '+3 Days', days: 3 },
                { label: '+7 Days (1 Wk)', days: 7 },
              ].map((item) => (
                <button
                  type="button"
                  key={item.days}
                  onClick={() => {
                    setSelectedDays(item.days);
                    setCustomDate('');
                  }}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                    !customDate && selectedDays === item.days
                      ? 'border-purple-600 bg-purple-50 text-purple-700 font-semibold shadow-sm'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Or pick specific date
            </label>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reason / Reminder Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Salary credited on 5th, will pay then"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
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
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Snoozing...' : 'Snooze'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
