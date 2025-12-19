'use client'

import { useState } from 'react'
import {
  X,
  Instagram,
  ExternalLink,
  Key,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react'

interface InstagramSetupModalProps {
  propertyId: string
  onClose: () => void
  onConfigured: () => void
}

type Step = 'intro' | 'create-app' | 'enter-credentials' | 'verify'

export function InstagramSetupModal({ propertyId, onClose, onConfigured }: InstagramSetupModalProps) {
  const [step, setStep] = useState<Step>('intro')
  const [appId, setAppId] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectUri = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/forgestudio/social/callback/instagram`
    : ''

  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri)
  }

  const handleSaveCredentials = async () => {
    if (!appId.trim() || !appSecret.trim()) {
      setError('Please enter both App ID and App Secret')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/forgestudio/social/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          platform: 'meta',
          appId: appId.trim(),
          appSecret: appSecret.trim()
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save credentials')
      }

      setStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials')
    } finally {
      setSaving(false)
    }
  }

  const handleConnectNow = () => {
    // Redirect to OAuth flow
    window.location.href = `/api/forgestudio/social/connect/instagram?propertyId=${propertyId}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-lg">
              <Instagram className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Connect Instagram</h2>
              <p className="text-sm text-white/80">Setup your Meta App credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Step: Intro */}
          {step === 'intro' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  Meta App Credentials Required
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  To connect your Instagram account, you'll need to create a Meta App and provide the credentials.
                  This is a one-time setup that takes about 5-10 minutes.
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium mb-1">Why is this needed?</p>
                    <p>
                      Instagram's API requires each business to have their own Meta App for security.
                      This ensures you maintain full control over your account access.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-slate-900 dark:text-white">What you'll need:</h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    A Facebook account (personal or business)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    An Instagram Business or Creator account
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Your Instagram linked to a Facebook Page
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setStep('create-app')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                Get Started
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step: Create App Instructions */}
          {step === 'create-app' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Step 1: Create a Meta App
              </h3>

              <ol className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 flex items-center justify-center font-medium text-xs">1</span>
                  <div>
                    <p className="text-slate-700 dark:text-slate-300">
                      Go to the <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline inline-flex items-center gap-1">
                        Meta for Developers <ExternalLink className="w-3 h-3" />
                      </a> and click <strong>"Create App"</strong>
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 flex items-center justify-center font-medium text-xs">2</span>
                  <div>
                    <p className="text-slate-700 dark:text-slate-300">
                      Select <strong>"Other"</strong> for use case, then <strong>"Business"</strong> as app type
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 flex items-center justify-center font-medium text-xs">3</span>
                  <div>
                    <p className="text-slate-700 dark:text-slate-300">
                      Give your app a name (e.g., "My Property Social") and create it
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 flex items-center justify-center font-medium text-xs">4</span>
                  <div>
                    <p className="text-slate-700 dark:text-slate-300">
                      In the app dashboard, go to <strong>"Use cases"</strong> → click <strong>"Customize"</strong> next to "Authenticate and request data from users with Facebook Login"
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 flex items-center justify-center font-medium text-xs">5</span>
                  <div>
                    <p className="text-slate-700 dark:text-slate-300">
                      Add these permissions: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">instagram_basic</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">instagram_content_publish</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">pages_show_list</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">pages_read_engagement</code>
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 flex items-center justify-center font-medium text-xs">6</span>
                  <div>
                    <p className="text-slate-700 dark:text-slate-300">
                      Go to <strong>"App settings"</strong> → <strong>"Basic"</strong> and add this as a valid OAuth redirect URI:
                    </p>
                    <div className="flex items-center gap-2 mt-2 bg-slate-100 dark:bg-slate-700 p-2 rounded-lg">
                      <code className="text-xs flex-1 break-all">{redirectUri}</code>
                      <button
                        onClick={handleCopyRedirectUri}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 flex items-center justify-center font-medium text-xs">7</span>
                  <div>
                    <p className="text-slate-700 dark:text-slate-300">
                      Copy your <strong>App ID</strong> and <strong>App Secret</strong> from the Basic settings page
                    </p>
                  </div>
                </li>
              </ol>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('intro')}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('enter-credentials')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  I have my credentials
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step: Enter Credentials */}
          {step === 'enter-credentials' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Step 2: Enter Your Credentials
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Meta App ID
                  </label>
                  <input
                    type="text"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="e.g., 1234567890123456"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Meta App Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={appSecret}
                      onChange={(e) => setAppSecret(e.target.value)}
                      placeholder="e.g., abc123def456..."
                      className="w-full px-4 py-2.5 pr-12 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Your credentials are secure</p>
                    <p>
                      Your App Secret is encrypted before being stored and is never exposed to the browser after saving.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('create-app')}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveCredentials}
                  disabled={saving || !appId.trim() || !appSecret.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save & Continue
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Verify / Connect */}
          {step === 'verify' && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  Credentials Saved!
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Your Meta App credentials have been securely saved. Now let's connect your Instagram account.
                </p>
              </div>

              <button
                onClick={handleConnectNow}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                <Instagram className="w-5 h-5" />
                Connect Instagram Now
              </button>

              <button
                onClick={onClose}
                className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                I'll connect later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}




















