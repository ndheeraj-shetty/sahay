import React, { useState, useEffect } from 'react';
import {
  Target,
  PiggyBank,
  Plus,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Shield,
  GraduationCap,
  Home,
  Plane,
  Car,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { lakshyaService } from '../../services/lakshyaService';
import {
  AddContributionPayload,
  AddContributorPayload,
  AddWithdrawalPayload,
  CreateGoalPayload,
  GoalDetail,
  GoalListItem,
  LakshyaOverview,
} from '../../types/lakshya';
import { CreateGoalModal } from './CreateGoalModal';
import { GoalDetailModal } from './GoalDetailModal';
import { AddContributionModal } from './AddContributionModal';
import { dailyService } from '../../services/dailyService';
import { MoneyProfileModal } from '../daily/MoneyProfileModal';
import { MoneyViewData, UpdateMoneyProfilePayload } from '../../types/daily';

export const LakshyaDashboardView: React.FC = () => {
  const [overview, setOverview] = useState<LakshyaOverview | null>(null);
  const [goals, setGoals] = useState<GoalListItem[]>([]);
  const [selectedGoalDetail, setSelectedGoalDetail] = useState<GoalDetail | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moneyData, setMoneyData] = useState<MoneyViewData | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isMoneyProfileOpen, setIsMoneyProfileOpen] = useState(false);
  const [activeDepositGoal, setActiveDepositGoal] = useState<GoalDetail | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [ov, list, money] = await Promise.all([
        lakshyaService.getOverview(),
        lakshyaService.listGoals(),
        dailyService.getMoneyView().catch(() => null),
      ]);
      setOverview(ov);
      setGoals(list);
      if (money) {
        setMoneyData(money);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load Lakshya goals.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMoneyProfile = async (payload: UpdateMoneyProfilePayload) => {
    await dailyService.updateMoneyProfile(payload);
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDetail = async (goalId: string) => {
    try {
      const detail = await lakshyaService.getGoal(goalId);
      setSelectedGoalDetail(detail);
      setIsDetailOpen(true);
    } catch (err: any) {
      alert('Failed to load goal detail');
    }
  };

  const handleOpenDeposit = async (goalId: string) => {
    try {
      const detail = await lakshyaService.getGoal(goalId);
      setActiveDepositGoal(detail);
    } catch (err: any) {
      alert('Failed to load deposit modal');
    }
  };

  const handleCreateGoal = async (payload: CreateGoalPayload) => {
    await lakshyaService.createGoal(payload);
    await loadData();
  };

  const handleDeleteGoal = async (goalId: string) => {
    await lakshyaService.deleteGoal(goalId);
    await loadData();
  };

  const handleAddContribution = async (goalId: string, payload: AddContributionPayload) => {
    await lakshyaService.recordContribution(goalId, payload);
    await loadData();
    if (selectedGoalDetail && selectedGoalDetail.id === goalId) {
      const updated = await lakshyaService.getGoal(goalId);
      setSelectedGoalDetail(updated);
    }
  };

  const handleAddWithdrawal = async (goalId: string, payload: AddWithdrawalPayload) => {
    await lakshyaService.recordWithdrawal(goalId, payload);
    await loadData();
    if (selectedGoalDetail && selectedGoalDetail.id === goalId) {
      const updated = await lakshyaService.getGoal(goalId);
      setSelectedGoalDetail(updated);
    }
  };

  const handleAddContributor = async (goalId: string, payload: AddContributorPayload) => {
    await lakshyaService.addContributor(goalId, payload);
    await loadData();
    if (selectedGoalDetail && selectedGoalDetail.id === goalId) {
      const updated = await lakshyaService.getGoal(goalId);
      setSelectedGoalDetail(updated);
    }
  };

  const handleRemoveContributor = async (contributorId: string) => {
    await lakshyaService.removeContributor(contributorId);
    await loadData();
    if (selectedGoalDetail) {
      const updated = await lakshyaService.getGoal(selectedGoalDetail.id);
      setSelectedGoalDetail(updated);
    }
  };

  // Filtered goals
  const filteredGoals = goals.filter((g) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'on_track') return g.status === 'on_track';
    if (activeFilter === 'at_risk') return g.status === 'at_risk' || g.status === 'behind';
    if (activeFilter === 'completed') return g.status === 'completed';
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'emergency_fund':
      case 'medical_fund':
        return Shield;
      case 'higher_education':
      case 'child_education':
        return GraduationCap;
      case 'home_down_payment':
      case 'home_renovation':
        return Home;
      case 'travel_vacation':
        return Plane;
      case 'vehicle_purchase':
        return Car;
      case 'elder_care':
        return Heart;
      default:
        return Target;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">Completed</span>;
      case 'on_track':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">On Track</span>;
      case 'at_risk':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">At Risk</span>;
      case 'behind':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">Behind</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 capitalize">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Lakshya Goal Vaults</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              Active Module
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Collaborative Family Savings, Milestone Tracking & Run-Rate Risk Calculations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Goals"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Goal Vault</span>
          </button>
        </div>
      </div>

      {/* Overview Metrics Cards */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Family Savings
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-600">
                ₹{overview.total_saved_amount.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-500">
                of ₹{overview.total_target_amount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overall Progress
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-amber-600">
                {overview.overall_progress_percentage}%
              </span>
              <span className="text-xs text-slate-500">Across {overview.total_goals_count} vaults</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Monthly Committed
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-primary-600">
                ₹{overview.total_monthly_committed.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-primary-600 font-medium">/month</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Vaults Status
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-sm font-bold text-slate-900">
                {overview.active_goals_count} Active
              </span>
              {overview.at_risk_goals_count > 0 ? (
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  {overview.at_risk_goals_count} at risk
                </span>
              ) : (
                <span className="text-xs text-emerald-600 font-semibold">All healthy</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Household Income & Savings Capacity Card */}
      {moneyData && overview && (
        <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-indigo-500/10 border border-amber-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Household Savings Capacity
                </span>
                <span className="text-xs text-slate-500">
                  Shared across Sahay Daily & Lakshya
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block">Monthly Income</span>
                  <span className="text-base font-bold text-slate-900">
                    ₹{moneyData.expected_income.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block">Daily Obligations</span>
                  <span className="text-base font-bold text-slate-700">
                    ₹{moneyData.total_obligations.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block">Lakshya Commitments</span>
                  <span className="text-base font-bold text-amber-700">
                    ₹{overview.total_monthly_committed.toLocaleString('en-IN')}/mo
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block">Free Cash Flow Surplus</span>
                  <span className={`text-base font-bold ${
                    moneyData.expected_income - (moneyData.total_obligations + overview.total_monthly_committed) >= 0
                      ? 'text-emerald-700'
                      : 'text-red-600'
                  }`}>
                    ₹{(moneyData.expected_income - (moneyData.total_obligations + overview.total_monthly_committed)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsMoneyProfileOpen(true)}
              className="self-start md:self-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 shadow-sm transition-colors flex items-center gap-1.5"
            >
              <IndianRupee className="w-3.5 h-3.5 text-amber-600" />
              <span>Edit Income & Budget</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-5 rounded-xl">
        {[
          { key: 'all', label: 'All Vaults' },
          { key: 'on_track', label: 'On Track' },
          { key: 'at_risk', label: 'At Risk / Behind' },
          { key: 'completed', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeFilter === tab.key
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGoals.map((g) => {
          const Icon = getCategoryIcon(g.category);
          return (
            <div
              key={g.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{g.title}</h3>
                      <p className="text-[11px] text-slate-500">
                        {g.target_member_name ? `For ${g.target_member_name}` : g.category.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div>{getStatusBadge(g.status)}</div>
                </div>

                {/* Progress Bar & Amounts */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-extrabold text-slate-900 text-base">
                      ₹{g.current_amount.toLocaleString('en-IN')}
                    </span>
                    <span className="font-bold text-slate-500">
                      ₹{g.target_amount.toLocaleString('en-IN')} ({g.progress_percentage}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-emerald-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(g.progress_percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Monthly Run-Rate</span>
                    <p className="font-bold text-slate-800">₹{g.required_monthly_savings.toLocaleString('en-IN')}/mo</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Timeline</span>
                    <p className="font-bold text-slate-800">{g.remaining_months} months left</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleOpenDeposit(g.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold transition-colors border border-emerald-200"
                >
                  <PiggyBank className="w-3.5 h-3.5" />
                  <span>Deposit</span>
                </button>

                <button
                  onClick={() => handleOpenDetail(g.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <span>Inspect Vault</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGoals.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Target className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Goal Vaults Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Create your first family savings goal to start tracking progress, contributors, and monthly run-rates.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Goal</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <CreateGoalModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreateGoal}
      />

      <GoalDetailModal
        goal={selectedGoalDetail}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onRefresh={async () => {
          if (selectedGoalDetail) {
            const updated = await lakshyaService.getGoal(selectedGoalDetail.id);
            setSelectedGoalDetail(updated);
          }
          await loadData();
        }}
        onAddContribution={handleAddContribution}
        onAddWithdrawal={handleAddWithdrawal}
        onAddContributor={handleAddContributor}
        onRemoveContributor={handleRemoveContributor}
        onDeleteGoal={handleDeleteGoal}
      />

      {activeDepositGoal && (
        <AddContributionModal
          goal={activeDepositGoal}
          isOpen={!!activeDepositGoal}
          onClose={() => setActiveDepositGoal(null)}
          onAdd={async (payload) => {
            await handleAddContribution(activeDepositGoal.id, payload);
          }}
        />
      )}

      <MoneyProfileModal
        isOpen={isMoneyProfileOpen}
        onClose={() => setIsMoneyProfileOpen(false)}
        currentIncome={moneyData?.expected_income || 85000}
        currentSavings={moneyData?.planned_savings || 15000}
        onSave={handleSaveMoneyProfile}
      />
    </div>
  );
};
