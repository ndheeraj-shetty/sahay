import React, { useState } from 'react';
import { X, DollarSign, IndianRupee, Wallet } from 'lucide-react';
import { UpdateMoneyProfilePayload } from '../../types/daily';

interface MoneyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIncome: number;
  currentSavings: number;
  currentRent?: number;
  currentGroceries?: number;
  currentUtilities?: number;
  currentOther?: number;
  onSave: (payload: UpdateMoneyProfilePayload) => Promise<void>;
}

export const MoneyProfileModal: React.FC<MoneyProfileModalProps> = ({
  isOpen,
  onClose,
  currentIncome,
  currentSavings,
  currentRent,
  currentGroceries,
  currentUtilities,
  currentOther,
  onSave,
}) => {
  if (!isOpen) return null;

  const [income, setIncome] = useState<number>(currentIncome || 85000);
  const [savings, setSavings] = useState<number>(currentSavings || 15000);
  const [rent, setRent] = useState<number>(currentRent !== undefined ? currentRent : 18000);
  const [groceries, setGroceries] = useState<number>(currentGroceries !== undefined ? currentGroceries : 12000);
  const [utilities, setUtilities] = useState<number>(currentUtilities !== undefined ? currentUtilities : 5000);
  const [other, setOther] = useState<number>(currentOther !== undefined ? currentOther : 5000);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalLivingExpenses = (Number(rent) || 0) + (Number(groceries) || 0) + (Number(utilities) || 0) + (Number(other) || 0);
  const remainingEstimate = (Number(income) || 0) - totalLivingExpenses - (Number(savings) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        expected_monthly_income: Number(income),
        planned_monthly_savings: Number(savings),
        rent_expense: Number(rent),
        groceries_expense: Number(groceries),
        utilities_expense: Number(utilities),
        other_expenses: Number(other),
        notes: notes || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update household financial targets');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Household Income, Expenses & Budget</h3>
              <p className="text-xs text-slate-500">Track monthly income, living expenses & savings capacity</p>
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
                Monthly Income (₹) *
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={income}
                  onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Total household salary / earnings</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Savings / Goals (₹) *
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  required
                  min="0"
                  step="500"
                  value={savings}
                  onChange={(e) => setSavings(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Lakshya goals & emergency buffer</p>
            </div>
          </div>

          {/* Monthly Expenses Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Monthly Living Expenses
              </span>
              <span className="text-xs font-bold text-slate-700">
                Total: ₹{totalLivingExpenses.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Room Rent / Housing (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={rent}
                  onChange={(e) => setRent(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Groceries & Daily Needs (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={groceries}
                  onChange={(e) => setGroceries(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Utilities & Maintenance (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="200"
                  value={utilities}
                  onChange={(e) => setUtilities(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Other / Lifestyle Expenses (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="200"
                  value={other}
                  onChange={(e) => setOther(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Live Remaining Preview */}
          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            remainingEstimate >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            <span>Estimated Remaining Monthly Balance:</span>
            <span className="text-sm font-bold">
              ₹{remainingEstimate.toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Budget Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. FY 2026-27 Primary Family Budget"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Update Budget & Expenses'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
