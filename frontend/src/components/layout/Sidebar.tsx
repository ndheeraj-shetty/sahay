import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FolderArchive,
  FileSearch,
  CalendarCheck2,
  HeartPulse,
  Target,
  Sparkles,
  ShieldCheck,
  Layers,
  Users,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: 'Overview & Foundation', path: '/', icon: Layers, tag: 'Vision & Architecture' },
  { name: 'Household & Family', path: '/household', icon: Users, tag: 'Members & Roles' },
  { name: 'Sahay Daily', path: '/daily', icon: CalendarCheck2, tag: 'Timeline & Money' },
  { name: 'Family Vault', path: '/vault', icon: FolderArchive, tag: 'Documents' },
  { name: 'Document Doctor', path: '/document-doctor', icon: FileSearch, tag: 'AI Extraction' },
  { name: 'Health Shield', path: '/health', icon: HeartPulse, tag: 'Medical & Rx' },
  { name: 'Lakshya Goal Vaults', path: '/lakshya', icon: Target, tag: 'Family Savings' },
  { name: 'Sahay AI Assistant', path: '/assistant', icon: Sparkles, tag: 'Household Q&A' },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Brand logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sahay-600 text-white font-bold text-lg shadow-sm">
            S
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-gray-900">SAHAY</span>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-sahay-600">
              Life-Admin OS
            </span>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Household Management
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sahay-50 text-sahay-700 shadow-sm border border-sahay-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="rounded-md bg-sahay-100 px-1.5 py-0.5 text-[10px] font-semibold text-sahay-700">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom information - Protected by SAHAY Shield */}
      <div className="border-t border-gray-100 p-3.5">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-xs text-slate-800 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Protected by SAHAY Shield</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500 leading-tight">
            Client-side encrypted • Zero-knowledge family isolation
          </p>
        </div>
      </div>
    </aside>
  );
};
