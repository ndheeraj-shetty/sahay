import React, { useState } from 'react';
import { X, Lock, Mail, User, Home, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await register({
          email,
          password,
          full_name: fullName,
          phone: phone || undefined,
          household_name: householdName || undefined,
        });
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (role: 'owner' | 'elder') => {
    setIsSubmitting(true);
    setError(null);
    try {
      const demoEmail =
        role === 'owner' ? 'rajesh.sharma@example.com' : 'satish.sharma@example.com';
      const demoPwd = 'Password123!';

      // Try login first, if doesn't exist, register
      try {
        await login(demoEmail, demoPwd);
      } catch {
        await register({
          email: demoEmail,
          password: demoPwd,
          full_name: role === 'owner' ? 'Rajesh Sharma' : 'Satish Sharma (Grandfather)',
          household_name: 'Sharma Household',
          phone: '+919876543210',
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sahay-600 text-white font-bold text-sm">
              S
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isRegister ? 'Create Household Account' : 'Sign in to SAHAY'}
              </h2>
              <p className="text-[11px] text-gray-500">The Household Life-Admin OS</p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none focus:ring-1 focus:ring-sahay-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Primary Household Name (Optional)
                  </label>
                  <div className="relative">
                    <Home className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={householdName}
                      onChange={(e) => setHouseholdName(e.target.value)}
                      placeholder="e.g. Sharma Household"
                      className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none focus:ring-1 focus:ring-sahay-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Mobile Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none focus:ring-1 focus:ring-sahay-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rajesh@example.com"
                  className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none focus:ring-1 focus:ring-sahay-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none focus:ring-1 focus:ring-sahay-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center space-x-2 rounded-xl bg-sahay-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sahay-700 focus:outline-none focus:ring-2 focus:ring-sahay-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Processing...' : isRegister ? 'Create Household' : 'Sign In'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Toggle between Login and Register */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs font-medium text-sahay-600 hover:text-sahay-700 transition-colors"
            >
              {isRegister
                ? 'Already have an account? Sign in here'
                : 'Need a household account? Create one now'}
            </button>
          </div>

          {/* Instant Demo Shortcut Buttons */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 text-center">
              Quick 1-Click Demo Accounts
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('owner')}
                disabled={isSubmitting}
                className="flex flex-col items-center justify-center rounded-xl border border-sahay-200 bg-sahay-50/60 p-2 text-left hover:bg-sahay-100/70 transition-colors"
              >
                <span className="text-[11px] font-bold text-sahay-800">Rajesh Sharma</span>
                <span className="text-[10px] text-sahay-600 font-medium">Household Owner</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('elder')}
                disabled={isSubmitting}
                className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-2 text-left hover:bg-gray-100 transition-colors"
              >
                <span className="text-[11px] font-bold text-gray-800">Satish Sharma</span>
                <span className="text-[10px] text-gray-500 font-medium">Elder Member</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
