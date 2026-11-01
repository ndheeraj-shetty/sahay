import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Home,
  Phone,
  ArrowRight,
  KeyRound,
  Crown,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type AuthMode = 'signin' | 'register' | 'forgot';
type RegisterRole = 'owner' | 'member';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register, forgotPassword, resetPassword } =
    useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [registerRole, setRegisterRole] = useState<RegisterRole>('owner');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // Forgot password state
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);

  // Status feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      if (registerRole === 'member' && !inviteCode.trim()) {
        setError('Please enter the family invite code provided by your household owner.');
        setIsSubmitting(false);
        return;
      }

      await register({
        email,
        password,
        full_name: fullName,
        phone: phone || undefined,
        household_name: registerRole === 'owner' ? householdName || undefined : undefined,
        invite_code: registerRole === 'member' ? inviteCode.trim().toUpperCase() : undefined,
        is_owner: registerRole === 'owner',
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const res = await forgotPassword(email);
      setSuccessMsg(res.message);
      if (res.demo_reset_code) {
        setDemoCodeHint(res.demo_reset_code);
        setResetCode(res.demo_reset_code);
      }
      setResetStep(2);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to request reset instructions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const res = await resetPassword({
        email,
        reset_code: resetCode,
        new_password: newPassword,
      });
      setSuccessMsg(res.message);
      setTimeout(() => {
        setMode('signin');
        setPassword('');
        setSuccessMsg('Password updated! Please sign in with your new password.');
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to reset password.');
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

      try {
        await login(demoEmail, demoPwd);
      } catch {
        await register({
          email: demoEmail,
          password: demoPwd,
          full_name: role === 'owner' ? 'Rajesh Sharma' : 'Satish Sharma (Grandfather)',
          household_name: 'Sharma Household',
          phone: '+919876543210',
          is_owner: role === 'owner',
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl transition-all border border-slate-200 my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sahay-600 text-white font-bold text-sm shadow-xs">
              S
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {mode === 'signin' && 'Sign in to SAHAY'}
                {mode === 'register' && 'Create Household Account'}
                {mode === 'forgot' && 'Reset Password'}
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

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE 1: SIGN IN */}
          {mode === 'signin' && (
            <div>
              <form onSubmit={handleSignIn} className="space-y-3.5">
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
                      placeholder="e.g. rajesh@example.com"
                      className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none focus:ring-1 focus:ring-sahay-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setSuccessMsg(null);
                        setResetStep(1);
                      }}
                      className="text-[11px] font-semibold text-sahay-600 hover:text-sahay-700 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your account password"
                      className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none focus:ring-1 focus:ring-sahay-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 flex w-full items-center justify-center space-x-2 rounded-xl bg-sahay-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sahay-700 focus:outline-none transition-colors disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>

              {/* Switch to Register */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs font-medium text-sahay-600 hover:text-sahay-700 transition-colors"
                >
                  Need a household account? Create one now
                </button>
              </div>

              {/* Instant Demo Shortcut Buttons */}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 text-center">
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
          )}

          {/* MODE 2: REGISTER (OWNER VS FAMILY MEMBER) */}
          {mode === 'register' && (
            <div>
              {/* Question: Are you Owner or Family Member */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Are you registering as the Owner or a Family Member?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Option 1: Owner of the house */}
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterRole('owner');
                      setError(null);
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      registerRole === 'owner'
                        ? 'border-sahay-500 bg-sahay-50/60 ring-1 ring-sahay-500 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Crown
                        className={`w-4 h-4 ${
                          registerRole === 'owner' ? 'text-amber-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-900">
                        Owner of the House
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Set up & lead a new family household
                    </span>
                  </button>

                  {/* Option 2: Family Member */}
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterRole('member');
                      setError(null);
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      registerRole === 'member'
                        ? 'border-sahay-500 bg-sahay-50/60 ring-1 ring-sahay-500 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Users
                        className={`w-4 h-4 ${
                          registerRole === 'member' ? 'text-sky-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-900">
                        Family Member
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Join using code from household owner
                    </span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                {/* Family Member Code Input (Required for Family Member) */}
                {registerRole === 'member' && (
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl space-y-1.5 animate-in fade-in duration-150">
                    <label className="block text-xs font-bold text-sky-950">
                      Family Invite Code from Owner *
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-sky-600" />
                      <input
                        type="text"
                        required
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="e.g. 8FA910BC"
                        className="w-full rounded-xl border border-sky-300 py-2 pl-9 pr-3 text-xs uppercase font-mono tracking-wider text-slate-900 placeholder-sky-300 focus:border-sky-500 focus:outline-none bg-white"
                      />
                    </div>
                    <p className="text-[11px] text-sky-700 leading-tight">
                      The household owner generates this code in the <b>Household & Family</b> tab.
                    </p>
                  </div>
                )}

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
                      placeholder={registerRole === 'owner' ? 'e.g. Rajesh Sharma' : 'e.g. Pooja Sharma'}
                      className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Owner: Primary Household Name */}
                {registerRole === 'owner' && (
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
                        placeholder="e.g. Sharma Family Household"
                        className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Owner: Mobile phone */}
                {registerRole === 'owner' && (
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
                        className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none"
                      />
                    </div>
                  </div>
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
                      placeholder="e.g. pooja@example.com"
                      className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none"
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
                      className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 flex w-full items-center justify-center space-x-2 rounded-xl bg-sahay-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sahay-700 focus:outline-none transition-colors disabled:opacity-50"
                >
                  <span>
                    {isSubmitting
                      ? 'Creating Account...'
                      : registerRole === 'owner'
                      ? 'Register as Household Owner'
                      : 'Join Household with Invite Code'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs font-medium text-sahay-600 hover:text-sahay-700 transition-colors"
                >
                  Already have an account? Sign in here
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>

              {resetStep === 1 ? (
                <form onSubmit={handleRequestResetCode} className="space-y-3.5">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 leading-relaxed">
                    Enter the email address associated with your household account to verify your identity and set a new password.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Account Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="rajesh@example.com"
                        className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !email.trim()}
                    className="w-full flex items-center justify-center space-x-2 rounded-xl bg-sahay-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sahay-700 transition-colors disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Sending...' : 'Request Verification Code'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmPasswordReset} className="space-y-3.5">
                  {demoCodeHint && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                      <span className="font-bold">Verification code dispatched:</span>
                      <p className="text-[11px] text-amber-800">
                        For demonstration, your 6-digit recovery code is{' '}
                        <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300">
                          {demoCodeHint}
                        </span>
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Verification Reset Code *
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="e.g. 123456"
                        className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs font-mono text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      New Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !resetCode.trim() || newPassword.length < 6}
                    className="w-full flex items-center justify-center space-x-2 rounded-xl bg-sahay-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sahay-700 transition-colors disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Updating Password...' : 'Reset & Save Password'}</span>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
