import React, { useState } from 'react';
import { X, CheckCircle2, IndianRupee } from 'lucide-react';
import { Obligation, MarkPaidPayload } from '../../types/daily';

interface MarkPaidModalProps {
  obligation: Obligation | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (obligationId: string, payload: MarkPaidPayload) => Promise<void>;
}

export const MarkPaidModal: React.FC<MarkPaidModalProps> = ({
  obligation,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !obligation) return null;

  const [paidAmount, setPaidAmount] = useState<number>(obligation.amount);
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [createNextCycle, setCreateNextCycle] = useState<boolean>(obligation.recurrence !== 'none');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(obligation.id, {
        paid_amount: Number(paidAmount),
        payment_method: paymentMethod,
        payment_reference: paymentReference || undefined,
        create_next_recurrence: createNextCycle,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Record Payment</h3>
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Amount Paid (₹)
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="number"
                step="0.01"
                required
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['UPI', 'Netbanking', 'Card', 'Auto-Debit', 'Cash', 'Other'].map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-1.5 px-3 text-xs font-medium rounded-lg border transition-colors ${
                    paymentMethod === method
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-semibold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Reference / UPI UTR (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. UPI/428190281 or Axis Netbanking Ref"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {obligation.recurrence !== 'none' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
              <input
                id="createNextCycle"
                type="checkbox"
                checked={createNextCycle}
                onChange={(e) => setCreateNextCycle(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <label htmlFor="createNextCycle" className="text-xs text-slate-700">
                <strong className="text-slate-900">Auto-schedule next cycle ({obligation.recurrence})</strong>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Automatically populates next due date in Sahay Daily so you never miss recurring payments.
                </p>
              </label>
            </div>
          )}

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
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
