import React, { useState } from 'react';
import {
  X,
  Target,
  Sparkles,
  IndianRupee,
  Calendar,
  GraduationCap,
  Home,
  Shield,
  Plane,
  Car,
  Heart,
} from 'lucide-react';
import { CreateGoalPayload, GoalCategory, GoalPriority } from '../../types/lakshya';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (payload: CreateGoalPayload) => Promise<void>;
}

const GOAL_PRESETS = [
  {
    icon: Shield,
    title: 'Emergency Buffer (6 Mo Expenses)',
    category: 'emergency_fund' as GoalCategory,
    target_amount: 300000,
    priority: 'critical' as GoalPriority,
    months_ahead: 12,
  },
  {
    icon: GraduationCap,
    title: 'Child Higher Education Fund',
    category: 'higher_education' as GoalCategory,
    target_amount: 800000,
    priority: 'high' as GoalPriority,
    months_ahead: 36,
  },
  {
    icon: Home,
    title: 'Home Down Payment (SBI Housing)',
    category: 'home_down_payment' as GoalCategory,
    target_amount: 1500000,
    priority: 'high' as GoalPriority,
    months_ahead: 24,
  },
  {
    icon: Plane,
    title: 'Family Vacation (Europe / Dubai)',
    category: 'travel_vacation' as GoalCategory,
    target_amount: 250000,
    priority: 'medium' as GoalPriority,
    months_ahead: 10,
  },
  {
    icon: Car,
    title: 'Electric Car (Tata EV)',
    category: 'vehicle_purchase' as GoalCategory,
    target_amount: 600000,
    priority: 'medium' as GoalPriority,
    months_ahead: 18,
  },
  {
    icon: Heart,
    title: 'Elder Medical Care Buffer',
    category: 'elder_care' as GoalCategory,
    target_amount: 400000,
    priority: 'critical' as GoalPriority,
    months_ahead: 12,
  },
];

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  if (!isOpen) return null;

  const defaultDate = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('emergency_fund');
  const [targetAmount, setTargetAmount] = useState<number | ''>(300000);
  const [targetDate, setTargetDate] = useState(defaultDate);
  const [priority, setPriority] = useState<GoalPriority>('high');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: typeof GOAL_PRESETS[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setTargetAmount(preset.target_amount);
    setPriority(preset.priority);
    const future = new Date(Date.now() + preset.months_ahead * 30 * 86400000);
    setTargetDate(future.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetAmount || !targetDate) {
      setError('Please provide goal title, target amount, and target date.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onCreated({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        target_amount: Number(targetAmount),
        target_date: targetDate,
        priority,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create goal vault');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Create Lakshya Goal Vault</h3>
              <p className="text-xs text-slate-500">Plan family savings with automated progress & risk tracking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {/* 1-Click Presets */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>1-Click Family Milestone Presets</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GOAL_PRESETS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg hover:border-amber-400 hover:bg-amber-50/50 text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-medium text-slate-800 truncate">{p.title}</p>
                      <p className="text-[10px] text-slate-500">₹{(p.target_amount / 100000).toFixed(1)} Lakh</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Goal Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Higher Education Fund, Home Down Payment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GoalCategory)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="emergency_fund">Emergency Fund</option>
                  <option value="higher_education">Higher Education</option>
                  <option value="child_education">Child Schooling</option>
                  <option value="home_down_payment">Home Down Payment</option>
                  <option value="home_renovation">Home Renovation</option>
                  <option value="vehicle_purchase">Vehicle Purchase</option>
                  <option value="wedding">Family Wedding</option>
                  <option value="travel_vacation">Vacation / Travel</option>
                  <option value="elder_care">Elder Medical / Care</option>
                  <option value="retirement">Retirement Support</option>
                  <option value="custom">Custom Goal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as GoalPriority)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="critical">Critical (Mandatory Target)</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Amount (₹) *
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    required
                    min="1000"
                    step="1000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Achievement Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Goal Description / Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Target corpus for Aarav's university admission deposit and living expenses"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                {isSubmitting ? 'Creating...' : 'Create Goal Vault'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
