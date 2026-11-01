import React, { useState } from 'react';
import { AboutFeatureButton } from '../../components/common/AboutFeatureButton';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  FileSearch,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  CreditCard,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { doctorService } from '../../services/doctorService';
import { vaultService } from '../../services/vaultService';
import { useAuth } from '../../context/AuthContext';
import { DocumentVerificationModal } from '../vault/DocumentVerificationModal';
import { DocumentCompareModal } from '../vault/DocumentCompareModal';
import { GitCompare } from 'lucide-react';

export const DocumentDoctorView: React.FC = () => {
  const { user, activeHousehold } = useAuth();
  const [smsText, setSmsText] = useState(
    'Your EMI of Rs. 18,500 for loan HL-88213 has been debited from A/c XX4912 on 05-Nov-2026.'
  );
  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const { data: documents } = useQuery({
    queryKey: ['documents', activeHousehold?.id],
    queryFn: () => vaultService.listDocuments(),
    enabled: !!user,
  });

  const parseMutation = useMutation({
    mutationFn: (text: string) => doctorService.parseFinancialEvent(text),
  });

  const sampleAlerts = [
    {
      label: 'Home Loan EMI Debit',
      text: 'Your EMI of Rs. 18,500 for loan HL-88213 has been debited from A/c XX4912 on 05-Nov-2026.',
    },
    {
      label: 'MSEB Electricity Payment',
      text: 'UPI payment of Rs. 1,450.00 to MAHADISCOM successful for Consumer No 02847192841 on 28-Oct-2026.',
    },
    {
      label: 'LIC Policy Premium Due',
      text: 'Premium notice: LIC Policy POL-98471923 of Rs. 18,500 is due on 28-Dec-2026. Pay before late fee.',
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-xl shadow-sm">
            <FileSearch className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-gray-900">Document Doctor</h1>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200">
                AI Intelligence Engine
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              Reads documents & financial alerts, extracts obligations, and verifies information with zero guesswork
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <AboutFeatureButton featureKey="doctor" />
          <button
            onClick={() => setIsCompareOpen(true)}
          className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors self-start sm:self-auto"
        >
          <GitCompare className="h-4 w-4" />
          <span>⚡ What Changed? (Compare)</span>
          </button>
        </div>
      </div>

      {/* Pipeline Architecture Cards */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-1">
          Document Intelligence & Extraction Pipeline
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Every uploaded document automatically passes through this rigorous verification pipeline:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400">STEP 1</div>
            <div className="mt-1 font-bold text-xs text-slate-800">OCR & Text</div>
            <div className="mt-0.5 text-[10px] text-slate-500">PDF / Image Streams</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400">STEP 2</div>
            <div className="mt-1 font-bold text-xs text-slate-800">Classification</div>
            <div className="mt-0.5 text-[10px] text-slate-500">Bill / Rx / Policy / ID</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400">STEP 3</div>
            <div className="mt-1 font-bold text-xs text-slate-800">Extraction</div>
            <div className="mt-0.5 text-[10px] text-slate-500">Due Date, Amount, No.</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400">STEP 4</div>
            <div className="mt-1 font-bold text-xs text-slate-800">Validation</div>
            <div className="mt-0.5 text-[10px] text-slate-500">Rule-based scoring</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400">STEP 5</div>
            <div className="mt-1 font-bold text-xs text-slate-800">PII Masking</div>
            <div className="mt-0.5 text-[10px] text-slate-500">Aadhaar & PAN Safe</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200">
            <div className="text-[10px] font-bold text-emerald-600">STEP 6</div>
            <div className="mt-1 font-bold text-xs text-emerald-900">User Confirm</div>
            <div className="mt-0.5 text-[10px] text-emerald-700">Verified Record</div>
          </div>
        </div>
      </div>

      {/* Financial SMS & Payment Alert Parser Workbench */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-1">
          <Zap className="h-4 w-4 text-amber-500" />
          <h2 className="text-base font-bold text-gray-900">
            Financial SMS & Payment Alert Intelligence
          </h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Test how Document Doctor detects recurring obligations and EMI payments from bank notification texts:
        </p>

        {/* Preset Sample Buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          {sampleAlerts.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => {
                setSmsText(sample.text);
                parseMutation.mutate(sample.text);
              }}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {sample.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <textarea
            rows={3}
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            placeholder="Paste financial SMS alert here..."
            className="w-full rounded-xl border border-gray-300 p-3 text-xs text-gray-900 font-mono focus:border-sahay-500 focus:outline-none"
          />

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => parseMutation.mutate(smsText)}
              disabled={parseMutation.isPending || !smsText.trim()}
              className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {parseMutation.isPending ? (
                <span>Parsing Event...</span>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Parse Financial Event</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Parsed Result Display */}
        {parseMutation.data && (
          <div className="mt-4 rounded-xl bg-slate-900 p-4 font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner">
            <div className="text-gray-400 text-[11px] mb-2 flex items-center justify-between">
              <span>Parsed Structured Household Event:</span>
              <span className="text-emerald-400 font-bold uppercase">
                {parseMutation.data.event_type}
              </span>
            </div>
            <pre>{JSON.stringify(parseMutation.data, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Documents Processed by Document Doctor */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-1">
          Recent Documents Processed by Document Doctor
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Click any document to inspect its extracted fields, confidence scores, and verification status.
        </p>

        <div className="divide-y divide-gray-100">
          {documents?.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-xs text-gray-900">{doc.title}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 uppercase">
                    {doc.document_type.replace(/_/g, ' ')}
                  </span>
                  {doc.is_verified ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      Verified
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                      Needs Verification
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  {doc.issuer || 'General Issuer'} • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>

              <button
                onClick={() => setVerifyingDocId(doc.id)}
                className="flex items-center space-x-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors self-start sm:self-auto"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Inspect & Verify</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Verification Modal */}
      {verifyingDocId && (
        <DocumentVerificationModal
          documentId={verifyingDocId}
          isOpen={!!verifyingDocId}
          onClose={() => setVerifyingDocId(null)}
          onVerified={() => {}}
        />
      )}

      {/* Document Change Intelligence - What Changed Modal */}
      <DocumentCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
      />
    </div>
  );
};
