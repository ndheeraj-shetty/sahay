import React from 'react';
import { Shield, AlertCircle, Bell, User, Home, LogOut, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { systemService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { user, activeHousehold, households, logout, openAuthModal, switchHousehold } = useAuth();

  const { data: health } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: systemService.getHealth,
    refetchInterval: 15000,
  });

  const isHealthy = health?.status === 'ok';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      {/* Left: Household switcher info */}
      <div className="flex items-center space-x-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sahay-50 text-sahay-600">
          <Home className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            {households.length > 1 ? (
              <select
                value={activeHousehold?.id || ''}
                onChange={(e) => switchHousehold(e.target.value)}
                className="font-semibold text-gray-900 text-sm bg-transparent border-0 focus:ring-0 cursor-pointer pr-4"
              >
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-gray-900 text-sm">
                {activeHousehold?.name || (user ? `${user.full_name.split(' ')[0]}'s Household` : 'Demo Household')}
              </span>
            )}
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
              Active Household
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {activeHousehold?.members?.length || 1} members •{' '}
            <span className="capitalize">{activeHousehold?.my_role || 'Owner'}</span>
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-3">
        {/* Backend health indicator badge */}
        <div className="hidden sm:flex items-center space-x-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="text-gray-600 font-medium">
            API {isHealthy ? 'Connected' : 'Connecting...'}
          </span>
          {health?.database && (
            <span className="text-gray-400">({health.database.mode || health.database.dialect})</span>
          )}
        </div>

        {/* Notification bell */}
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-sahay-500" />
        </button>

        {/* User profile / Auth button */}
        {user ? (
          <div className="flex items-center space-x-2 border-l border-gray-200 pl-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sahay-600 text-white font-medium text-xs shadow-sm">
              {user.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div className="hidden md:block text-left text-xs">
              <p className="font-semibold text-gray-900 leading-tight">{user.full_name}</p>
              <p className="text-gray-500 capitalize">{activeHousehold?.my_role || 'Member'}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={openAuthModal}
            className="flex items-center space-x-1.5 rounded-lg bg-sahay-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sahay-700 transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
