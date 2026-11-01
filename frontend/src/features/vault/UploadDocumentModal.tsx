import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  User,
  Shield,
  Tag,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { vaultService } from '../../services/vaultService';
import { DocumentCategory, DocumentAccessLevel } from '../../types/vault';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (documentId: string) => void;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { activeHousehold } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('household');
  const [targetMemberId, setTargetMemberId] = useState<string>('');
  const [accessLevel, setAccessLevel] = useState<DocumentAccessLevel>('shared_adults');
  const [tags, setTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleUsePreset = (presetType: 'electricity' | 'insurance' | 'aadhaar' | 'prescription') => {
    let sampleContent = '';
    let fileName = '';
    let sampleTitle = '';
    let cat: DocumentCategory = 'household';

    if (presetType === 'electricity') {
      sampleTitle = 'MSEB Electricity Bill - Oct 2026';
      fileName = 'mseb_electricity_bill_oct.pdf';
      cat = 'household';
      sampleContent = `
MAHADISCOM - Maharashtra State Electricity Distribution Co. Ltd.
Consumer No: 02847192841
Billing Unit: 4821
Bill Date: 28-Oct-2026
Due Date: 15-Nov-2026
Total Amount Due: Rs. 1,450.00
Consumer Name: Rajesh Sharma
Address: Flat 402, Gokul Dham Society, Pune
      `;
    } else if (presetType === 'insurance') {
      sampleTitle = 'LIC Jeevan Anand Policy';
      fileName = 'lic_insurance_policy.pdf';
      cat = 'financial';
      sampleContent = `
Life Insurance Corporation of India (LIC)
Policy Schedule - Jeevan Anand
Policy Number: POL-98471923
Policyholder Name: Rajesh Sharma
Sum Insured: Rs. 10,00,000.00
Premium Amount: Rs. 18,500.00
Renewal Due Date: 28-Dec-2026
Status: In-Force
      `;
    } else if (presetType === 'aadhaar') {
      sampleTitle = 'Aadhaar Card - Rajesh';
      fileName = 'aadhaar_card_rajesh.pdf';
      cat = 'identity';
      sampleContent = `
Government of India - Unique Identification Authority of India (UIDAI)
Mera Aadhaar, Meri Pehchan
Name: Rajesh Sharma
DOB: 14/05/1982
Gender: Male
Aadhaar Number: 9142 5819 3218
      `;
    } else {
      sampleTitle = 'Clinic Prescription - Dr. Joshi';
      fileName = 'clinic_prescription_nov.pdf';
      cat = 'health';
      sampleContent = `
Dr. A. K. Joshi (MD Medicine)
Consultant Physician, Joshi Polyclinic
Date: 02-Nov-2026
Patient Name: Satish Sharma (Age: 71)
Diagnosis: Hypertension, Type 2 Diabetes
Rx:
1. Tab Telmisartan 40mg - 1 tablet daily morning (OD)
2. Tab Metformin 500mg - 1 tablet twice daily with meals (BD)
Refill after: 30 days
      `;
    }

    const blob = new Blob([sampleContent], { type: 'application/pdf' });
    const sampleFile = new File([blob], fileName, { type: 'application/pdf' });
    setFile(sampleFile);
    setTitle(sampleTitle);
    setCategory(cat);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select or create a document to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('category', category);
    if (targetMemberId) formData.append('target_member_id', targetMemberId);
    formData.append('access_level', accessLevel);
    if (tags) formData.append('tags', tags);

    try {
      const doc = await vaultService.uploadDocument(formData);
      onSuccess(doc.id);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sahay-600 text-white">
              <UploadCloud className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Upload to Family Vault</h2>
              <p className="text-[11px] text-gray-500">
                Document Doctor will automatically read and classify your file
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

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {/* Quick presets for instant testing */}
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="h-3 w-3 text-sahay-600" />
                <span>Instant Test Sample Documents</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => handleUsePreset('electricity')}
                className="rounded-lg border border-gray-200 bg-white p-2 text-xs hover:border-sahay-400 transition-colors"
              >
                <div className="font-semibold text-gray-900">⚡ Electricity Bill</div>
                <div className="text-[10px] text-gray-500">MSEB ₹1,450 Due Nov 15</div>
              </button>
              <button
                type="button"
                onClick={() => handleUsePreset('insurance')}
                className="rounded-lg border border-gray-200 bg-white p-2 text-xs hover:border-sahay-400 transition-colors"
              >
                <div className="font-semibold text-gray-900">🛡️ Insurance Policy</div>
                <div className="text-[10px] text-gray-500">LIC ₹18,500 Premium</div>
              </button>
              <button
                type="button"
                onClick={() => handleUsePreset('aadhaar')}
                className="rounded-lg border border-gray-200 bg-white p-2 text-xs hover:border-sahay-400 transition-colors"
              >
                <div className="font-semibold text-gray-900">🆔 Aadhaar Card</div>
                <div className="text-[10px] text-gray-500">UIDAI with PII Masking</div>
              </button>
              <button
                type="button"
                onClick={() => handleUsePreset('prescription')}
                className="rounded-lg border border-gray-200 bg-white p-2 text-xs hover:border-sahay-400 transition-colors"
              >
                <div className="font-semibold text-gray-900">💊 Clinic Rx</div>
                <div className="text-[10px] text-gray-500">Dr. Joshi Prescription</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* File Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Select File (PDF, JPG, PNG) *
              </label>
              <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-4 hover:border-sahay-400 transition-colors bg-white">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <FileText className="h-8 w-8 text-sahay-500 mb-1" />
                <span className="text-xs font-medium text-gray-800">
                  {file ? file.name : 'Click or drag document here'}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Maximum file size: 25 MB'}
                </span>
              </div>
            </div>

            {/* Document Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Document Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. MSEB Electricity Bill - Oct 2026"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-sahay-500 focus:outline-none"
              />
            </div>

            {/* Category and Member Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-sahay-500 focus:outline-none"
                >
                  <option value="household">Household & Utility</option>
                  <option value="financial">Financial & Insurance</option>
                  <option value="identity">Identity & KYC</option>
                  <option value="health">Health & Medical</option>
                  <option value="education">Education & School</option>
                  <option value="other">Other Documents</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Family Member
                </label>
                <select
                  value={targetMemberId}
                  onChange={(e) => setTargetMemberId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-sahay-500 focus:outline-none"
                >
                  <option value="">Whole Household / Shared</option>
                  {activeHousehold?.members?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name || m.full_name} ({m.relationship || m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Access Permissions */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Family Access Level *
              </label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as DocumentAccessLevel)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-sahay-500 focus:outline-none"
              >
                <option value="shared_adults">Shared with Adults & Owner (Recommended)</option>
                <option value="household">Entire Household (All members & children)</option>
                <option value="private">Private (Only me; requires approval to share)</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tags (Optional)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. utility, mseb, bill, urgent"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-sahay-500 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading || !file}
                className="flex items-center space-x-1.5 rounded-xl bg-sahay-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sahay-700 disabled:opacity-50"
              >
                {isUploading ? (
                  <span>Processing with Document Doctor...</span>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    <span>Upload & Process</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
