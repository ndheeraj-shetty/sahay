import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Phone,
  Shield,
  Heart,
  Pill,
  Hospital,
  Check,
} from 'lucide-react';
import { healthService } from '../../services/healthService';
import { EmergencyCardData } from '../../types/health';

export const PublicEmergencyView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [card, setCard] = useState<EmergencyCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadPublicCard(token);
    }
  }, [token]);

  const loadPublicCard = async (t: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await healthService.getPublicEmergencyCard(t);
      setCard(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'This emergency access link is invalid, expired, or has been revoked.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-500 max-w-2xl w-full overflow-hidden">
        {/* Urgent Emergency Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white ring-4 ring-white/10 animate-pulse">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-white text-red-700">
                  Paramedic / First Responder Emergency Access
                </span>
              </div>
              <h1 className="text-2xl font-black text-white mt-0.5">
                {card?.patient_name || 'Emergency Medical Card'}
              </h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 bg-slate-50/50">
          {isLoading && (
            <div className="py-12 text-center text-sm text-slate-500">
              Retrieving critical health records from secure vault...
            </div>
          )}

          {error && (
            <div className="p-4 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">
              <p className="font-bold">Access Denied</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {card && (
            <>
              {/* Primary Vitals Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-xl border-2 border-red-300 shadow-sm text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Blood Group
                  </span>
                  <p className="text-4xl font-black text-red-600 mt-1">{card.blood_group}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Organ Donor
                  </span>
                  <p className={`text-base font-bold mt-2 ${card.organ_donor ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {card.organ_donor ? 'YES (Registered)' : 'No'}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Active Medications
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
                    <span>Current Active Medications</span>
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

              {/* Immediate Emergency Contacts */}
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
                </div>
              </div>

              {/* Hospital & Health Insurance Desk */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Hospital className="w-3.5 h-3.5 text-blue-600" />
                    <span>Preferred Hospital & Doctor</span>
                  </h4>
                  <p className="font-semibold text-slate-900">{card.preferred_hospital || 'Not specified'}</p>
                  {card.preferred_doctor && (
                    <p className="text-slate-600 mt-0.5">
                      Doctor: {card.preferred_doctor} {card.doctor_phone && `(${card.doctor_phone})`}
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Health Insurance Policy</span>
                  </h4>
                  <p className="font-semibold text-slate-900">{card.insurance_provider || 'Not on file'}</p>
                  {card.insurance_policy_no && (
                    <p className="font-mono font-bold text-slate-700 mt-0.5">
                      Policy No: {card.insurance_policy_no}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-center pt-2 text-[11px] text-slate-400">
                SAHAY Emergency Access • Time-Limited Cryptographic Share
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
