import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  X,
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Layers,
  FileText,
  RefreshCw,
  Info,
} from 'lucide-react';
import { vaultService } from '../../services/vaultService';
import { doctorService } from '../../services/doctorService';
import { DocumentResponse, DocumentCompareResponse, CompareFieldChange } from '../../types/vault';
import { ChatMarkdownRenderer } from '../assistant/ChatMarkdownRenderer';

interface DocumentCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBaselineId?: string | null;
  initialUpdatedId?: string | null;
}

export const DocumentCompareModal: React.FC<DocumentCompareModalProps> = ({
  isOpen,
  onClose,
  initialBaselineId,
  initialUpdatedId,
}) => {
  const [baselineDocId, setBaselineDocId] = useState<string>(initialBaselineId || '');
  const [updatedDocId, setUpdatedDocId] = useState<string>(initialUpdatedId || '');
  const [comparisonResult, setComparisonResult] = useState<DocumentCompareResponse | null>(null);

  // Fetch list of vault documents
  const { data: documents = [], isLoading: isLoadingDocs } = useQuery<DocumentResponse[]>({
    queryKey: ['documents'],
    queryFn: () => vaultService.listDocuments(),
    enabled: isOpen,
  });

  // Mutation to run comparison
  const compareMutation = useMutation({
    mutationFn: async () => {
      if (!baselineDocId || !updatedDocId) {
        throw new Error('Please select both a baseline and updated document to compare.');
      }
      return await doctorService.compareDocuments(baselineDocId, updatedDocId);
    },
    onSuccess: (data) => {
      setComparisonResult(data);
    },
  });

  if (!isOpen) return null;

  const handleRunComparison = () => {
    if (baselineDocId === updatedDocId) {
      alert('Please select two different documents to compare changes.');
      return;
    }
    compareMutation.mutate();
  };

  const getChangeBadge = (change: CompareFieldChange) => {
    switch (change.change_type) {
      case 'increased':
        // Determine if financial cost or coverage
        const isCost = change.field_name.includes('amount') || change.field_name.includes('premium');
        return isCost ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
            <TrendingUp className="h-3 w-3 text-rose-600" /> + Increased
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <TrendingUp className="h-3 w-3 text-emerald-600" /> + Upgraded
          </span>
        );
      case 'decreased':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <TrendingDown className="h-3 w-3 text-emerald-600" /> - Decreased
          </span>
        );
      case 'added':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            + New Clause
          </span>
        );
      case 'removed':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            - Removed
          </span>
        );
      case 'modified':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
            • Modified
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
            Unchanged
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/80 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">
                  Document Change Intelligence
                </h2>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wide border border-indigo-200">
                  What Changed?
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Compare renewals, updated bills, or agreements to detect cost shifts, coverage revisions, and new clauses.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Document Selection Form */}
        <div className="border-b border-slate-200 bg-slate-50/60 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Baseline Document */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Baseline Document (Previous Version / Old Policy / Past Month)
              </label>
              <select
                value={baselineDocId}
                onChange={(e) => setBaselineDocId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Baseline Document --</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.id === updatedDocId}>
                    {d.title} ({d.category} • {d.document_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Updated Document */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Updated Document (Renewal / Current Bill / New Addendum)
              </label>
              <select
                value={updatedDocId}
                onChange={(e) => setUpdatedDocId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Updated Document --</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.id === baselineDocId}>
                    {d.title} ({d.category} • {d.document_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-indigo-500" />
              Tip: Upload previous & renewed insurance policies or utility bills to see automated diffs.
            </span>
            <button
              onClick={handleRunComparison}
              disabled={!baselineDocId || !updatedDocId || compareMutation.isPending}
              className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {compareMutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Analyzing Changes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Compare What Changed</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error State */}
        {compareMutation.isError && (
          <div className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            <div className="flex items-center space-x-2 font-bold">
              <AlertTriangle className="h-4 w-4" />
              <span>Comparison Error</span>
            </div>
            <p className="mt-1">
              {(compareMutation.error as any)?.response?.data?.detail ||
                compareMutation.error.message ||
                'Could not compare documents. Ensure both documents have been processed by Document Doctor.'}
            </p>
          </div>
        )}

        {/* Comparison Results */}
        {comparisonResult && (
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Comparison Overview Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="flex items-center space-x-3">
                <div className="rounded-lg bg-white p-2 border border-indigo-200 text-indigo-600 shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-800">{comparisonResult.baseline_title}</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="text-xs font-bold text-indigo-700">{comparisonResult.updated_title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {comparisonResult.executive_summary}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200 shadow-xs">
                {comparisonResult.field_changes.length} Parameters Evaluated
              </span>
            </div>

            {/* Key Executive Alerts */}
            {comparisonResult.key_alerts && comparisonResult.key_alerts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  ⚡ Critical Deviations & Alerts
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {comparisonResult.key_alerts.map((alert, idx) => {
                    const isRose = alert.includes('🔴') || alert.toLowerCase().includes('increased cost') || alert.toLowerCase().includes('higher');
                    const isEmerald = alert.includes('🟢') || alert.toLowerCase().includes('savings') || alert.toLowerCase().includes('lower');
                    return (
                      <div
                        key={idx}
                        className={`flex items-start space-x-2 rounded-xl border p-3 text-xs leading-relaxed ${
                          isRose
                            ? 'border-rose-200 bg-rose-50/70 text-rose-900'
                            : isEmerald
                            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                            : 'border-blue-200 bg-blue-50/70 text-blue-900'
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">
                          {isRose ? (
                            <TrendingUp className="h-4 w-4 text-rose-600" />
                          ) : isEmerald ? (
                            <TrendingDown className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Calendar className="h-4 w-4 text-blue-600" />
                          )}
                        </span>
                        <span className="font-medium">{alert.replace(/^[🔴🟢📅⚠️]\s*/, '')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Side-by-Side Parameter Matrix Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                📊 Detailed Parameter Comparison Matrix
              </h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3.5">Parameter / Clause</th>
                      <th className="py-2.5 px-3.5">Baseline Document</th>
                      <th className="py-2.5 px-3.5">Updated Document</th>
                      <th className="py-2.5 px-3.5">Deviation / Shift</th>
                      <th className="py-2.5 px-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {comparisonResult.field_changes.map((change, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3.5 font-bold text-slate-900 capitalize">
                          {change.field_name.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600">
                          {change.baseline_value || <span className="text-slate-400 italic">—</span>}
                        </td>
                        <td className="py-2.5 px-3.5 font-medium text-slate-900">
                          {change.updated_value || <span className="text-slate-400 italic">—</span>}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-700 font-medium">
                          {change.impact_summary}
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          {getChangeBadge(change)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Semantic Explanation Card */}
            {comparisonResult.ai_explanation && (
              <div className="rounded-xl border border-indigo-200 bg-white p-5 shadow-xs">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                    SAHAY AI Document Explanation & Advice
                  </h4>
                </div>
                <div className="prose prose-xs max-w-none text-slate-700 leading-relaxed">
                  <ChatMarkdownRenderer content={comparisonResult.ai_explanation} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
