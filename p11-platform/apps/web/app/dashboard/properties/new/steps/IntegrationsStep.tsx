'use client'

import { 
  Link2, ArrowRight, ArrowLeft, ExternalLink, CheckCircle2, 
  Clock, AlertCircle, BarChart2, Search, Code, DollarSign, 
  MapPin, Facebook, Linkedin, Video, Mail, Database, Home, X
} from 'lucide-react'
import { useState } from 'react'
import { useAddProperty, IntegrationPlatform, IntegrationStatus, INTEGRATION_CONFIG } from '../AddPropertyProvider'

const ICON_MAP: Record<string, React.ElementType> = {
  BarChart2,
  Search,
  Code,
  DollarSign,
  MapPin,
  Facebook,
  Linkedin,
  Video,
  Mail,
  Database,
  Home,
}

const STATUS_CONFIG: Record<IntegrationStatus, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-slate-400', label: 'Not Started' },
  requested: { icon: Clock, color: 'text-amber-400', label: 'Access Requested' },
  connected: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Connected' },
  verified: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Verified' },
  expired: { icon: AlertCircle, color: 'text-red-400', label: 'Expired' },
  error: { icon: AlertCircle, color: 'text-red-400', label: 'Error' },
}

const PRIORITY_INTEGRATIONS: IntegrationPlatform[] = [
  'google_analytics',
  'google_ads',
  'meta_ads',
  'google_business_profile'
]

const OPTIONAL_INTEGRATIONS: IntegrationPlatform[] = [
  'google_search_console',
  'google_tag_manager',
  'linkedin_ads',
  'tiktok_ads',
  'email_marketing',
  'crm',
  'pms'
]

interface IntegrationModalProps {
  platform: IntegrationPlatform
  onClose: () => void
  onSave: (status: IntegrationStatus, notes: string) => void
  currentStatus: IntegrationStatus
  currentNotes: string
}

function IntegrationModal({ platform, onClose, onSave, currentStatus, currentNotes }: IntegrationModalProps) {
  const [status, setStatus] = useState<IntegrationStatus>(currentStatus)
  const [notes, setNotes] = useState(currentNotes)
  const config = INTEGRATION_CONFIG[platform]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">{config.name}</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-slate-400 text-sm">{config.description}</p>

          {config.setupInstructions && (
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Setup Instructions</h4>
              <p className="text-sm text-slate-400">{config.setupInstructions}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Connection Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['pending', 'requested', 'connected'] as IntegrationStatus[]).map((s) => {
                const statusConfig = STATUS_CONFIG[s]
                const Icon = statusConfig.icon
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                      ${status === s
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                      }
                    `}
                  >
                    <Icon size={16} />
                    {statusConfig.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Account ID, special access requirements, etc."
              rows={3}
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-700 text-slate-300 font-medium rounded-lg hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(status, notes)
              onClose()
            }}
            className="flex-1 px-4 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-500 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function IntegrationCard({ 
  platform, 
  onClick 
}: { 
  platform: IntegrationPlatform
  onClick: () => void
}) {
  const { formData } = useAddProperty()
  const config = INTEGRATION_CONFIG[platform]
  const integration = formData.integrations.find(i => i.platform === platform)
  const status = integration?.status || 'pending'
  const statusConfig = STATUS_CONFIG[status]
  const StatusIcon = statusConfig.icon
  const Icon = ICON_MAP[config.icon] || Link2

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all w-full
        ${status === 'connected' || status === 'verified'
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : status === 'requested'
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
        }
      `}
    >
      <div className={`
        p-3 rounded-xl
        ${status === 'connected' || status === 'verified'
          ? 'bg-emerald-500/20 text-emerald-300'
          : status === 'requested'
            ? 'bg-amber-500/20 text-amber-300'
            : 'bg-slate-700 text-slate-400'
        }
      `}>
        <Icon size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{config.name}</span>
          <StatusIcon size={16} className={statusConfig.color} />
        </div>
        <p className="text-xs text-slate-500 truncate">{config.description}</p>
      </div>
      <ExternalLink size={16} className="text-slate-500" />
    </button>
  )
}

export function IntegrationsStep() {
  const { updateIntegration, formData, goToNextStep, goToPreviousStep } = useAddProperty()
  const [selectedPlatform, setSelectedPlatform] = useState<IntegrationPlatform | null>(null)
  const [showOptional, setShowOptional] = useState(false)

  const handleSave = (status: IntegrationStatus, notes: string) => {
    if (selectedPlatform) {
      updateIntegration(selectedPlatform, { status, notes })
    }
  }

  const getIntegration = (platform: IntegrationPlatform) => {
    return formData.integrations.find(i => i.platform === platform)
  }

  const connectedCount = formData.integrations.filter(
    i => i.status === 'connected' || i.status === 'verified'
  ).length

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-xl shadow-teal-500/25 mb-6">
          <Link2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">
          Connect Your Platforms
        </h1>
        <p className="text-slate-400 text-lg">
          Grant access to analytics and advertising accounts
        </p>
        {connectedCount > 0 && (
          <p className="text-emerald-400 text-sm mt-2">
            {connectedCount} integration{connectedCount !== 1 ? 's' : ''} configured
          </p>
        )}
      </div>

      <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-6 sm:p-8">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Priority Integrations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRIORITY_INTEGRATIONS.map(platform => (
                <IntegrationCard
                  key={platform}
                  platform={platform}
                  onClick={() => setSelectedPlatform(platform)}
                />
              ))}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center justify-between w-full text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 hover:text-white transition-colors"
            >
              <span>Optional Integrations</span>
              <span className="text-xs text-slate-500 normal-case font-normal">
                {showOptional ? 'Hide' : 'Show more'}
              </span>
            </button>
            
            {showOptional && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {OPTIONAL_INTEGRATIONS.map(platform => (
                  <IntegrationCard
                    key={platform}
                    platform={platform}
                    onClick={() => setSelectedPlatform(platform)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
            <p className="text-sm text-slate-400">
              <strong className="text-slate-300">Don&apos;t worry!</strong> You can complete integrations later. 
              We&apos;ll send you setup guides and our team can help with access requests.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={goToPreviousStep}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-700/50 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-all"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <button
              type="button"
              onClick={goToNextStep}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:from-teal-600 hover:to-emerald-700 transition-all duration-200"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {selectedPlatform && (
        <IntegrationModal
          platform={selectedPlatform}
          onClose={() => setSelectedPlatform(null)}
          onSave={handleSave}
          currentStatus={getIntegration(selectedPlatform)?.status || 'pending'}
          currentNotes={getIntegration(selectedPlatform)?.notes || ''}
        />
      )}
    </div>
  )
}





