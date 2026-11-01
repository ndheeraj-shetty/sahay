import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  FileSearch,
  ArrowRight,
} from 'lucide-react';
import { doctorService } from '../../services/doctorService';
import { vaultService } from '../../services/vaultService';
import { ExtractedFieldResponse } from '../../types/vault';

interface DocumentVerificationModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export const DocumentVerificationModal: React.FC<DocumentVerificationModalProps> = ({
  documentId,
  isOpen,
  onClose,
  onVerified,
}) => {
  const queryClient = useQueryClient();
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [confirmObligation, setConfirmObligation] = useState(true);

  const { data: job, isLoading } = useQuery({
    queryKey: ['docDoctorResults', documentId],
    queryFn: () => doctorService.getResults(documentId),
    enabled: isOpen && !!documentId,
  });

  const { data: document } = useQuery({
    queryKey: ['documentDetail', documentId],
    queryFn: () => vaultService.getDocument(documentId),
    enabled: isOpen && !!documentId,
  });

  useEffect(() => {
    if (job?.extracted_fields) {
      const initial: Record<string, string> = {};
      job.extracted_fields.forEach((f) => {
        initial[f.field_name] = f.user_confirmed_value || f.field_value || '';
      });
      setFieldValues(initial);
    }
  }, [job]);

  const verifyMutation = useMutation({
    mutationFn: () => {
      const confirmed_fields = Object.entries(fieldValues).map(([name, val]) => ({
        field_name: name,
        confirmed_value: val,
      }));
      return doctorService.verifyDocument(documentId, {
        confirmed_fields,
        confirm_as_obligation: confirmObligation,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['docDoctorResults', documentId] });
      onVerified();
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Document Doctor Verification</h2>
              <p className="text-[11px] text-gray-500">
                Review extracted information and confirm before adding to household records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Document Summary Card */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200">
            <div>
              <h3 className="font-semibold text-gray-900 text-xs">{document?.title}</h3>
              <p className="text-[11px] text-gray-500 capitalize">
                Category: {document?.category} • Type: {job?.document_classification || document?.document_type}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-3 w-3" />
                <span>{job ? `${Math.round(job.confidence_score * 100)}% Confidence` : 'Analyzing...'}</span>
              </span>
            </div>
          </div>

          {/* Extracted Fields Form */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center space-x-1.5">
              <FileSearch className="h-3.5 w-3.5 text-sahay-600" />
              <span>Extracted Fields & Evidence</span>
            </h4>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading extracted fields...</div>
            ) : job?.extracted_fields?.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500">
                No structured fields detected. You can verify document directly.
              </div>
            ) : (
              <div className="space-y-3">
                {job?.extracted_fields.map((field) => (
                  <div
                    key={field.id}
                    className="rounded-xl border border-gray-200 p-3 hover:border-gray-300 transition-colors bg-white"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-800 capitalize">
                        {field.field_name.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center space-x-2">
                        {field.is_masked && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            PII Masked
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-gray-400">
                          {Math.round(field.confidence * 100)}% match
                        </span>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={fieldValues[field.field_name] || ''}
                      onChange={(e) =>
                        setFieldValues({ ...fieldValues, [field.field_name]: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-900 focus:border-sahay-500 focus:outline-none"
                    />

                    {field.source_evidence && (
                      <p className="mt-1.5 text-[10px] text-gray-400 italic">
                        Evidence: "{field.source_evidence}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sahay Daily obligation integration prompt */}
          <div className="rounded-xl bg-sky-50 p-3.5 border border-sky-200 text-xs text-sky-900 flex items-start space-x-2.5">
            <input
              type="checkbox"
              id="confirmObligation"
              checked={confirmObligation}
              onChange={(e) => setConfirmObligation(e.target.checked)}
              className="mt-0.5 rounded border-sky-300 text-sahay-600 focus:ring-sahay-500"
            />
            <label htmlFor="confirmObligation" className="cursor-pointer">
              <span className="font-semibold block text-sky-900">
                Track as Household Obligation in Sahay Daily
              </span>
              <span className="text-[11px] text-sky-700 block mt-0.5">
                Automatically monitors due dates and adds payment reminders to your family timeline.
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 border-t border-gray-100 px-6 py-4 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => verifyMutation.mutate()}
            disabled={verifyMutation.isPending}
            className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {verifyMutation.isPending ? (
              <span>Saving...</span>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm & Mark Verified</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
