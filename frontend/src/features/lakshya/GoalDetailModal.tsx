import React, { useState } from 'react';
import {
  X,
  Target,
  PiggyBank,
  ArrowDownRight,
  UserPlus,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  IndianRupee,
  Shield,
  Lightbulb,
} from 'lucide-react';
import {
  AddContributionPayload,
  AddContributorPayload,
  AddWithdrawalPayload,
  GoalDetail,
} from '../../types/lakshya';
import { AddContributionModal } from './AddContributionModal';
import { AddWithdrawalModal } from './AddWithdrawalModal';

interface GoalDetailModalProps {
  goal: GoalDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onAddContribution: (goalId: string, payload: AddContributionPayload) => Promise<void>;
  onAddWithdrawal: (goalId: string, payload: AddWithdrawalPayload) => Promise<void>;
  onAddContributor: (goalId: string, payload: AddContributorPayload) => Promise<void>;
  onRemoveContributor: (contributorId: string) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
}

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  goal,
  isOpen,
  onClose,
  onRefresh,
  onAddContribution,
  onAddWithdrawal,
  onAddContributor,
  onRemoveContributor,
  onDeleteGoal,
}) => {
  if (!isOpen || !goal) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'contributions' | 'withdrawals'>('overview');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [showAddContributor, setShowAddContributor] = useState(false);

  // New contributor state
  const [newMemberId, setNewMemberId] = useState('');
  const [newCommitment, setNewCommitment] = useState<number | ''>(5000);
  const [isAddingContrib, setIsAddingContrib] = useState(false);

  const risk = goal.risk_analysis;

  const handleCreateContributor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberId || !newCommitment) return;
    try {
      setIsAddingContrib(true);
      await onAddContributor(goal.id, {
        member_id: newMemberId,
        monthly_commitment_amount: Number(newCommitment),
      });
      setShowAddContributor(false);
      setNewMemberId('');
      await onRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to add contributor');
    } finally {
      setIsAddingContrib(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Completed (100%)</span>;
      case 'on_track':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">On Track</span>;
      case 'at_risk':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">At Risk</span>;
      case 'behind':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">Behind Schedule</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 capitalize">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">{goal.title}</h2>
                {getStatusBadge(goal.status)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Target Date: <strong>{goal.target_date}</strong> • Category: <span className="font-mono">{goal.category}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this goal vault?')) {
                  onDeleteGoal(goal.id);
                  onClose();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Delete goal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'overview'
                  ? 'bg-amber-100 text-amber-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Overview & Risk
            </button>
            <button
              onClick={() => setActiveTab('contributions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'contributions'
                  ? 'bg-amber-100 text-amber-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Contributions ({goal.contributions.length})
            </button>
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'withdrawals'
                  ? 'bg-amber-100 text-amber-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Withdrawals ({goal.withdrawals.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsWithdrawOpen(true)}
              disabled={goal.current_amount <= 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
              <span>Disburse</span>
            </button>

            <button
              onClick={() => setIsDepositOpen(true)}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              <PiggyBank className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Progress Summary Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Accumulated Savings
                    </span>
                    <p className="text-3xl font-black text-slate-900 mt-0.5">
                      ₹{goal.current_amount.toLocaleString('en-IN')}{' '}
                      <span className="text-sm font-medium text-slate-500">
                        / ₹{goal.target_amount.toLocaleString('en-IN')}
                      </span>
                    </p>
                  </div>
                  <span className="text-2xl font-black text-amber-600">{goal.progress_percentage}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-emerald-500 h-3.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Remaining: <strong>₹{(goal.target_amount - goal.current_amount).toLocaleString('en-IN')}</strong></span>
                  <span>Timeline: <strong>{risk?.remaining_months || 0} months left</strong></span>
                </div>
              </div>

              {/* Real-Time Risk Intelligence Box */}
              {risk && (
                <div
                  className={`p-5 rounded-2xl border ${
                    risk.risk_level === 'completed'
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : risk.risk_level === 'on_track'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : risk.risk_level === 'at_risk'
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-red-50/60 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-slate-700" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Risk & Monthly Run-Rate Analysis
                      </h4>
                    </div>
                    {getStatusBadge(risk.risk_level)}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 block">Required Monthly Run-Rate</span>
                      <strong className="text-base font-bold text-slate-900">
                        ₹{risk.required_monthly_savings.toLocaleString('en-IN')}/mo
                      </strong>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 block">Committed Family Savings</span>
                      <strong
                        className={`text-base font-bold ${
                          risk.committed_monthly_savings >= risk.required_monthly_savings
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        ₹{risk.committed_monthly_savings.toLocaleString('en-IN')}/mo
                      </strong>
                    </div>
                  </div>

                  {risk.recommendations.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                      {risk.recommendations.map((rec, i) => (
                        <p key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Progression Milestones */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Milestone Progression (25%, 50%, 75%, 100%)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {goal.milestones.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        m.is_reached
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {m.is_reached && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        <span className="text-xs font-bold">{m.target_percentage}%</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1">
                        ₹{(m.target_amount / 1000).toFixed(0)}k
                      </p>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {m.is_reached ? 'Reached' : 'Upcoming'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Family Contributors Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contributing Family Members ({goal.contributors.length})
                  </h4>
                  <button
                    onClick={() => setShowAddContributor(!showAddContributor)}
                    className="inline-flex items-center gap-1 text-xs text-primary-600 font-semibold hover:text-primary-700"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{showAddContributor ? 'Cancel' : 'Add Contributor'}</span>
                  </button>
                </div>

                {showAddContributor && (
                  <form onSubmit={handleCreateContributor} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      placeholder="Household Member ID"
                      required
                      value={newMemberId}
                      onChange={(e) => setNewMemberId(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-900 w-48"
                    />
                    <input
                      type="number"
                      placeholder="Monthly ₹ Commitment"
                      required
                      min="100"
                      value={newCommitment}
                      onChange={(e) => setNewCommitment(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-900 w-36"
                    />
                    <button
                      type="submit"
                      disabled={isAddingContrib}
                      className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold"
                    >
                      {isAddingContrib ? 'Adding...' : 'Save'}
                    </button>
                  </form>
                )}

                <div className="space-y-2">
                  {goal.contributors.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-xs text-slate-900">{c.member_name}</strong>
                        <span className="text-[11px] text-slate-500 ml-1.5">({c.member_role})</span>
                        <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                          Commitment: ₹{c.monthly_commitment_amount.toLocaleString('en-IN')}/mo
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          if (window.confirm('Remove this contributor?')) {
                            await onRemoveContributor(c.id);
                            await onRefresh();
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Remove contributor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {goal.contributors.length === 0 && (
                    <p className="text-xs text-slate-400 py-2">
                      No specific contributor commitments. Anyone in the household can deposit savings.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'contributions' && (
            <div className="space-y-2">
              {goal.contributions.map((cb) => (
                <div
                  key={cb.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700">
                        +₹{cb.amount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-700 font-medium">via {cb.payment_method}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      <span>{cb.contribution_date}</span>
                      {cb.contributor_name && <span> • Contributor: {cb.contributor_name}</span>}
                      {cb.transaction_reference && (
                        <span className="font-mono text-slate-600"> • Ref: {cb.transaction_reference}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {goal.contributions.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No deposits yet. Click "Deposit" to add family savings to this vault.
                </div>
              )}
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div className="space-y-2">
              {goal.withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-rose-700">
                        -₹{w.amount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-900 font-semibold">{w.reason}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      <span>{w.withdrawal_date}</span>
                      {w.authorized_by_name && <span> • Authorized by: {w.authorized_by_name}</span>}
                    </div>
                  </div>
                </div>
              ))}

              {goal.withdrawals.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No withdrawals made from this goal.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AddContributionModal
        goal={goal}
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onAdd={async (payload) => {
          await onAddContribution(goal.id, payload);
          await onRefresh();
        }}
      />

      <AddWithdrawalModal
        goal={goal}
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onAdd={async (payload) => {
          await onAddWithdrawal(goal.id, payload);
          await onRefresh();
        }}
      />
    </div>
  );
};
