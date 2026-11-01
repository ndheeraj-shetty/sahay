import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Phone,
  Shield,
  Heart,
  Pill,
  Hospital,
  Share2,
  Copy,
  Check,
  Ban,
  Activity,
  FileText,
} from 'lucide-react';
import { healthService } from '../../services/healthService';
import { EmergencyCardData, EmergencyShareData } from '../../types/health';

interface EmergencyCardModalProps {
  profileId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyCardModal: React.FC<EmergencyCardModalProps> = ({
  profileId,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [card, setCard] = useState<EmergencyCardData | null>(null);
  const [shareData, setShareData] = useState<EmergencyShareData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCard();
  }, [profileId]);

  const loadCard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await healthService.getEmergencyCard(profileId);
      setCard(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load emergency card');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateShare = async () => {
    try {
      setIsSharing(true);
      const share = await healthService.createEmergencyShare(profileId, 24);
      setShareData(share);
    } catch (err: any) {
      alert('Failed to generate emergency link');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!shareData) return;
    try {
      await healthService.revokeEmergencyShare(shareData.id);
      setShareData(null);
      alert('Emergency share link has been revoked.');
    } catch (err: any) {
      alert('Failed to revoke emergency link');
    }
  };

  const handleCopy = () => {
    if (!shareData) return;
    const fullUrl = `${window.location.origin}${shareData.public_url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-500 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Urgent Emergency Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white ring-4 ring-white/10 animate-pulse">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-white text-red-700">
                  Emergency Medical Mode
                </span>
                <span className="text-xs text-red-100">Sahay Health Shield</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
                {card?.patient_name || 'Loading Patient...'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto p-6 space-y-5 bg-slate-50/50">
          {isLoading && (
            <div className="py-12 text-center text-sm text-slate-500">
              Retrieving critical health records...
            </div>
          )}

          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {card && (
            <>
              {/* Primary Vitals Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border-2 border-red-200 shadow-sm text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Blood Group
                  </span>
                  <p className="text-3xl font-black text-red-600 mt-1">{card.blood_group}</p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Family Role
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-2 capitalize">{card.relationship_role}</p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Organ Donor
                  </span>
                  <p className={`text-sm font-bold mt-2 ${card.organ_donor ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {card.organ_donor ? 'YES (Registered)' : 'No'}
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Active Meds
                  </span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{card.current_medications.length}</p>
                </div>
              </div>

              {/* CRITICAL ALERT BANNER: Life-Threatening Allergies */}
              {card.life_threatening_allergies.length > 0 ? (
                <div className="bg-red-600 text-white p-4 rounded-xl shadow-md border-2 border-red-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-300 animate-bounce" />
                    <h3 className="font-extrabold text-sm uppercase tracking-wide text-white">
                      CRITICAL: Life-Threatening Allergies (Do Not Administer)
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {card.life_threatening_allergies.map((a) => (
                      <div key={a.id} className="bg-red-700/80 p-2.5 rounded-lg border border-red-500">
                        <p className="font-bold text-white text-sm">⚠ {a.allergen}</p>
                        <p className="text-xs text-red-200 mt-0.5">
                          {a.reaction_description || 'Severe Anaphylactic Risk'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>No life-threatening drug/food allergies recorded on file.</span>
                </div>
              )}

              {/* Critical Medical Conditions */}
              {card.critical_conditions.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-red-500" />
                    <span>Critical / Active Medical Conditions</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {card.critical_conditions.map((c) => (
                      <span
                        key={c.id}
                        className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold"
                      >
                        {c.name} {c.notes ? `(${c.notes})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Active Medications */}
              {card.current_medications.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Current Active Medications & Regimen</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {card.current_medications.map((m) => (
                      <div key={m.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <strong className="text-slate-900">{m.name}</strong> — {m.dosage}
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          {m.frequency.replace('_', ' ')} • {m.timing.replace('_', ' ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency Contacts */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-rose-600" />
                  <span>Immediate Emergency Contacts</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {card.emergency_contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-xs text-slate-900">{contact.name}</strong>
                          {contact.is_primary && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-600 text-white">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{contact.relationship}</p>
                      </div>
                      <a
                        href={`tel:${contact.phone_number}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                      >
                        <Phone className="w-3 h-3" /> Call
                      </a>
                    </div>
                  ))}
                  {card.emergency_contacts.length === 0 && (
                    <p className="text-xs text-slate-400 py-1">No emergency contacts listed.</p>
                  )}
                </div>
              </div>

              {/* Hospital & Health Insurance for ER Reception */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Hospital className="w-3.5 h-3.5 text-blue-600" />
                    <span>Preferred Hospital & Doctor</span>
                  </h4>
                  <p className="text-xs font-semibold text-slate-900">
                    {card.preferred_hospital || 'Not specified'}
                  </p>
                  {card.preferred_doctor && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      Doctor: {card.preferred_doctor} {card.doctor_phone && `(${card.doctor_phone})`}
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Health Insurance Policy</span>
                  </h4>
                  <p className="text-xs font-semibold text-slate-900">
                    {card.insurance_provider || 'Not on file'}
                  </p>
                  {card.insurance_policy_no && (
                    <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">
                      Policy No: {card.insurance_policy_no}
                    </p>
                  )}
                </div>
              </div>

              {/* Emergency Share Link Section */}
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-slate-700" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Temporary First Responder Access Link (24 Hours)
                    </h4>
                  </div>
                  {!shareData ? (
                    <button
                      onClick={handleGenerateShare}
                      disabled={isSharing}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      {isSharing ? 'Generating...' : 'Generate Emergency Link'}
                    </button>
                  ) : (
                    <button
                      onClick={handleRevokeShare}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                    >
                      <Ban className="w-3 h-3" /> Revoke Access
                    </button>
                  )}
                </div>

                {shareData && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <p className="text-xs text-slate-600">
                      Share this time-limited link with paramedics, hospital ER, or ambulance crew. It allows direct read-only access to this emergency card without requiring login.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}${shareData.public_url}`}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700"
                      />
                      <button
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
