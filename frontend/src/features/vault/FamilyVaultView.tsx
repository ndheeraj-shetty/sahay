import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderArchive,
  UploadCloud,
  Search,
  Filter,
  FileText,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  Lock,
  Tag,
  User,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { vaultService } from '../../services/vaultService';
import { DocumentCategory, DocumentResponse } from '../../types/vault';
import { UploadDocumentModal } from './UploadDocumentModal';
import { DocumentVerificationModal } from './DocumentVerificationModal';

export const FamilyVaultView: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, activeHousehold, openAuthModal } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', activeHousehold?.id, selectedCategory, selectedMember, searchQuery],
    queryFn: () =>
      vaultService.listDocuments({
        category: selectedCategory !== 'all' ? (selectedCategory as DocumentCategory) : undefined,
        member_id: selectedMember !== 'all' ? selectedMember : undefined,
        search: searchQuery.trim() || undefined,
      }),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: vaultService.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const requestAccessMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      vaultService.requestAccess(id, reason),
    onSuccess: () => {
      alert('Access request submitted to the document owner.');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sahay-50 text-sahay-600">
          <FolderArchive className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-gray-900">Sign In to Access Family Vault</h2>
        <p className="mt-2 max-w-md text-xs text-gray-500">
          Family Vault is your family's centralized, encrypted repository for Aadhaar, insurance
          policies, bills, prescriptions, and certificates.
        </p>
        <button
          onClick={openAuthModal}
          className="mt-6 rounded-xl bg-sahay-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sahay-700 transition-colors"
        >
          Sign In to Vault
        </button>
      </div>
    );
  }

  const categories = [
    { id: 'all', label: 'All Documents' },
    { id: 'household', label: '⚡ Household & Bills' },
    { id: 'financial', label: '📈 Financial & Insurance' },
    { id: 'identity', label: '🆔 Identity & KYC' },
    { id: 'health', label: '💊 Health & Medical' },
    { id: 'education', label: '🎓 Education' },
    { id: 'other', label: '📁 Other' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sahay-600 text-white font-bold text-xl shadow-sm">
            <FolderArchive className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-gray-900">Family Vault</h1>
              <span className="rounded-full bg-sahay-50 px-2.5 py-0.5 text-[11px] font-semibold text-sahay-700 border border-sahay-200">
                Phase 3 Active
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              Encrypted document storage with Document Doctor intelligence & role-based permissions
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center space-x-1.5 rounded-xl bg-sahay-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sahay-700 transition-colors self-start sm:self-auto"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, issuer, tag, or keywords..."
            className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-4 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none"
          />
        </div>

        {/* Member Filter Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-500 shrink-0">Member:</span>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-sahay-500 focus:outline-none bg-white"
          >
            <option value="all">Everyone's Documents</option>
            {activeHousehold?.members?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name || m.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              selectedCategory === cat.id
                ? 'bg-sahay-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Document Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-gray-400">Loading documents from Vault...</div>
      ) : documents?.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <FolderArchive className="h-10 w-10 text-gray-300 mb-2" />
          <h3 className="font-semibold text-gray-800 text-sm">No documents in this view</h3>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            Upload your household's electricity bills, insurance policies, Aadhaar cards, or prescriptions.
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="mt-4 rounded-xl bg-sahay-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sahay-700"
          >
            Upload First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents?.map((doc) => {
            const isOwnerOrAdmin = activeHousehold?.my_role === 'owner' || doc.owner_user_id === user.id;

            return (
              <div
                key={doc.id}
                className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-sahay-300 hover:shadow-md transition-all"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 uppercase tracking-wide">
                      {doc.document_type.replace(/_/g, ' ')}
                    </span>

                    {doc.is_verified ? (
                      <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => setVerifyingDocId(doc.id)}
                        className="inline-flex items-center space-x-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200 hover:bg-amber-100"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Needs Verification</span>
                      </button>
                    )}
                  </div>

                  {/* Document Title */}
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{doc.title}</h3>
                  {doc.issuer && (
                    <p className="text-xs font-medium text-sahay-700 mt-0.5">{doc.issuer}</p>
                  )}

                  {/* Metadata Tags */}
                  <div className="mt-3 space-y-1.5 text-[11px] text-gray-500">
                    <div className="flex items-center space-x-1.5">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      <span>Belongs to: {doc.target_member_name || doc.owner_name || 'Household'}</span>
                    </div>

                    {doc.expiry_date && (
                      <div className="flex items-center space-x-1.5 text-amber-700 font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Expires / Due: {doc.expiry_date}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-1.5 font-mono text-[10px] text-gray-400">
                      <span>SHA256: {doc.file_hash.slice(0, 10)}...</span>
                      <span>• {(doc.file_size / 1024).toFixed(0)} KB</span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-md px-2 py-0.5 border border-emerald-200 w-fit">
                      <Lock className="h-3 w-3 text-emerald-600" />
                      <span>{doc.encryption_algorithm || 'AES-256-GCM'} Encrypted</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                  {doc.can_access ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => vaultService.downloadDocument(doc.id, doc.file_name)}
                        className="flex items-center space-x-1 text-xs font-semibold text-sahay-600 hover:text-sahay-700"
                        title="Download / View original document"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </button>

                      <button
                        onClick={() => setVerifyingDocId(doc.id)}
                        className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 pl-2"
                        title="Inspect Document Doctor intelligence"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Doctor Info</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        requestAccessMutation.mutate({
                          id: doc.id,
                          reason: 'Need document for family admin',
                        })
                      }
                      className="flex items-center space-x-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Request Access</span>
                    </button>
                  )}

                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${doc.title}" from Family Vault?`)) {
                          deleteMutation.mutate(doc.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(docId) => {
          setIsUploadOpen(false);
          queryClient.invalidateQueries({ queryKey: ['documents'] });
          // Automatically prompt verification of newly uploaded document!
          setVerifyingDocId(docId);
        }}
      />

      {/* Verification Modal */}
      {verifyingDocId && (
        <DocumentVerificationModal
          documentId={verifyingDocId}
          isOpen={!!verifyingDocId}
          onClose={() => setVerifyingDocId(null)}
          onVerified={() => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
          }}
        />
      )}
    </div>
  );
};
