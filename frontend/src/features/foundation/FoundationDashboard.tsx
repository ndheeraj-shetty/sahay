import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Server,
  Database,
  Container,
  Layers,
  ArrowRight,
  RefreshCw,
  FolderArchive,
  FileSearch,
  CalendarCheck2,
  HeartPulse,
  Target,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { systemService } from '../../services/api';

export const FoundationDashboard: React.FC = () => {
  const [manualPingResult, setManualPingResult] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  const {
    data: health,
    isLoading: healthLoading,
    refetch: refetchHealth,
    isRefetching: healthRefetching,
  } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: systemService.getHealth,
  });

  const { data: status } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: systemService.getStatus,
  });

  const handleManualPing = async () => {
    setIsPinging(true);
    try {
      const data = await systemService.getHealth();
      setManualPingResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setManualPingResult(`Error: ${err.message}`);
    } finally {
      setIsPinging(false);
    }
  };

  const modules = [
    {
      title: 'Family Vault',
      phase: 'Phase 3',
      icon: FolderArchive,
      desc: "Secure family document repository with client-side encryption and granular member permissions.",
      color: 'blue',
    },
    {
      title: 'Document Doctor',
      phase: 'Phase 3',
      icon: FileSearch,
      desc: 'OCR & LLM extraction engine for bills, EMIs, and policy renewals.',
      color: 'indigo',
    },
    {
      title: 'Sahay Daily',
      phase: 'Phase 4',
      icon: CalendarCheck2,
      desc: 'Unified timeline for household responsibilities with Today, Calendar, and Money views.',
      color: 'emerald',
    },
    {
      title: 'Health Shield',
      phase: 'Phase 5',
      icon: HeartPulse,
      desc: 'Family medical history, prescriptions, medicine refills, and 1-tap Emergency Mode.',
      color: 'rose',
    },
    {
      title: 'Lakshya Goal Vaults',
      phase: 'Phase 6',
      icon: Target,
      desc: 'Shared household savings goals with contributor allocation and risk calculations.',
      color: 'amber',
    },
    {
      title: 'Sahay AI Assistant',
      phase: 'Phase 7',
      icon: Sparkles,
      desc: 'Conversational assistant with permission-aware RAG Q&A and confirmed actions.',
      color: 'purple',
    },
    {
      title: 'Sahay Shield',
      phase: 'Phase 8',
      icon: ShieldCheck,
      desc: 'Central security layer: audit logs, consent tracking, and envelope encryption.',
      color: 'teal',
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero / Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sahay-700 via-sahay-600 to-sky-700 p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Phase 1 — Application Foundation Active</span>
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
            SAHAY: The Household Life-Admin OS
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-sahay-100">
            One trusted, permission-controlled system for Indian families to manage documents,
            bills, health records, savings goals, and everyday obligations.
          </p>
        </div>
      </div>

      {/* Foundation Verification Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Application Foundation Status</h2>
            <p className="text-xs text-gray-500">Live health verification of backend, frontend, database, and infrastructure</p>
          </div>
          <button
            onClick={() => refetchHealth()}
            disabled={healthRefetching}
            className="flex items-center space-x-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${healthRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh Health</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Frontend Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-sky-50 p-2 text-sky-600">
                <Layers className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                <span>Running</span>
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-gray-900">Frontend Client</h3>
            <p className="mt-1 text-xs text-gray-500">React + TypeScript + Vite + Tailwind</p>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <span>Port: 5173</span>
              <span className="font-mono text-emerald-600">Vite HMR Active</span>
            </div>
          </div>

          {/* Backend Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                <Server className="h-5 w-5" />
              </span>
              <span
                className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-xs font-medium border ${
                  health?.status === 'ok'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>{healthLoading ? 'Checking...' : health?.status === 'ok' ? 'Connected' : 'Degraded'}</span>
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-gray-900">FastAPI Backend</h3>
            <p className="mt-1 text-xs text-gray-500">Python 3.14 + Pydantic v2 + Uvicorn</p>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <span>API: /api/v1</span>
              <span className="font-mono text-sahay-600">v{health?.app_version || '1.0.0'}</span>
            </div>
          </div>

          {/* Database Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <Database className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                <span>{health?.database.status || 'Active'}</span>
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-gray-900">Database Layer</h3>
            <p className="mt-1 text-xs text-gray-500">
              {health?.database.mode === 'postgresql'
                ? 'PostgreSQL 16 (pgvector)'
                : 'SQLite Dev Mode (Zero-Config)'}
            </p>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <span>Dialect: {health?.database.dialect || 'sqlite'}</span>
              <span className="font-mono text-emerald-600">SQLAlchemy 2.0</span>
            </div>
          </div>

          {/* Docker Infrastructure Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-purple-50 p-2 text-purple-600">
                <Container className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center space-x-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                <span>Configured</span>
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-gray-900">Docker Services</h3>
            <p className="mt-1 text-xs text-gray-500">Postgres + Redis + MinIO Compose</p>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <span>docker-compose.yml</span>
              <span className="font-mono text-purple-600">Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live API Probe Test Area */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <Zap className="h-4 w-4 text-sahay-600" />
              <span>Direct API Connection Test</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Probe the FastAPI backend directly from your browser to verify CORS and response serialization.
            </p>
          </div>
          <button
            onClick={handleManualPing}
            disabled={isPinging}
            className="inline-flex items-center justify-center space-x-2 rounded-lg bg-sahay-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sahay-700 transition-colors disabled:opacity-50"
          >
            {isPinging ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Pinging /api/v1/health...</span>
              </>
            ) : (
              <>
                <span>Send API Test Ping</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>

        {manualPingResult && (
          <div className="mt-4 rounded-lg bg-slate-900 p-4 font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner">
            <div className="text-gray-400 text-[11px] mb-1">
              Response from GET /api/v1/health:
            </div>
            <pre>{manualPingResult}</pre>
          </div>
        )}
      </div>

      {/* SAHAY Seven Connected Modules Roadmap */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">SAHAY Seven Core Modules</h2>
          <p className="text-xs text-gray-500">
            Master roadmap for subsequent phases built on top of this foundation
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                className="relative flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-sahay-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-gray-50 p-2.5 text-gray-700 border border-gray-100">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      {m.phase}
                    </span>
                  </div>
                  <h3 className="mt-3.5 font-bold text-gray-900">{m.title}</h3>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">{m.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400 font-medium">
                  Modular Architecture
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
