import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  IndianRupee,
  Layers,
  HeartPulse,
} from 'lucide-react';
import { lakshyaService } from '../../services/lakshyaService';
import {
  EmergencyModeReallocationResponse,
  GoalEmergencyReallocationItem,
} from '../../types/lakshya';

interface EmergencyModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalsUpdated?: () => void;
  onOpenAssistantWithPrompt?: (prompt: string) => void;
}

export const EmergencyModeModal: React.FC<EmergencyModeModalProps> = ({
  isOpen,
  onClose,
  onGoalsUpdated,
  onOpenAssistantWithPrompt,
}) => {
  const [urgentAmount, setUrgentAmount] = useState<number>(500000);
  const [reason, setReason] = useState<string>('Pandemic Hospitalization & Medical Crisis');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [plan, setPlan] = useState<EmergencyModeReallocationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickAmounts = [100000, 250000, 500000, 1000000];

  const handleCalculatePlan = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      const res = await lakshyaService.planEmergencyReallocation({
        urgent_amount: urgentAmount,
        reason: reason,
      });
      setPlan(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to calculate emergency reallocation plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyWithdrawals = async () => {
    if (!plan || plan.reallocations.length === 0) return;
    try {
      setApplying(true);
      setError(null);
      const withdrawals = plan.reallocations
        .filter((r) => r.recommended_withdrawal > 0)
        .map((r) => ({
          goal_id: r.goal_id,
          amount: r.recommended_withdrawal,
        }));

      await lakshyaService.applyEmergencyReallocation({
        urgent_amount: plan.urgent_amount,
        reason: reason,
        withdrawals,
      });

      setSuccessMessage('Emergency withdrawals recorded successfully. Goal balances have been updated.');
      if (onGoalsUpdated) {
        onGoalsUpdated();
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to apply emergency withdrawals.');
    } finally {
      setApplying(false);
    }
  };

  const handleDiscussWithAI = () => {
    const prompt = `Emergency Mode: We urgently require ₹${urgentAmount.toLocaleString('en-IN')} for ${reason}, but our liquid account doesn't have that much money. We need advice on how to take funds from our saved goals (like car and house) and how to replenish them later once the crisis settles.`;
    if (onOpenAssistantWithPrompt) {
      onOpenAssistantWithPrompt(prompt);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 my-8 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">
                  Pandemic & Crisis Emergency Mode
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-wider">
                  Liquidity Advisor
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Intelligently reallocate saved goals without breaking family security or taking high-interest loans
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Input Controls */}
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Urgent Amount Required (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="1000"
                  step="5000"
                  value={urgentAmount}
                  onChange={(e) => setUrgentAmount(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white transition-all"
                  placeholder="500000"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center space-x-1.5 mt-2">
                <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setUrgentAmount(amt)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border ${
                      urgentAmount === amt
                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    ₹{(amt / 100000).toFixed(amt % 100000 === 0 ? 0 : 1)} Lakh{amt >= 200000 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Crisis Context / Reason
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white transition-all"
                placeholder="e.g. Pandemic Hospitalization, Urgent Medical Need"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Helps prioritize discretionary funds over critical medical or child education goals.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleCalculatePlan}
              disabled={loading || urgentAmount <= 0}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Calculating Plan...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyze & Reallocate Goals</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Reallocation Plan Results */}
        {plan && (
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-5 animate-in fade-in duration-200">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-2xl">
                <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                  Urgent Target
                </div>
                <div className="text-base font-extrabold text-rose-900 mt-0.5">
                  ₹{plan.urgent_amount.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Liquid Cash Surplus
                </div>
                <div className="text-base font-extrabold text-slate-800 mt-0.5">
                  ₹{plan.available_liquid_cash.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  Deficit Needed
                </div>
                <div className="text-base font-extrabold text-amber-900 mt-0.5">
                  ₹{plan.deficit.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Mobilized from Goals
                </div>
                <div className="text-base font-extrabold text-emerald-900 mt-0.5">
                  ₹{plan.total_mobilized_from_goals.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* AI Narrative Advice Box */}
            <div className="p-4 bg-gradient-to-r from-amber-50/70 to-rose-50/70 border border-amber-200/80 rounded-2xl">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-900 mb-1.5">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                <span>Sahay Emergency Advice:</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {plan.advice_narrative}
              </p>
            </div>

            {/* Goal Reallocation Table */}
            {plan.reallocations.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Goal Liquidation Breakdown</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Non-critical goals liquidated first
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-3">Goal Name</th>
                        <th className="py-2.5 px-3">Current Saved</th>
                        <th className="py-2.5 px-3 text-rose-600">Take Now</th>
                        <th className="py-2.5 px-3 text-emerald-600">Remaining</th>
                        <th className="py-2.5 px-3">Restoration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {plan.reallocations.map((r) => (
                        <tr key={r.goal_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <div>{r.goal_title}</div>
                            <span className="text-[10px] font-normal text-slate-400 capitalize">
                              {r.priority_level}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">
                            ₹{r.current_saved.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-rose-600">
                            -₹{r.recommended_withdrawal.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-700">
                            ₹{r.remaining_saved.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">
                            ₹{r.restoration_monthly.toLocaleString('en-IN')}/mo × {r.restoration_months}m
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                No active savings goals with positive balances found in your Lakshya vault.
              </div>
            )}

            {/* Post-Crisis Restoration Plan */}
            {plan.restoration_plan && plan.restoration_plan.length > 0 && (
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-900">
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                  <span>🛡️ Post-Crisis Restoration & Replenishment Schedule</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Keep your long-term goals on track by depositing these amounts back once the emergency resolves:
                </p>
                <div className="space-y-1.5 pt-1">
                  {plan.restoration_plan.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white rounded-xl border border-indigo-100 text-xs text-slate-800 flex items-center space-x-2 font-medium"
                    >
                      <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions in Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDiscussWithAI}
                className="px-3.5 py-2 bg-white border border-slate-200 hover:border-indigo-500 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Discuss Plan with Sahay AI</span>
              </button>

              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium transition-colors"
                >
                  Close
                </button>
                {plan.reallocations.some((r) => r.recommended_withdrawal > 0) && (
                  <button
                    type="button"
                    onClick={handleApplyWithdrawals}
                    disabled={applying}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {applying ? (
                      <span>Applying...</span>
                    ) : (
                      <>
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>Apply Emergency Withdrawals</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
