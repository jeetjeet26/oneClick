'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save, Palette, Bot, Wand2, Calendar } from 'lucide-react'

interface ForgeStudioConfigProps {
  propertyId: string
}

interface Config {
  brand_voice: string | null
  brand_colors: { primary?: string; secondary?: string }
  target_audience: string | null
  key_amenities: string[]
  default_ai_model: string
  creativity_level: number
  include_hashtags: boolean
  include_cta: boolean
  max_caption_length: number
  gemini_enabled: boolean
  default_style: string
  default_quality: string
  auto_schedule: boolean
}

export function ForgeStudioConfig({ propertyId }: ForgeStudioConfigProps) {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/forgestudio/config?propertyId=${propertyId}`)
        const data = await res.json()
        setConfig(data.config)
      } catch (err) {
        setError('Failed to load configuration')
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [propertyId])

  const handleSave = async () => {
    if (!config) return
    
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/forgestudio/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, ...config })
      })

      if (!res.ok) throw new Error('Failed to save')
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  if (!config) return null

  return (
    <div className="space-y-6">
      {/* Brand Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-5 h-5 text-violet-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Brand Settings</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Brand Voice
            </label>
            <textarea
              value={config.brand_voice || ''}
              onChange={(e) => setConfig({ ...config, brand_voice: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none"
              placeholder="Describe your brand's tone and voice (e.g., professional yet friendly, luxury focused, community-oriented)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Target Audience
            </label>
            <input
              type="text"
              value={config.target_audience || ''}
              onChange={(e) => setConfig({ ...config, target_audience: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="e.g., Young professionals, families, pet owners"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Key Amenities (comma-separated)
            </label>
            <input
              type="text"
              value={config.key_amenities?.join(', ') || ''}
              onChange={(e) => setConfig({ ...config, key_amenities: e.target.value.split(',').map(s => s.trim()) })}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="Pool, Fitness Center, Dog Park, Rooftop Lounge"
            />
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bot className="w-5 h-5 text-violet-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">AI Generation Settings</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Creativity Level: {Math.round(config.creativity_level * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.creativity_level * 100}
              onChange={(e) => setConfig({ ...config, creativity_level: parseInt(e.target.value) / 100 })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Conservative</span>
              <span>Creative</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700 dark:text-slate-300">Include hashtags</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.include_hashtags}
                onChange={(e) => setConfig({ ...config, include_hashtags: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-checked:bg-violet-600 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700 dark:text-slate-300">Include call-to-action</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.include_cta}
                onChange={(e) => setConfig({ ...config, include_cta: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-checked:bg-violet-600 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Google Gemini Settings */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wand2 className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Google Gemini AI (Image/Video)</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700 dark:text-slate-300">Enable AI media generation</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.gemini_enabled}
                onChange={(e) => setConfig({ ...config, gemini_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-checked:bg-amber-500 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          
          {config.gemini_enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Default Style
                </label>
                <select
                  value={config.default_style}
                  onChange={(e) => setConfig({ ...config, default_style: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                >
                  <option value="natural">Natural/Realistic</option>
                  <option value="luxury">Luxury/Premium</option>
                  <option value="modern">Modern/Minimalist</option>
                  <option value="vibrant">Vibrant/Colorful</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Default Quality
                </label>
                <select
                  value={config.default_quality}
                  onChange={(e) => setConfig({ ...config, default_quality: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                >
                  <option value="standard">Standard</option>
                  <option value="high">High Quality</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">Settings saved!</p>}
        {!error && !success && <div />}
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Settings
        </button>
      </div>
    </div>
  )
}

