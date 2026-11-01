import React from 'react';
import {
  X,
  Info,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  FileText,
  Calendar,
  HeartPulse,
  Target,
  Bot,
  Layers,
  Users,
  Lock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  FileSearch,
} from 'lucide-react';

export type FeatureKey =
  | 'foundation'
  | 'household'
  | 'daily'
  | 'vault'
  | 'doctor'
  | 'health'
  | 'lakshya'
  | 'assistant'
  | 'shield';

interface FeatureExplanation {
  title: string;
  badge: string;
  tagline: string;
  problem: string;
  solution: string;
  keyHighlights: string[];
  howItWorks: string[];
  techStack: string;
  demoGuide: string[];
}

export const FEATURE_EXPLANATIONS: Record<FeatureKey, FeatureExplanation> = {
  foundation: {
    title: 'SAHAY: The Household Life-Admin OS',
    badge: 'Project Overview & Foundation',
    tagline: 'India’s first privacy-first, unified life-administration operating system for families.',
    problem:
      'Indian families manage hundreds of disconnected obligations—insurance renewals, school fee deadlines, vehicle fitness, rent agreements, medical vitals, and shared savings—scattered across paper folders, WhatsApp chats, and isolated reminder apps with zero coordination or predictive intelligence.',
    solution:
      'SAHAY centralizes household intelligence into a single, permission-governed digital command center. It turns passive documents into active life-events, assigns responsibilities among family members, balances household cash flow with savings goals, and provides an explainable AI assistant with exact document evidence citations.',
    keyHighlights: [
      'Document Change Intelligence: Compares baseline and renewed policies to flag premium hikes, coverage changes, and new conditions.',
      'Household Life-Event Radar: Cross-connects documents into a chronological timeline with 1-click renewal task creation.',
      'Family Responsibility Intelligence: Detects bottlenecks, balances member workloads, and supports 1-click responsibility transfer.',
      'Explainable AI Assistant: Grounded with exact document source file, page number, confidence score, and highlighted evidence quotes.',
      'Emergency Mode Advisor: Smart crisis liquidity reallocator that mobilizes non-critical goals (car, vacation) before essential ones, with replenishment schedules.',
    ],
    howItWorks: [
      'FastAPI + PostgreSQL / SQLite backend with asynchronous SQLAlchemy ORM.',
      'Client-side envelope encryption and zero-knowledge consent architecture.',
      'Hybrid RAG engine powered by Google Gemini 3.1 Flash Lite with zero-hallucination verification guards.',
      'Reactive Light-Theme frontend built with React 18, TypeScript, Tailwind CSS, and Vite.',
    ],
    techStack: 'FastAPI • Python 3.14 • React 18 • TypeScript • Tailwind CSS • Gemini 3.1 • SQLite / PostgreSQL',
    demoGuide: [
      'Show the 7 Connected Modules in the navigation sidebar.',
      'Navigate to Sahay Daily to show the Life-Event Radar and Responsibility matrix.',
      'Open Document Doctor to demonstrate "What Changed?" policy comparison.',
      'Ask the AI Assistant a question to showcase source page evidence and zero hallucination.',
    ],
  },
  household: {
    title: 'Household & Family Governance',
    badge: 'Multi-Member Security',
    tagline: 'Granular family member roles, access controls, and collaborative administration.',
    problem:
      'A family is not a single user: parents, working children, elderly grandparents, and dependents each have distinct access needs and privacy boundaries.',
    solution:
      'SAHAY provides role-based governance with 4 member tiers: Owner, Admin, Member, and Dependent. Members can be invited via secure tokens, assigned responsibilities, and given compartmentalized access to health vitals or financial documents.',
    keyHighlights: [
      'Role Boundaries: Enforces strictly separate permissions so sensitive documents (e.g. wills, financial profiles) are not exposed to non-authorized members.',
      'Family Invitation Lifecycle: Generates invitation links with time-bounded tokens and one-click acceptance.',
      'Member Responsibility Tracking: Attributes upcoming bills, medicines, and tasks to specific responsible individuals.',
    ],
    howItWorks: [
      'Household models with cascading relationships to users and role-permission matrices.',
      'FastAPI dependency injection checking JWT household claims on every API request.',
      'Audit log recorded for every invitation creation, role update, and member addition.',
    ],
    techStack: 'FastAPI JWT Auth • SQLAlchemy Relationship Mapping • Pydantic v2 Schemas',
    demoGuide: [
      'Show the active household members with their assigned roles.',
      'Demonstrate inviting a new family member via the Invite Member modal.',
      'Explain how member IDs link directly to obligations and responsibility intelligence.',
    ],
  },
  daily: {
    title: 'Sahay Daily & Household Life-Event Radar',
    badge: 'Timeline & Responsibility Intelligence',
    tagline: 'Predictive household timeline connecting documents, obligations, and member responsibilities.',
    problem:
      'Families miss critical deadlines because electricity bills, car insurance renewals, and school fees arrive through completely different channels at different times of the month.',
    solution:
      'Sahay Daily integrates upcoming obligations, living expense profiles, and document expiries into a unified radar with 4 time horizons (Urgent, This Month, Upcoming, Future), paired with Family Responsibility Intelligence.',
    keyHighlights: [
      'Household Life-Event Radar: Automatically scans uploaded insurance policies, vehicle documents, and bills to map upcoming deadlines.',
      '1-Click Renewal Task: Instantly converts an expiring policy or vehicle renewal on the radar into an actionable obligation task.',
      'Family Responsibility Intelligence: Visualizes workload per family member, detects unassigned obligations, and flags bottlenecks.',
      '1-Click Delegation: Allows smooth, audited transfer of overdue obligations between authorized family members.',
      'Monthly Cash Flow & Money Profile: Real-time calculation of Expected Income vs Fixed Expenses vs Bills vs Net Surplus.',
    ],
    howItWorks: [
      'HouseholdRadarEngine aggregates data across Document Vault, Daily Obligations, and Health Medicines.',
      'FamilyResponsibilityEngine computes member workload scores, overdue metrics, and recommended re-assignments.',
      'Reactive Tab interface: Today Timeline, Monthly Calendar View, Money Profile, Life-Event Radar, and Responsibility Intelligence.',
    ],
    techStack: 'HouseholdRadarEngine • ResponsibilityEngine • Full-Calendar Engine • Tailwind Light Theme',
    demoGuide: [
      'Click the "Life-Event Radar" tab to show connected deadlines across documents and bills.',
      'Click "⚡ Create Renewal Task" on an expiring insurance policy to see it added instantly.',
      'Switch to "Responsibility Intelligence" tab to show member workloads and click "⚡ Approve Transfer".',
    ],
  },
  vault: {
    title: 'Family Vault & Document Change Intelligence',
    badge: 'Encrypted Digital Repository',
    tagline: 'Secure document storage with semantic version comparison ("What Changed?").',
    problem:
      'Most document vaults are dumb storage boxes: they store files, but cannot tell a family how this year\'s renewed health policy differs from last year’s policy.',
    solution:
      'Family Vault stores documents with category tagging and member access levels, and introduces Document Change Intelligence ("What Changed?") to compare baseline and renewed documents side-by-side.',
    keyHighlights: [
      'Document Change Intelligence: Semantic comparison matrix highlighting premium increases, coverage upgrades, new conditions, and expiry shifts.',
      'Executive Summary & Deviations: AI explanation of exactly what got better or worse in the new policy.',
      'Granular Access Control: Public, Family-Wide, or Restricted visibility per document.',
      'Integrity Verification: Digital verification stamps, checksum tracking, and OCR field extraction.',
    ],
    howItWorks: [
      'DocumentDoctorEngine compares structured key-value pairs between baseline and target documents.',
      'Evaluates price differences (percentage increase), coverage alterations, and text clause changes.',
      'Presents visual diff table with color-coded status badges (Increased, Changed, Added, Date Shift).',
    ],
    techStack: 'DocumentDoctorEngine • Semantic Diff Matrix • SQLite / Postgres BLOB Storage • React Modals',
    demoGuide: [
      'In Family Vault, click "⚡ Compare Documents" at the top.',
      'Select a baseline document (e.g. 2025 Health Policy) and a renewed document (2026 Health Policy).',
      'Show the comparison table highlighting Premium Increased (+₹3,500), Coverage Upgraded (+₹5 Lakhs), and AI explanation.',
    ],
  },
  doctor: {
    title: 'Document Doctor & Field Extraction',
    badge: 'AI Document Parsing',
    tagline: 'Automated OCR parsing and structured extraction of policies, bills, and medical receipts.',
    problem:
      'Families receive multi-page PDF documents and insurance policies filled with dense legalese, making it hard to find policy numbers, co-pay clauses, or due dates.',
    solution:
      'Document Doctor processes uploaded PDFs and images through OCR and Gemini-powered extraction, automatically generating verified key-value fields with confidence scores and source evidence snippets.',
    keyHighlights: [
      'Automated Field Extraction: Extracts biller names, policy numbers, premium amounts, due dates, and coverage limits.',
      'Confidence Scoring: Measures the extraction system’s reliability score for each extracted field.',
      'Human-in-the-Loop Verification: Allows family members to review, confirm, or edit extracted values.',
      'Seamless Vault Integration: Directly feeds extracted dates and amounts into the Life-Event Radar and AI Assistant.',
    ],
    howItWorks: [
      'DocumentDoctorService orchestrates background OCR and LLM-assisted document parsing.',
      'Stores extracted fields in database linked to source document with exact character offsets.',
    ],
    techStack: 'FastAPI Background Tasks • OCR & Text Parsing • Gemini Structured JSON Extraction',
    demoGuide: [
      'Open Document Doctor to view uploaded files and their extracted key-value fields.',
      'Highlight how extracted fields feature confidence scores (e.g. 96%) and evidence snippets.',
    ],
  },
  health: {
    title: 'Health Shield & Emergency Medical Card',
    badge: 'Family Medical Vitals',
    tagline: 'Centralized medical records, active medications, allergy warnings, and emergency cards.',
    problem:
      'In emergency hospitalizations, family members scramble to remember blood groups, critical drug allergies, or ongoing medications, causing dangerous treatment delays.',
    solution:
      'Health Shield tracks medical vitals for each family member—blood groups, chronic conditions, drug allergies, active prescriptions—and generates a 1-tap Emergency Medical Card with emergency contact dialing.',
    keyHighlights: [
      '1-Tap Emergency Card: Instant access to critical patient vitals, blood type, and primary physician contacts.',
      'Allergy Warnings: Categorized allergy tracker (Penicillin, Sulfa, Peanuts) with severity levels (Critical, Moderate, Mild).',
      'Medication Tracker: Active prescription doses with refill reminders and low-stock alerts.',
      'Emergency Share Links: Generate time-limited public emergency access tokens for hospital staff.',
    ],
    howItWorks: [
      'Normalized health database schemas linking health profiles, medicines, allergies, and emergency contacts.',
      'Dedicated public emergency view accessible via secure token without logging in.',
    ],
    techStack: 'HealthProfile Models • QR & Tokenized Public Access • React Emergency Modals',
    demoGuide: [
      'View family health vitals, active medications, and blood groups in Health Shield.',
      'Click "Emergency Card" to show the instant medical snapshot formatted for rapid hospital intake.',
    ],
  },
  lakshya: {
    title: 'Lakshya Goal Vaults & Crisis Emergency Mode',
    badge: 'Family Savings & Crisis Liquidity',
    tagline: 'Collaborative family savings vaults with run-rate risk analytics and Pandemic Emergency Mode.',
    problem:
      'Families either fail to save collaboratively for long-term dreams (car, house, education), or when an unexpected crisis hits (e.g. ₹5 Lakh hospital emergency), they panic and take predatory loans because savings are locked away.',
    solution:
      'Lakshya Goal Vaults allows family members to pledge monthly commitments toward shared goals. In addition, its **Emergency Mode** calculates smart liquidation from discretionary goals (car, vacation) while establishing a post-crisis restoration schedule.',
    keyHighlights: [
      'Shared Goal Vaults: Multi-contributor commitments for Car, Higher Education, Home Down Payment, and Vacation.',
      'Run-Rate Risk Analytics: Computes on-track status, monthly required run-rate, and projected completion dates.',
      '🚨 Crisis Emergency Mode: When a user urgently needs ₹5 Lakhs, it calculates liquid deficit and advises: "Take ₹X from Car goal, ₹Y from House goal."',
      '🛡️ Post-Crisis Restoration Plan: Generates monthly replenishment schedules so long-term dreams are restored once cash flow stabilizes.',
      '1-Click Emergency Withdrawal: Formally applies and audits the emergency withdrawal across goal balances.',
    ],
    howItWorks: [
      'GoalVault & GoalContributor models track balances, monthly pledges, and progress percentages.',
      'EmergencyModeAdvisor prioritizes goals by tier (discretionary liquidated first, essentials protected).',
    ],
    techStack: 'Lakshya Calculation Engine • Priority Liquidation Algorithm • Pydantic v2',
    demoGuide: [
      'Show Lakshya Dashboard with active family goals and progress bars.',
      'Click the "🚨 Emergency Mode" button at the top of Lakshya.',
      'Enter ₹5,00,000 to see the smart goal liquidation breakdown and restoration plan.',
    ],
  },
  assistant: {
    title: 'Explainable Sahay AI Assistant',
    badge: 'Permission-Aware RAG with Citations',
    tagline: 'Conversational assistant with exact document page evidence and zero hallucination.',
    problem:
      'Generic AI chatbots hallucinate dates, give vague financial answers, and cannot prove where their numbers came from, destroying user trust.',
    solution:
      'Sahay AI Assistant provides grounded, explainable answers. When asked a question, it cites the exact document file name, page number, confidence score, and highlighted text evidence. If information is missing, it strictly refuses to hallucinate.',
    keyHighlights: [
      'Exact Document Citations: Displays source file, page number, and measured confidence score.',
      'Highlighted Evidence Snippets: Shows the exact quoted clause from the original document.',
      'Zero-Hallucination Guard: Explicitly returns "I couldn\'t verify this information from your uploaded documents" when data is absent.',
      'Visual Light-Theme Formatting: Always renders answers in markdown tables, status badges, and executive overview cards.',
      'Confirmed Action Proposals: Suggests actionable items (create goals, add obligations) requiring 1-click user confirmation before execution.',
    ],
    howItWorks: [
      'Unified context ingestion aggregating Vault documents, Daily obligations, Money profile, and Health vitals.',
      'Powered by Google Gemini 3.1 Flash Lite with strict grounded system prompt instructions.',
      'Post-generation citation verification linking extracted entities back to document database IDs.',
    ],
    techStack: 'Gemini 3.1 Flash Lite • Grounded Citation Resolver • Custom React Markdown Table Renderer',
    demoGuide: [
      'Click the "Explainable Doc Verification" quick prompt pill.',
      'Show the assistant answer with table, page number badge, and highlighted evidence callout box.',
      'Click the "🚨 Crisis Emergency Mode (₹5L)" quick prompt to see the AI give the Car/House reallocation and restoration advice.',
    ],
  },
  shield: {
    title: 'Sahay Shield: Security & Audit Governance',
    badge: 'Privacy & Compliance',
    tagline: 'End-to-end encrypted private vault, zero-knowledge consent architecture, and immutable audit trails.',
    problem:
      'Household data is deeply private. Family members will not adopt a digital OS unless they have complete guarantee that their financial and medical records are safe and access is auditable.',
    solution:
      'Sahay Shield is the foundational security layer enforcing client-side encryption, immutable tamper-evident audit logs, granular consent tracking, and complete data portability / erasure under DPDP regulations.',
    keyHighlights: [
      'Immutable Audit Trail: Logs every document view, field extraction, member invitation, and emergency access event.',
      'Consent Management: Granular permission grants for sharing records with external doctors or emergency personnel.',
      'Zero-Knowledge Architecture: Data is compartmentalized and access is verified on every single API request.',
      'Data Portability & Erasure: Complete JSON export and GDPR / DPDP-compliant household data deletion.',
    ],
    howItWorks: [
      'AuditLog models record user_id, action, target_type, IP address, and timestamp for all actions.',
      'FastAPI middleware ensures role boundaries cannot be bypassed.',
    ],
    techStack: 'Audit Logging Engine • Consent Tracking • Privacy-First Architecture',
    demoGuide: [
      'Open Sahay Shield from the bottom-left sidebar link.',
      'Review recent security activity, audit logs, and active consents.',
    ],
  },
};

interface AboutFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureKey: FeatureKey;
}

export const AboutFeatureModal: React.FC<AboutFeatureModalProps> = ({
  isOpen,
  onClose,
  featureKey,
}) => {
  if (!isOpen) return null;

  const info = FEATURE_EXPLANATIONS[featureKey] || FEATURE_EXPLANATIONS.foundation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 my-8 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">{info.title}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                  {info.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{info.tagline}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Problem & Solution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-rose-50/60 border border-rose-100 rounded-2xl">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-800 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>The Problem It Solves</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{info.problem}</p>
            </div>

            <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>The SAHAY Solution</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{info.solution}</p>
            </div>
          </div>

          {/* Key Highlights */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Key Features & Innovations</span>
            </div>
            <div className="space-y-1.5 pt-1">
              {info.keyHighlights.map((highlight, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works & Architecture */}
          <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>How It Works (Technical Architecture)</span>
            </div>
            <div className="space-y-1 pt-1">
              {info.howItWorks.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 text-[11px] text-slate-500 font-mono">
              <span className="font-semibold text-slate-700">Stack: </span>
              {info.techStack}
            </div>
          </div>

          {/* Demo Guide for Judges */}
          <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-amber-700" />
              <span>How to Demo in 30 Seconds</span>
            </div>
            <div className="space-y-1 pt-1">
              {info.demoGuide.map((tip, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-xs text-slate-800">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
