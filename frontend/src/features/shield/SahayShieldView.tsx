import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Key,
  FileText,
  UserCheck,
  Smartphone,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Database,
  Info,
} from 'lucide-react';
import { shieldService } from '../../services/shieldService';
import {
  AuditLogItem,
  ConsentRecord,
  ConsentType,
  DataExportResponse,
  SecurityActivityOverview,
  SecurityEventItem,
  SecuritySessionItem,
} from '../../types/shield';

export const SahayShieldView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'consents' | 'sessions' | 'privacy'>('audit');
  const [overview, setOverview] = useState<SecurityActivityOverview | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [sessions, setSessions] = useState<SecuritySessionItem[]>([]);
  const [events, setEvents] = useState<SecurityEventItem[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<DataExportResponse | null>(null);

  // Deletion Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ov, logs, cList, sessList, evList] = await Promise.all([
        shieldService.getActivityOverview(),
        shieldService.listAuditLogs(),
        shieldService.listConsents(),
        shieldService.listSessions(),
        shieldService.listEvents(),
      ]);
      setOverview(ov);
      setAuditLogs(logs);
      setConsents(cList);
      setSessions(sessList);
      setEvents(evList);
    } catch (err) {
      console.error('Failed to load shield data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleConsent = async (consentType: ConsentType, currentConsent?: ConsentRecord) => {
    try {
      if (currentConsent && currentConsent.is_granted) {
        await shieldService.withdrawConsent(currentConsent.id);
      } else {
        const descriptions: Record<ConsentType, string> = {
          ocr_processing: 'Extract text, fields, and dates from uploaded family documents and bills',
          ai_retrieval: 'Allow Sahay AI Assistant to index authorized household records for grounded Q&A',
          emergency_sharing: 'Allow generating temporary 24-hour public emergency health profile cards',
          health_processing: 'Enable vitals, allergies, conditions, and medication management',
          sms_bill_reading: 'Process household bill notifications and due dates',
          data_sharing: 'Controlled intra-household sharing across family members',
        };
        await shieldService.grantConsent({
          consent_type: consentType,
          purpose_description: descriptions[consentType] || 'Authorized household data processing',
        });
      }
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update consent status');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this device session?')) return;
    try {
      await shieldService.revokeSession(sessionId);
      loadData();
    } catch (err) {
      console.error('Failed to revoke session', err);
    }
  };

  const handleTriggerExport = async () => {
    try {
      setIsExporting(true);
      const res = await shieldService.requestDataExport({
        include_documents: true,
        include_health: true,
        include_daily: true,
        include_goals: true,
      });
      setExportResult(res);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to export household data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword || !deleteReason) return;
    try {
      setDeleteSubmitting(true);
      const res = await shieldService.requestDataDeletion({
        reason: deleteReason,
        confirm_password: deletePassword,
      });
      setDeleteMessage(res.message);
      setIsDeleteModalOpen(false);
      setDeletePassword('');
      setDeleteReason('');
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to register deletion request');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const filteredLogs = auditLogs.filter((l) => {
    if (selectedModule === 'all') return true;
    return l.module === selectedModule;
  });

  const availableConsents: { type: ConsentType; title: string; desc: string }[] = [
    {
      type: 'ocr_processing',
      title: 'Document Doctor OCR Extraction',
      desc: 'Automatic optical character recognition and field verification on uploaded utility bills and certificates.',
    },
    {
      type: 'ai_retrieval',
      title: 'Sahay AI Assistant Context Indexing',
      desc: 'Allows the permission-aware AI assistant to index authorized family records to provide grounded answers.',
    },
    {
      type: 'emergency_sharing',
      title: 'First-Responder Emergency Sharing',
      desc: 'Enables creation of 24-hour expiring emergency links for paramedics or doctors in medical crises.',
    },
    {
      type: 'health_processing',
      title: 'Health Shield Clinical Profiling',
      desc: 'Enables blood group tracking, life-threatening allergy alerts, and medication schedules.',
    },
    {
      type: 'sms_bill_reading',
      title: 'Automated Bill & Reminder Parsing',
      desc: 'Parses upcoming utility obligations and sends proactive renewal reminders.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>Sahay Shield</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Protected & Active
                </span>
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Trust, Security, Consent Governance, and DPDP / GDPR Compliance Infrastructure
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>AES-256-GCM Envelope Encryption</span>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Security Status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {deleteMessage && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{deleteMessage}</span>
        </div>
      )}

      {/* Security Health Metrics Overview */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Immutable Audit Logs
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-indigo-600">
                {overview.total_audit_events_count}
              </span>
              <span className="text-xs text-slate-400">Events Recorded</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Active Consents
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-600">
                {overview.active_consents_count}
              </span>
              <span className="text-xs text-emerald-600 font-medium">Purposes Authorized</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Active Device Sessions
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-slate-800">
                {overview.active_sessions_count}
              </span>
              <span className="text-xs text-slate-400">Monitored</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Security Anomalies
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-600">
                {overview.unresolved_security_events_count}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">Zero Unresolved</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-5 rounded-xl shadow-sm">
        {[
          { key: 'audit', label: 'Audit Trail', icon: FileText },
          { key: 'consents', label: 'Consent Management', icon: UserCheck },
          { key: 'sessions', label: 'Active Devices', icon: Smartphone },
          { key: 'privacy', label: 'Data Rights & Export', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-3.5 px-3 text-xs font-semibold border-b-2 transition-all ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Filter by Module:</span>
              {['all', 'vault', 'health', 'daily', 'lakshya', 'ai', 'security'].map((mod) => (
                <button
                  key={mod}
                  onClick={() => setSelectedModule(mod)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-colors ${
                    selectedModule === mod
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400">Showing {filteredLogs.length} events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold">Module</th>
                  <th className="py-3 px-4 font-semibold">IP Address</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No audit records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {log.user_name || 'Member'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                        {log.action}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {log.module}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {log.ip_address || 'Internal'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.status === 'success'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CONSENT MANAGEMENT */}
      {activeTab === 'consents' && (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Granular Consent Control (DPDP 2023 Compliant): </span>
              SAHAY only processes data for purposes you explicitly authorize. You can grant or
              withdraw processing consent at any moment.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableConsents.map((item) => {
              const matched = consents.find((c) => c.consent_type === item.type);
              const isGranted = matched ? matched.is_granted : false;
              return (
                <div
                  key={item.type}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-slate-900">{item.title}</h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isGranted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isGranted ? 'Granted' : 'Revoked / Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{item.desc}</p>
                    {matched && matched.granted_at && (
                      <span className="text-[10px] text-slate-400 block mt-3">
                        Last updated: {new Date(matched.granted_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-end">
                    <button
                      onClick={() => handleToggleConsent(item.type, matched)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors ${
                        isGranted
                          ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isGranted ? 'Withdraw Consent' : 'Grant Consent'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVE SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-base text-slate-900">Connected Devices & Logins</h3>
            <p className="text-xs text-slate-500">
              Manage devices with access to your household account. Revoke unfamiliar sessions.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {sessions.map((sess) => (
              <div key={sess.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{sess.device_info}</span>
                      {sess.is_revoked ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                          Revoked
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      IP: {sess.ip_address || '127.0.0.1'} • Last active:{' '}
                      {new Date(sess.last_seen_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!sess.is_revoked && (
                  <button
                    onClick={() => handleRevokeSession(sess.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                  >
                    Revoke Device
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DATA RIGHTS & PRIVACY */}
      {activeTab === 'privacy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Data Export Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-900">Export Household Data</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Download a complete, machine-readable JSON archive of all your family vault
                documents, obligations, health records, and Lakshya savings goals.
              </p>
            </div>

            <button
              onClick={handleTriggerExport}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Packaging Archive...' : 'Generate Household Export'}</span>
            </button>

            {exportResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                <div className="font-semibold">Archive Generated Successfully!</div>
                <div>Documents: {exportResult.summary.documents_count || 0}</div>
                <div>Obligations: {exportResult.summary.obligations_count || 0}</div>
                <div>Health Profiles: {exportResult.summary.health_profiles_count || 0}</div>
                <div>Goals: {exportResult.summary.goals_count || 0}</div>
                <div className="text-[10px] text-emerald-600 font-mono mt-1">
                  Ready at: {exportResult.download_url}
                </div>
              </div>
            )}
          </div>

          {/* Data Deletion Box */}
          <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-red-900">Right to be Forgotten</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Permanently purge your household account and all associated family records. This
                action requires Household Owner authorization and password confirmation.
              </p>
            </div>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Request Account Deletion</span>
            </button>
          </div>
        </div>
      )}

      {/* Deletion Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-red-100 space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Data Deletion Request</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This request will place your entire household, documents, health profiles, and savings
              vaults into a grace deletion queue. Please verify your password to proceed.
            </p>

            <form onSubmit={handleDeleteRequest} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Reason for Deletion
                </label>
                <input
                  type="text"
                  required
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Closing household account"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteSubmitting}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {deleteSubmitting ? 'Verifying...' : 'Submit Deletion Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SahayShieldView;
