import React, { useState } from 'react';
import { AboutFeatureButton } from '../../components/common/AboutFeatureButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  HeartHandshake,
  Baby,
  Heart,
  Copy,
  Check,
  Trash2,
  Edit2,
  Laptop,
  LogOut,
  KeyRound,
  AlertCircle,
  Home,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { householdService } from '../../services/householdService';
import { authService } from '../../services/authService';
import { MemberRole, MemberResponse } from '../../types/auth';

export const HouseholdView: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, activeHousehold, refreshHousehold, openAuthModal } = useAuth();

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('adult');
  const [inviteRel, setInviteRel] = useState('Spouse');
  const [inviteSuccessCode, setInviteSuccessCode] = useState<string | null>(null);

  // Edit role modal state
  const [editingMember, setEditingMember] = useState<MemberResponse | null>(null);
  const [editRole, setEditRole] = useState<MemberRole>('adult');
  const [editRel, setEditRel] = useState('');

  // Join by code state
  const [joinCode, setJoinCode] = useState('');
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Queries
  const { data: household, isLoading: householdLoading } = useQuery({
    queryKey: ['currentHousehold', activeHousehold?.id],
    queryFn: householdService.getCurrentHousehold,
    enabled: !!user,
  });

  const { data: invitations } = useQuery({
    queryKey: ['householdInvitations', activeHousehold?.id],
    queryFn: householdService.listInvitations,
    enabled: !!user && household?.my_role === 'owner',
  });

  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ['userSessions'],
    queryFn: authService.getSessions,
    enabled: !!user,
  });

  // Mutations
  const inviteMutation = useMutation({
    mutationFn: householdService.inviteMember,
    onSuccess: (data) => {
      setInviteSuccessCode(data.invite_code);
      queryClient.invalidateQueries({ queryKey: ['householdInvitations'] });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({
      memberId,
      role,
      relationship,
    }: {
      memberId: string;
      role: MemberRole;
      relationship: string;
    }) => householdService.updateMember(memberId, { role, relationship }),
    onSuccess: () => {
      setEditingMember(null);
      queryClient.invalidateQueries({ queryKey: ['currentHousehold'] });
      refreshHousehold();
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: householdService.removeMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentHousehold'] });
      refreshHousehold();
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: householdService.revokeInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['householdInvitations'] });
    },
  });

  const acceptInviteMutation = useMutation({
    mutationFn: householdService.acceptInvitation,
    onSuccess: () => {
      setJoinMessage('Successfully joined household!');
      setJoinCode('');
      queryClient.invalidateQueries({ queryKey: ['currentHousehold'] });
      refreshHousehold();
    },
    onError: (err: any) => {
      setJoinMessage(`Error: ${err.response?.data?.detail || err.message}`);
    },
  });

  const revokeOtherSessionsMutation = useMutation({
    mutationFn: authService.revokeAllOtherSessions,
    onSuccess: () => {
      refetchSessions();
    },
  });

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sahay-50 text-sahay-600">
          <Home className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-gray-900">Sign In to View Your Household</h2>
        <p className="mt-2 max-w-md text-xs text-gray-500">
          SAHAY organizes documents, bills, health records, and family savings around your household.
          Sign in or create a demo household to explore.
        </p>
        <button
          onClick={openAuthModal}
          className="mt-6 rounded-xl bg-sahay-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sahay-700 transition-colors"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  const isOwner = household?.my_role === 'owner';

  const getRoleBadge = (role: MemberRole) => {
    switch (role) {
      case 'owner':
        return {
          icon: Crown,
          label: 'Household Owner',
          color: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'adult':
        return {
          icon: Shield,
          label: 'Adult Member',
          color: 'bg-sky-50 text-sky-700 border-sky-200',
        };
      case 'elder':
        return {
          icon: Heart,
          label: 'Elder Member',
          color: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'caregiver':
        return {
          icon: HeartHandshake,
          label: 'Caregiver / Helper',
          color: 'bg-teal-50 text-teal-700 border-teal-200',
        };
      case 'child':
        return {
          icon: Baby,
          label: 'Child Member',
          color: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      default:
        return {
          icon: Shield,
          label: role,
          color: 'bg-gray-50 text-gray-700 border-gray-200',
        };
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Household Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sahay-600 text-white font-bold text-xl shadow-sm">
            {household?.name ? household.name.charAt(0) : 'H'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-gray-900">{household?.name || 'Household'}</h1>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                Active Household
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {household?.members.length || 0} family members • Timezone: {household?.timezone || 'Asia/Kolkata'} • Currency: {household?.currency || 'INR'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <AboutFeatureButton featureKey="household" />
          {isOwner && (
            <button
              onClick={() => {
                setIsInviteOpen(true);
                setInviteSuccessCode(null);
              }}
              className="flex items-center space-x-1.5 rounded-xl bg-sahay-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sahay-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Family Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Household Members Roster */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <Users className="h-4 w-4 text-sahay-600" />
              <span>Family Members & Permissions</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Role-based access determines which documents, health cards, and savings goals each member can access.
            </p>
          </div>
          <span className="text-xs font-medium text-gray-500">
            {household?.members.length} {household?.members.length === 1 ? 'Member' : 'Members'}
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {household?.members.map((member) => {
            const roleInfo = getRoleBadge(member.role);
            const RoleIcon = roleInfo.icon;
            const isSelf = member.user_id === user.id;

            return (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700 text-sm border border-slate-200">
                    {member.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900 text-sm">
                        {member.display_name || member.full_name}
                      </span>
                      {isSelf && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                          You
                        </span>
                      )}
                      {member.relationship && (
                        <span className="text-xs text-gray-400">• {member.relationship}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span
                    className={`inline-flex items-center space-x-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${roleInfo.color}`}
                  >
                    <RoleIcon className="h-3.5 w-3.5" />
                    <span>{roleInfo.label}</span>
                  </span>

                  {isOwner && !isSelf && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingMember(member);
                          setEditRole(member.role);
                          setEditRel(member.relationship || '');
                        }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Edit member role"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${member.full_name} from this household?`)) {
                            removeMemberMutation.mutate(member.id);
                          }
                        }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invitations Section (Visible to Owner) */}
      {isOwner && invitations && invitations.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-1">Pending Invitations</h2>
          <p className="text-xs text-gray-500 mb-4">
            Family members can enter their invite code when signing up to automatically join this household.
          </p>

          <div className="divide-y divide-gray-100">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-800 text-xs">
                      {inv.invitee_name || inv.invitee_email}
                    </span>
                    <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                      Role: {inv.role}
                    </span>
                    {inv.relationship && (
                      <span className="text-[11px] text-gray-400">({inv.relationship})</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">{inv.invitee_email}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 font-mono text-xs font-bold text-sky-900">
                    <span className="text-[10px] text-sky-600 uppercase font-sans font-bold">Join Code:</span>
                    <span>{inv.invite_code}</span>
                    <button
                      onClick={() => handleCopy(inv.invite_code)}
                      className="text-gray-400 hover:text-gray-700"
                      title="Copy invite code"
                    >
                      {copiedCode === inv.invite_code ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => revokeInviteMutation.mutate(inv.id)}
                    className="rounded-lg p-1 text-gray-400 hover:text-red-600"
                    title="Revoke invitation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Join Another Household with Invite Code */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-1">Join Family Household with Code</h2>
        <p className="text-xs text-gray-500 mb-4">
          Did a family member invite you with a code? Enter it below to join their household.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. 8FA910BC"
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2 font-mono text-xs uppercase tracking-wider text-gray-900 placeholder-gray-400 focus:border-sahay-500 focus:outline-none"
          />
          <button
            onClick={() => acceptInviteMutation.mutate(joinCode)}
            disabled={!joinCode.trim() || acceptInviteMutation.isPending}
            className="w-full sm:w-auto shrink-0 rounded-xl bg-sahay-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sahay-700 disabled:opacity-50 transition-colors"
          >
            {acceptInviteMutation.isPending ? 'Joining...' : 'Join Household'}
          </button>
        </div>
        {joinMessage && (
          <p className="mt-2 text-xs font-medium text-sahay-700">{joinMessage}</p>
        )}
      </div>

      {/* Active Sessions & Security */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <Laptop className="h-4 w-4 text-sahay-600" />
              <span>Active Sessions & Device Security</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Review where your SAHAY account is currently logged in.
            </p>
          </div>
          <button
            onClick={() => revokeOtherSessionsMutation.mutate()}
            disabled={revokeOtherSessionsMutation.isPending}
            className="flex items-center space-x-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log Out All Other Devices</span>
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {sessions?.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-3">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                  <Laptop className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs text-gray-900">
                      {s.device_info || 'Browser Session'}
                    </span>
                    {s.is_current && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                        Current Device
                      </span>
                    )}
                    {s.is_revoked && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        Revoked
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    IP: {s.ip_address || 'Localhost'} • Last active:{' '}
                    {new Date(s.last_seen_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900">Invite Family Member</h3>
            <p className="mt-1 text-xs text-gray-500">
              Send an invitation to join {household?.name}. They will receive their permissions
              based on the assigned role.
            </p>

            {inviteSuccessCode ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-emerald-50 p-4 text-emerald-800 border border-emerald-200 text-xs">
                  <div className="flex items-center space-x-2 font-bold mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Invitation Created Successfully!</span>
                  </div>
                  <p className="font-semibold">Share this code with your family member:</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    When registering their account, they select <b>"Family Member"</b> and paste this code to automatically join {household?.name}!
                  </p>
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-white p-2.5 border border-emerald-200">
                    <span className="font-mono font-bold text-sm text-gray-900">
                      {inviteSuccessCode}
                    </span>
                    <button
                      onClick={() => handleCopy(inviteSuccessCode)}
                      className="flex items-center space-x-1 rounded bg-emerald-600 px-2.5 py-1 text-white font-medium text-xs hover:bg-emerald-700"
                    >
                      {copiedCode === inviteSuccessCode ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsInviteOpen(false);
                    setInviteSuccessCode(null);
                  }}
                  className="w-full rounded-xl bg-gray-100 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  inviteMutation.mutate({
                    invitee_email: inviteEmail,
                    invitee_name: inviteName || undefined,
                    role: inviteRole,
                    relationship: inviteRel || undefined,
                  });
                }}
                className="mt-4 space-y-3.5"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Family Member Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="family.member@example.com"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-sahay-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Satish Sharma"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-sahay-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Role *</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-sahay-500 focus:outline-none"
                    >
                      <option value="adult">Adult Member</option>
                      <option value="elder">Elder Member</option>
                      <option value="caregiver">Caregiver / Helper</option>
                      <option value="child">Child</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Relationship
                    </label>
                    <input
                      type="text"
                      value={inviteRel}
                      onChange={(e) => setInviteRel(e.target.value)}
                      placeholder="e.g. Father, Spouse"
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-sahay-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(false)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="rounded-xl bg-sahay-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sahay-700 disabled:opacity-50"
                  >
                    {inviteMutation.isPending ? 'Creating...' : 'Generate Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Member Role Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900">
              Edit Role: {editingMember.full_name}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Update permissions and relationship tag for this member.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMemberMutation.mutate({
                  memberId: editingMember.id,
                  role: editRole,
                  relationship: editRel,
                });
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as MemberRole)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-sahay-500 focus:outline-none"
                >
                  <option value="owner">Household Owner</option>
                  <option value="adult">Adult Member</option>
                  <option value="elder">Elder Member</option>
                  <option value="caregiver">Caregiver / Helper</option>
                  <option value="child">Child</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  value={editRel}
                  onChange={(e) => setEditRel(e.target.value)}
                  placeholder="e.g. Grandfather, Caregiver"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-sahay-500 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMemberMutation.isPending}
                  className="rounded-xl bg-sahay-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sahay-700 disabled:opacity-50"
                >
                  {updateMemberMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
