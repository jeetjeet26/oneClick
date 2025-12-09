'use client'

import { useState, useEffect } from 'react'
import { Settings, Loader2, Save, Bell, Zap, Clock, Palette } from 'lucide-react'

interface Config {
  property_id: string
  google_business_id: string | null
  google_connected: boolean
  yelp_business_id: string | null
  yelp_connected: boolean
  apartments_com_property_url: string | null
  apartments_com_connected: boolean
  facebook_page_id: string | null
  facebook_connected: boolean
  auto_respond_positive: boolean
  auto_respond_threshold: number
  response_delay_minutes: number
  default_tone: string
  property_personality: string | null
  notify_on_negative: boolean
  notify_on_urgent: boolean
  notification_email: string | null
  slack_webhook_url: string | null
  poll_frequency_hours: number
  is_active: boolean
}

interface ReviewFlowConfigProps {
  propertyId: string
}

export function ReviewFlowConfig({ propertyId }: ReviewFlowConfigProps) {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/reviewflow/config?propertyId=${propertyId}`)
        if (res.ok) {
          const data = await res.json()
          setConfig(data.config)
        }
      } catch (error) {
        console.error('Error fetching config:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [propertyId])

  const updateConfig = (updates: Partial<Config>) => {
    if (config) {
      setConfig({ ...config, ...updates })
      setHasChanges(true)
    }
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      const res = await fetch('/api/reviewflow/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, ...config })
      })
      if (res.ok) {
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Error saving config:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!config) return null

  return (
    <div className="space-y-6">
      {/* Save Bar */}
      {hasChanges && (
        <div className="sticky top-0 z-10 flex items-center justify-between bg-indigo-600 text-white px-4 py-3 rounded-lg shadow-lg">
          <span>You have unsaved changes</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      )}

      {/* Active Status */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">ReviewFlow AI</h3>
              <p className="text-sm text-slate-500">Automated review management</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.is_active}
              onChange={(e) => updateConfig({ is_active: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-slate-200 peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
            <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">
              {config.is_active ? 'Active' : 'Inactive'}
            </span>
          </label>
        </div>
      </div>

      {/* Auto-Response Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Auto-Response Settings
        </h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-300">Auto-respond to positive reviews</span>
              <p className="text-sm text-slate-500">Automatically post responses to highly-rated reviews</p>
            </div>
            <input
              type="checkbox"
              checked={config.auto_respond_positive}
              onChange={(e) => updateConfig({ auto_respond_positive: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>

          {config.auto_respond_positive && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Minimum rating for auto-response
                </label>
                <select
                  value={config.auto_respond_threshold}
                  onChange={(e) => updateConfig({ auto_respond_threshold: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                >
                  <option value={5}>5 stars only</option>
                  <option value={4}>4+ stars</option>
                  <option value={3}>3+ stars</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Delay before posting (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1440"
                  value={config.response_delay_minutes}
                  onChange={(e) => updateConfig({ response_delay_minutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Response Tone */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-500" />
          Response Style
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Default Tone</label>
            <select
              value={config.default_tone}
              onChange={(e) => updateConfig({ default_tone: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            >
              <option value="professional">Professional</option>
              <option value="empathetic">Empathetic</option>
              <option value="friendly">Friendly</option>
              <option value="apologetic">Apologetic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Property Personality</label>
            <input
              type="text"
              placeholder="e.g., luxury, family-friendly, pet-friendly, urban"
              value={config.property_personality || ''}
              onChange={(e) => updateConfig({ property_personality: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            />
            <p className="text-xs text-slate-500 mt-1">Helps AI match your property&apos;s brand voice</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-rose-500" />
          Notifications
        </h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="font-medium text-slate-700 dark:text-slate-300">Notify on negative reviews</span>
            <input
              type="checkbox"
              checked={config.notify_on_negative}
              onChange={(e) => updateConfig({ notify_on_negative: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between">
            <span className="font-medium text-slate-700 dark:text-slate-300">Notify on urgent reviews</span>
            <input
              type="checkbox"
              checked={config.notify_on_urgent}
              onChange={(e) => updateConfig({ notify_on_urgent: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notification Email</label>
            <input
              type="email"
              placeholder="team@property.com"
              value={config.notification_email || ''}
              onChange={(e) => updateConfig({ notification_email: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Slack Webhook URL</label>
            <input
              type="url"
              placeholder="https://hooks.slack.com/..."
              value={config.slack_webhook_url || ''}
              onChange={(e) => updateConfig({ slack_webhook_url: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Polling Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Review Polling
        </h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Check for new reviews every</label>
          <select
            value={config.poll_frequency_hours}
            onChange={(e) => updateConfig({ poll_frequency_hours: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
          >
            <option value={1}>1 hour</option>
            <option value={3}>3 hours</option>
            <option value={6}>6 hours</option>
            <option value={12}>12 hours</option>
            <option value={24}>24 hours</option>
          </select>
        </div>
      </div>
    </div>
  )
}

