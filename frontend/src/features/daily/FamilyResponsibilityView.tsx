import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserCheck,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Shield,
  IndianRupee,
  RefreshCw,
  Plus,
  ArrowRight,
  Info,
  UserX,
  UserPlus,
} from 'lucide-react';
import { dailyService } from '../../services/dailyService';
import {
  FamilyResponsibilityIntelligenceResponse,
  TransferSuggestion,
  Obligation,
} from '../../types/daily';

export const FamilyResponsibilityView: React.FC = () => {
  const queryClient = useQueryClient();
  const [transferringObId, setTransferringObId] = useState<string | null>(null);
  const [selectedTargetMember, setSelectedTargetMember] = useState<{ [obId: string]: string }>({});

  // Fetch Responsibility Intelligence
  const { data: intel, isLoading, error, refetch } = useQuery<FamilyResponsibilityIntelligenceResponse>({
    queryKey: ['family-responsibility'],
    queryFn: dailyService.getResponsibilityIntelligence,
  });

  // Mutation to execute Responsibility Transfer
  const transferMutation = useMutation({
    mutationFn: async ({
      obligationId,
      targetMemberId,
      reason,
    }: {
      obligationId: string;
      targetMemberId: string;
      reason?: string;
    }) => {
      return await dailyService.transferObligation(obligationId, {
        target_member_id: targetMemberId,
        reason: reason || 'Delegated via Family Responsibility Intelligence',
      });
    },
    onSuccess: () => {
      setTransferringObId(null);
      queryClient.invalidateQueries({ queryKey: ['family-responsibility'] });
      queryClient.invalidateQueries({ queryKey: ['household-radar'] });
      queryClient.invalidateQueries({ queryKey: ['today-view'] });
      queryClient.invalidateQueries({ queryKey: ['obligations'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Analyzing Family Responsibility Matrix...</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          SAHAY is evaluating workload distribution, unassigned obligations, and delegation paths across household members.
        </p>
      </div>
    );
  }

  if (error || !intel) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-700">
        <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-rose-600" />
        <p className="font-bold">Failed to load Family Responsibility Intelligence</p>
        <button
          onClick={() => refetch()}
          className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-white font-semibold hover:bg-rose-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const allMembers = intel.member_workloads.map((w) => ({
    id: w.member_id,
    name: w.member_name,
    relationship: w.relationship,
  }));

  return (
    <div className="space-y-6 pb-10">
      {/* Hero Header */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-sky-50/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900">Family Responsibility Intelligence</h2>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wide border border-indigo-200">
                  Smart Delegation
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                SAHAY maps who is responsible for each household obligation, flags bottlenecks and unassigned tasks, and recommends intelligent task delegation.
              </p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center space-x-1.5 self-start md:self-auto rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Re-evaluate Matrix</span>
          </button>
        </div>

        {/* Executive Responsibility Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Family Members</span>
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {intel.member_workloads.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Active in household
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Obligations</span>
              <Shield className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {intel.total_obligations}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Managed across family
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Unassigned Tasks</span>
              <UserX className="h-4 w-4 text-amber-500" />
            </div>
            <div className={`mt-2 text-2xl font-bold ${intel.unassigned_count > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {intel.unassigned_count}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {intel.unassigned_count > 0 ? 'Needs immediate owner' : 'All obligations owned'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Overdue Tasks</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className={`mt-2 text-2xl font-bold ${intel.overdue_count > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {intel.overdue_count}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {intel.overdue_count > 0 ? 'Delegation advised' : 'Zero overdue tasks'}
            </div>
          </div>
        </div>

        {/* Intelligence Summary Banner */}
        <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
          <div className="flex items-start space-x-2.5">
            <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-indigo-950 leading-relaxed">
              {intel.intelligence_summary}
            </p>
          </div>
        </div>
      </div>

      {/* Smart Delegation & Transfer Suggestions */}
      {intel.transfer_suggestions && intel.transfer_suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                ⚡ Proactive Transfer & Delegation Suggestions
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Recommended to prevent missed deadlines
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {intel.transfer_suggestions.map((sugg, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-xl border border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30 p-4 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {sugg.obligation_title}
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                      ₹{sugg.amount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Transfer Route */}
                  <div className="mt-2.5 flex items-center space-x-2 text-xs">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                      {sugg.current_member_name}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-bold text-indigo-800">
                      {sugg.suggested_member_name}
                    </span>
                  </div>

                  <p className="mt-2.5 text-xs text-slate-600 leading-relaxed bg-white rounded-lg p-2.5 border border-slate-100">
                    <span className="font-semibold text-slate-800">Reason: </span>
                    {sugg.reason}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3">
                  <button
                    onClick={() =>
                      transferMutation.mutate({
                        obligationId: sugg.obligation_id,
                        targetMemberId: sugg.suggested_member_id,
                        reason: sugg.reason,
                      })
                    }
                    disabled={transferMutation.isPending}
                    className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {transferMutation.isPending ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Transferring...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Approve Transfer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Family Member Workload Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            👥 Family Member Responsibility Breakdown
          </h3>
          <span className="text-[11px] text-slate-500">
            {intel.member_workloads.length} members managing household needs
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {intel.member_workloads.map((member) => (
            <div
              key={member.member_id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-200 transition-all"
            >
              <div>
                {/* Member Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold text-sm">
                      {member.member_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{member.member_name}</h4>
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 capitalize">
                        {member.relationship || member.role}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    ₹{member.total_managed_amount.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Workload Stats Chips */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-100">
                    <div className="text-[10px] font-bold text-emerald-700">COMPLETED</div>
                    <div className="text-sm font-bold text-emerald-900">{member.completed_obligations}</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2 border border-amber-100">
                    <div className="text-[10px] font-bold text-amber-700">PENDING</div>
                    <div className="text-sm font-bold text-amber-900">{member.pending_obligations}</div>
                  </div>
                  <div className="rounded-lg bg-rose-50 p-2 border border-rose-100">
                    <div className="text-[10px] font-bold text-rose-700">OVERDUE</div>
                    <div className="text-sm font-bold text-rose-900">{member.overdue_obligations}</div>
                  </div>
                </div>

                {/* Obligation List */}
                <div className="mt-4 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Assigned Responsibilities ({member.obligations.length})
                  </div>
                  {member.obligations.length === 0 ? (
                    <div className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-400 italic">
                      No obligations currently assigned
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {member.obligations.map((ob) => (
                        <div
                          key={ob.id}
                          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-1.5 text-xs"
                        >
                          <div className="truncate pr-2">
                            <div className="font-semibold text-slate-800 truncate">{ob.title}</div>
                            <div className="text-[10px] text-slate-500">
                              Due {new Date(ob.due_date).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="font-bold text-slate-900 shrink-0">
                            ₹{ob.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unassigned Obligations Tray */}
      {intel.unassigned_obligations && intel.unassigned_obligations.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 space-y-3">
          <div className="flex items-center space-x-2">
            <UserX className="h-4 w-4 text-amber-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              ⚠️ Unassigned Obligations ({intel.unassigned_obligations.length})
            </h3>
          </div>
          <p className="text-xs text-amber-700">
            These household obligations have no designated responsible person. Assign them to ensure timely completion:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {intel.unassigned_obligations.map((ob) => (
              <div
                key={ob.id}
                className="rounded-xl border border-amber-200 bg-white p-3.5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900">{ob.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Due {new Date(ob.due_date).toLocaleDateString()} • ₹{ob.amount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="mt-3 flex items-center space-x-2">
                  <select
                    value={selectedTargetMember[ob.id] || ''}
                    onChange={(e) =>
                      setSelectedTargetMember((prev) => ({ ...prev, [ob.id]: e.target.value }))
                    }
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                  >
                    <option value="">-- Assign To --</option>
                    {allMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.relationship || 'Member'})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const targetId = selectedTargetMember[ob.id];
                      if (!targetId) {
                        alert('Please select a family member to assign.');
                        return;
                      }
                      transferMutation.mutate({
                        obligationId: ob.id,
                        targetMemberId: targetId,
                        reason: 'Manual assignment from Unassigned Obligations Tray',
                      });
                    }}
                    disabled={!selectedTargetMember[ob.id] || transferMutation.isPending}
                    className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  >
                    Assign
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
