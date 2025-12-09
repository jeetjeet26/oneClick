'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  MoreVertical,
  Crown,
  Eye,
  Loader2,
  Check,
  AlertCircle,
  Trash2,
  RefreshCw,
  X,
  Activity
} from 'lucide-react'
import { ActivityLog } from '@/components/team/ActivityLog'

type TeamMember = {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'viewer'
  status: 'active' | 'pending'
  created_at: string
}

const ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    description: 'Full access to all features',
    icon: Crown,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  manager: {
    label: 'Manager',
    description: 'Can manage properties and view reports',
    icon: Shield,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to reports',
    icon: Eye,
    color: 'text-slate-600 bg-slate-50 border-slate-200',
  },
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'viewer'>('viewer')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [roleChanging, setRoleChanging] = useState<string | null>(null)

  const fetchTeam = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/team')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch team')
      }
      
      setTeam(data.members || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }
      
      setInviteSuccess(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setInviteRole('viewer')
      fetchTeam()
      
      setTimeout(() => {
        setShowInvite(false)
        setInviteSuccess(null)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setRoleChanging(memberId)
    
    try {
      const response = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role')
      }
      
      fetchTeam()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setRoleChanging(null)
      setMenuOpen(null)
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return
    
    try {
      const response = await fetch(`/api/team?memberId=${memberId}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member')
      }
      
      fetchTeam()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setMenuOpen(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-indigo-500" size={28} />
            Team
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your team members and their permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTeam}
            disabled={loading}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
          >
            <UserPlus size={18} />
            Invite Member
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Team Members List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-900">
            Team Members ({team.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3].map(i => (
              <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-48"></div>
                </div>
                <div className="h-8 bg-slate-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : team.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No team members yet</p>
            <button
              onClick={() => setShowInvite(true)}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
            >
              Invite your first team member →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {team.map(member => {
              const roleConfig = ROLE_CONFIG[member.role]
              const RoleIcon = roleConfig.icon
              
              return (
                <div 
                  key={member.id}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">{member.name}</p>
                      {member.status === 'pending' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full flex-shrink-0">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-1 truncate">
                      <Mail size={14} className="flex-shrink-0" />
                      {member.email}
                    </p>
                  </div>

                  {/* Role Badge */}
                  <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 flex-shrink-0 ${roleConfig.color}`}>
                    {roleChanging === member.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RoleIcon size={14} />
                    )}
                    <span className="text-sm font-medium">{roleConfig.label}</span>
                  </div>

                  {/* Actions Menu */}
                  <div className="relative">
                    <button 
                      onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>
                    
                    {menuOpen === member.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setMenuOpen(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                          <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-100">
                            Change Role
                          </div>
                          {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(member.id, role)}
                              disabled={member.role === role}
                              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                                member.role === role 
                                  ? 'bg-slate-50 text-slate-400' 
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <config.icon size={14} />
                              {config.label}
                              {member.role === role && <Check size={14} className="ml-auto" />}
                            </button>
                          ))}
                          <div className="border-t border-slate-100 mt-1 pt-1">
                            <button
                              onClick={() => handleRemove(member.id)}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              Remove from team
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Roles Explanation */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(ROLE_CONFIG).map(([key, config]) => {
            const Icon = config.icon
            return (
              <div 
                key={key}
                className={`p-4 rounded-lg border ${config.color}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={18} />
                  <span className="font-medium">{config.label}</span>
                </div>
                <p className="text-sm opacity-80">{config.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Activity Log */}
      <ActivityLog />

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Invite Team Member</h2>
              <p className="text-sm text-slate-500 mt-1">
                Send an invitation to join your organization
              </p>
            </div>

            {inviteSuccess ? (
              <div className="p-6">
                <div className="text-center py-6">
                  <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={24} className="text-emerald-600" />
                  </div>
                  <p className="text-emerald-700 font-medium">{inviteSuccess}</p>
                  <p className="text-sm text-slate-500 mt-2">
                    They'll receive an email with instructions to join.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                    placeholder="colleague@company.com"
                    disabled={inviting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Role
                  </label>
                  <select 
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                    disabled={inviting}
                  >
                    <option value="viewer">Viewer - Read-only access</option>
                    <option value="manager">Manager - Can manage properties</option>
                    <option value="admin">Admin - Full access</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInvite(false)
                      setInviteEmail('')
                      setError(null)
                    }}
                    disabled={inviting}
                    className="flex-1 px-4 py-2 bg-white text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inviting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail size={18} />
                        Send Invite
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
