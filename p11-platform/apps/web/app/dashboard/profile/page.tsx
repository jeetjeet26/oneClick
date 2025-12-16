'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  Mail, 
  Key, 
  Save, 
  Check, 
  Loader2, 
  AlertCircle,
  Camera,
  Shield
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type ProfileData = {
  email: string
  full_name: string
  avatar_url?: string
}

export default function ProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'profile' | 'security'>('profile')
  
  // Profile form state
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) throw userError
        if (!user) throw new Error('No user found')
        
        setEmail(user.email || '')
        setFullName(user.user_metadata?.full_name || '')
        setAvatarUrl(user.user_metadata?.avatar_url || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfile()
  }, [supabase])

  const handleSaveProfile = async () => {
    setSaving(true)
    setError(null)
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          avatar_url: avatarUrl,
        }
      })
      
      if (updateError) throw updateError
      
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (updateError) throw updateError
      
      // Clear password fields
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'security' as const, label: 'Security', icon: Shield },
  ]

  const getInitials = () => {
    if (!fullName) return email.charAt(0).toUpperCase()
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-slate-500">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <User className="text-indigo-500" size={28} />
          My Profile
        </h1>
        <p className="text-slate-500 mt-1">
          Manage your personal information and security settings
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success State */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <Check className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-green-800 font-medium">Success</p>
            <p className="text-green-600 text-sm mt-1">Your changes have been saved</p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="bg-white rounded-xl border border-slate-200 p-2 space-y-1">
            {sections.map(section => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{section.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-slate-200">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div>
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-900">Profile Information</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Update your personal details and profile picture
                  </p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Avatar */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Profile Picture
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="h-20 w-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-medium shadow-lg">
                          {getInitials()}
                        </div>
                        <button className="absolute bottom-0 right-0 h-7 w-7 bg-white rounded-full shadow-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                          <Camera size={14} className="text-slate-600" />
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-600">
                          JPG, PNG or GIF. Max size 2MB.
                        </p>
                        <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-1">
                          Upload new picture
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Email (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Contact support to change your email address
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <div>
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-900">Security Settings</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Manage your password and authentication settings
                  </p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Change Password */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          New Password
                        </label>
                        <div className="relative">
                          <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Password must be at least 8 characters long
                      </p>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Two-Factor Authentication</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <span className="px-3 py-1 text-xs bg-slate-100 text-slate-500 rounded-full">
                        Coming Soon
                      </span>
                    </div>
                  </div>

                  {/* Session Management */}
                  <div className="pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Active Sessions</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          Manage devices where you're currently logged in
                        </p>
                      </div>
                      <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                        View Sessions
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                  <button
                    onClick={handleChangePassword}
                    disabled={saving || !newPassword || !confirmPassword}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
