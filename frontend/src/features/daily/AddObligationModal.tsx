import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  IndianRupee,
  Calendar,
  Sparkles,
  Zap,
  Wifi,
  Home,
  GraduationCap,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import {
  CreateObligationPayload,
  ObligationPriority,
  ObligationType,
  RecurrenceFrequency,
} from '../../types/daily';

interface AddObligationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (payload: CreateObligationPayload) => Promise<void>;
}

const INDIAN_PRESETS = [
  {
    icon: Zap,
    title: 'MSEB Electricity Bill',
    category: 'utility',
    obligation_type: 'bill' as ObligationType,
    amount: 1450,
    recurrence: 'monthly' as RecurrenceFrequency,
    priority: 'high' as ObligationPriority,
    biller: 'MAHADISCOM / MSEB',
  },
  {
    icon: Wifi,
    title: 'Airtel Fiber Broadband',
    category: 'utility',
    obligation_type: 'bill' as ObligationType,
    amount: 1179,
    recurrence: 'monthly' as RecurrenceFrequency,
    priority: 'medium' as ObligationPriority,
    biller: 'Airtel Broadband',
  },
  {
    icon: Home,
    title: 'HDFC Home Loan EMI',
    category: 'loan',
    obligation_type: 'emi' as ObligationType,
    amount: 32500,
    recurrence: 'monthly' as RecurrenceFrequency,
    priority: 'critical' as ObligationPriority,
    biller: 'HDFC Bank',
  },
  {
    icon: GraduationCap,
    title: 'School Quarter Tuition Fee',
    category: 'education',
    obligation_type: 'school_fee' as ObligationType,
    amount: 18000,
    recurrence: 'quarterly' as RecurrenceFrequency,
    priority: 'high' as ObligationPriority,
    biller: 'Delhi Public School',
  },
  {
    icon: Flame,
    title: 'Indane LPG Cylinder',
    category: 'utility',
    obligation_type: 'bill' as ObligationType,
    amount: 853,
    recurrence: 'monthly' as RecurrenceFrequency,
    priority: 'medium' as ObligationPriority,
    biller: 'Indian Oil (Indane)',
  },
  {
    icon: ShieldCheck,
    title: 'Star Family Health Insurance',
    category: 'insurance',
    obligation_type: 'insurance' as ObligationType,
    amount: 16500,
    recurrence: 'yearly' as RecurrenceFrequency,
    priority: 'critical' as ObligationPriority,
    biller: 'Star Health Allied Insurance',
  },
];

export const AddObligationModal: React.FC<AddObligationModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [obligationType, setObligationType] = useState<ObligationType>('bill');
  const [category, setCategory] = useState('utility');
  const [amount, setAmount] = useState<number | ''>(1000);
  const [dueDate, setDueDate] = useState(nextWeekStr);
  const [priority, setPriority] = useState<ObligationPriority>('medium');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>('monthly');
  const [biller, setBiller] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: typeof INDIAN_PRESETS[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setObligationType(preset.obligation_type);
    setAmount(preset.amount);
    setRecurrence(preset.recurrence);
    setPriority(preset.priority);
    setBiller(preset.biller);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !dueDate) {
      setError('Please fill in title, amount, and due date.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onCreated({
        title,
        obligation_type: obligationType,
        category,
        amount: Number(amount),
        due_date: dueDate,
        priority,
        recurrence,
        biller_or_payee: biller || undefined,
        account_or_consumer_no: accountNo || undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create obligation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Add Household Obligation</h3>
              <p className="text-xs text-slate-500">Schedule bills, EMIs, or recurring family responsibilities</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {/* 1-Click Indian Presets */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>1-Click Indian Family Presets</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INDIAN_PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg hover:border-primary-400 hover:bg-primary-50/40 text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-medium text-slate-800 truncate">{preset.title}</p>
                      <p className="text-[10px] text-slate-500">₹{preset.amount}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Obligation Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mahavitran Electricity Bill, Car EMI"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Type
                </label>
                <select
                  value={obligationType}
                  onChange={(e) => setObligationType(e.target.value as ObligationType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="bill">Utility / Bill</option>
                  <option value="emi">Loan / EMI</option>
                  <option value="insurance">Insurance Premium</option>
                  <option value="school_fee">School / Education Fee</option>
                  <option value="health_task">Health / Medical Task</option>
                  <option value="goal_contribution">Goal Contribution</option>
                  <option value="custom_task">Custom Household Task</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="utility">Utility (Electricity/Water/Gas/Wifi)</option>
                  <option value="housing">Housing / Rent / Maintenance</option>
                  <option value="loan">Loans & EMIs</option>
                  <option value="insurance">Insurance & Protection</option>
                  <option value="education">School & Education</option>
                  <option value="groceries">Groceries & Milk</option>
                  <option value="health">Health & Medicine</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Amount (₹) *
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Due Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Recurrence
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as RecurrenceFrequency)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="none">One-time (No recurrence)</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly (Every 3 months)</option>
                  <option value="half_yearly">Half-Yearly (Every 6 months)</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ObligationPriority)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="critical">Critical (Mandatory, High Risk)</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Payee / Biller Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Adani Electricity, LIC of India"
                  value={biller}
                  onChange={(e) => setBiller(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Consumer / Policy No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1029482910"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Add instructions, bank details, or member responsibility notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Obligation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
