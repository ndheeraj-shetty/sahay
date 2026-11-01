import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  AlertTriangle,
  FileText,
  User,
  RotateCw,
} from 'lucide-react';
import { Obligation } from '../../types/daily';

interface ObligationCardProps {
  obligation: Obligation;
  onPay?: (obligation: Obligation) => void;
  onSnooze?: (obligation: Obligation) => void;
  onDelete?: (obligationId: string) => void;
  isCompleted?: boolean;
}

export const ObligationCard: React.FC<ObligationCardProps> = ({
  obligation,
  onPay,
  onSnooze,
  onDelete,
  isCompleted = false,
}) => {
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">Low</span>;
    }
  };

  const getDueBadge = () => {
    if (isCompleted || obligation.status === 'paid' || obligation.status === 'completed') {
      return (
        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
          <CheckCircle2 className="w-3.5 h-3.5" /> Paid ₹{obligation.paid_amount || obligation.amount}
        </span>
      );
    }
    if (obligation.status === 'snoozed') {
      return (
        <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded">
          <Clock className="w-3.5 h-3.5" /> Snoozed to {obligation.snoozed_until}
        </span>
      );
    }
    if (obligation.days_until_due < 0) {
      return (
        <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
          <AlertTriangle className="w-3.5 h-3.5" /> Overdue by {Math.abs(obligation.days_until_due)}d
        </span>
      );
    }
    if (obligation.days_until_due === 0) {
      return (
        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md animate-pulse">
          <Clock className="w-3.5 h-3.5" /> Due Today
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due in {obligation.days_until_due} days ({obligation.due_date})
      </span>
    );
  };

  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-200 bg-white hover:shadow-md ${
        obligation.priority === 'critical' && obligation.status !== 'paid'
          ? 'border-red-200 ring-1 ring-red-100'
          : obligation.days_until_due === 0 && obligation.status !== 'paid'
          ? 'border-amber-300 ring-1 ring-amber-100'
          : 'border-slate-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isCompleted || obligation.status === 'paid'
                ? 'bg-emerald-100 text-emerald-600'
                : obligation.priority === 'critical'
                ? 'bg-red-100 text-red-600'
                : 'bg-primary-50 text-primary-600'
            }`}
          >
            {isCompleted || obligation.status === 'paid' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-slate-900">{obligation.title}</h4>
              {getPriorityBadge(obligation.priority)}
              <span className="text-xs uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                {obligation.category}
              </span>
              {obligation.recurrence !== 'none' && (
                <span className="inline-flex items-center gap-0.5 text-xs text-primary-600 font-medium">
                  <RotateCw className="w-3 h-3" /> {obligation.recurrence}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              {obligation.biller_or_payee && (
                <span>Payee: <strong className="text-slate-700">{obligation.biller_or_payee}</strong></span>
              )}
              {obligation.account_or_consumer_no && (
                <span>A/C: <span className="font-mono text-slate-600">{obligation.account_or_consumer_no}</span></span>
              )}
              {obligation.assigned_member_name && (
                <span className="flex items-center gap-1 text-slate-600">
                  <User className="w-3 h-3 text-slate-400" /> {obligation.assigned_member_name}
                </span>
              )}
              {obligation.payment_reference && (
                <span className="text-emerald-700 font-mono">Ref: {obligation.payment_reference}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 sm:gap-1 mt-2 sm:mt-0">
          <div className="text-right">
            <span className="text-lg font-bold text-slate-900">
              ₹{obligation.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div>{getDueBadge()}</div>
        </div>
      </div>

      {/* Action Buttons */}
      {!isCompleted && obligation.status !== 'paid' && obligation.status !== 'completed' && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          {onSnooze && (
            <button
              onClick={() => onSnooze(obligation)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" /> Snooze
            </button>
          )}

          {onPay && (
            <button
              onClick={() => onPay(obligation)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(obligation.id)}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors ml-1"
              title="Delete obligation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
