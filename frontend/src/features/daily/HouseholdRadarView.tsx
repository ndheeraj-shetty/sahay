import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Compass,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  Shield,
  Car,
  GraduationCap,
  Zap,
  Pill,
  FileText,
  PlusCircle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Info,
  Check,
} from 'lucide-react';
import { dailyService } from '../../services/dailyService';
import { HouseholdRadarResponse, LifeEventItem, CreateObligationPayload, ObligationType } from '../../types/daily';

export const HouseholdRadarView: React.FC = () => {
  const queryClient = useQueryClient();
  const [createdEventIds, setCreatedEventIds] = useState<Set<string>>(new Set());

  // Fetch Radar data
  const { data: radar, isLoading, error, refetch } = useQuery<HouseholdRadarResponse>({
    queryKey: ['household-radar'],
    queryFn: dailyService.getRadarTimeline,
  });

  // Mutation to convert Radar item into an Obligation
  const createObligationMutation = useMutation({
    mutationFn: async (event: LifeEventItem) => {
      const obType: ObligationType =
        event.category === 'insurance'
          ? 'insurance'
          : event.category === 'education'
          ? 'school_fee'
          : event.category === 'vehicle'
          ? 'document_renewal'
          : 'bill';

      const payload: CreateObligationPayload = {
        title: event.title.replace(/ — .*$/, ''),
        obligation_type: obType,
        amount: event.estimated_amount || 1000.0,
        due_date: event.target_date,
        category: event.category,
        priority: event.time_horizon === 'urgent' ? 'high' : 'medium',
        recurrence: event.category === 'insurance' || event.category === 'vehicle' ? 'yearly' : 'monthly',
        notes: `Created from Life-Event Radar (Source: ${event.source_document_title || 'Document'})`,
      };
      return await dailyService.createObligationFromRadar(payload);
    },
    onSuccess: (_, event) => {
      setCreatedEventIds((prev) => new Set(prev).add(event.id));
      queryClient.invalidateQueries({ queryKey: ['household-radar'] });
      queryClient.invalidateQueries({ queryKey: ['today-view'] });
      queryClient.invalidateQueries({ queryKey: ['obligations'] });
    },
  });

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'insurance':
        return <Shield className="h-4 w-4 text-indigo-600" />;
      case 'vehicle':
        return <Car className="h-4 w-4 text-blue-600" />;
      case 'education':
        return <GraduationCap className="h-4 w-4 text-amber-600" />;
      case 'utilities':
        return <Zap className="h-4 w-4 text-emerald-600" />;
      case 'health':
        return <Pill className="h-4 w-4 text-rose-600" />;
      default:
        return <FileText className="h-4 w-4 text-slate-600" />;
    }
  };

  const getHorizonBadge = (days: number, isOverdue: boolean) => {
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 border border-rose-200">
          <AlertTriangle className="h-3 w-3" /> Overdue by {Math.abs(days)}d
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
          <Clock className="h-3 w-3" /> In {days} days
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
          <Calendar className="h-3 w-3" /> In {days} days
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
        In {days} days
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Scanning Cross-Document Timeline...</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          SAHAY Radar is connecting dates from insurance policies, school fee notices, vehicle documents, and utility bills.
        </p>
      </div>
    );
  }

  if (error || !radar) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-700">
        <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-rose-600" />
        <p className="font-bold">Failed to load Household Life-Event Radar</p>
        <button
          onClick={() => refetch()}
          className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-white font-semibold hover:bg-rose-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Hero Radar Header */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shrink-0">
              <Compass className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900">Household Life-Event Radar</h2>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wide border border-indigo-200">
                  Cross-Document Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                SAHAY connects dates, policies, fees, bills, and family obligations from all your documents into a single predictive radar.
              </p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center space-x-1.5 self-start md:self-auto rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Refresh Radar</span>
          </button>
        </div>

        {/* Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Tracked Life Events</span>
              <Calendar className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {radar.total_upcoming_events}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Across documents & obligations
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Next 90 Days Outflow</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              ₹{radar.next_90_days_outflow.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              Total anticipated commitments
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Peak Outflow Month</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-indigo-950">
              {radar.peak_outflow_month}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Highest household financial concentration
            </div>
          </div>
        </div>

        {/* AI Synthesis & Predictive Alerts */}
        <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <div className="flex items-start space-x-2.5">
            <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <p className="text-xs font-semibold text-indigo-950 leading-relaxed">
                {radar.radar_summary}
              </p>
              {radar.predictive_alerts && radar.predictive_alerts.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {radar.predictive_alerts.map((alert, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 border border-indigo-100 shadow-2xs"
                    >
                      {alert}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Timeline Horizon Buckets */}
      <div className="space-y-6">
        {radar.timeline.map((bucket) => (
          <div key={bucket.horizon_key} className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {bucket.horizon_label}
                </h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {bucket.events.length} {bucket.events.length === 1 ? 'event' : 'events'}
                </span>
              </div>
              {bucket.total_outflow > 0 && (
                <span className="text-xs font-semibold text-slate-600">
                  Est. Outflow: <span className="font-bold text-slate-900">₹{bucket.total_outflow.toLocaleString('en-IN')}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {bucket.events.map((event) => {
                const isTaskCreated = createdEventIds.has(event.id) || event.has_active_obligation;

                return (
                  <div
                    key={event.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <div>
                      {/* Top Row: Category & Countdown */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                          {getCategoryIcon(event.category)}
                          <span className="capitalize">{event.category}</span>
                        </div>
                        {getHorizonBadge(event.days_remaining, event.is_overdue)}
                      </div>

                      {/* Event Title */}
                      <h4 className="mt-2.5 text-sm font-bold text-slate-900">
                        {event.title}
                      </h4>

                      {/* Source Document Tag */}
                      {event.source_document_title && (
                        <div className="mt-1 flex items-center space-x-1 text-[11px] text-slate-500">
                          <FileText className="h-3 w-3 text-slate-400" />
                          <span className="truncate">Source: {event.source_document_title}</span>
                        </div>
                      )}

                      {/* Suggested Action Box */}
                      {event.suggested_action && (
                        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 text-xs text-slate-700 leading-relaxed">
                          <span className="font-semibold text-slate-900">Radar Insight: </span>
                          {event.suggested_action}
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Amount & Action Button */}
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          Est. Outflow
                        </div>
                        <div className="text-xs font-bold text-slate-900">
                          {event.estimated_amount ? (
                            `₹${event.estimated_amount.toLocaleString('en-IN')}`
                          ) : (
                            <span className="text-slate-400 italic">No direct fee</span>
                          )}
                        </div>
                      </div>

                      <div>
                        {isTaskCreated ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Active in Sahay Daily</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => createObligationMutation.mutate(event)}
                            disabled={createObligationMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span>⚡ Create Renewal Task</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
