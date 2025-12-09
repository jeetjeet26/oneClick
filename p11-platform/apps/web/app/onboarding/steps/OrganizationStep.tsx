'use client'

import { Building2, ArrowRight, Briefcase, Home, Landmark, TrendingUp } from 'lucide-react'
import { useOnboarding } from '../components/OnboardingProvider'
import { OrganizationType } from '../types'

const ORG_TYPE_OPTIONS: { value: OrganizationType; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    value: 'pmc', 
    label: 'Property Management Company', 
    description: 'Manage properties for multiple owners',
    icon: <Briefcase className="w-5 h-5" />
  },
  { 
    value: 'owner_operator', 
    label: 'Owner/Operator', 
    description: 'Own and manage your own properties',
    icon: <Home className="w-5 h-5" />
  },
  { 
    value: 'developer', 
    label: 'Developer', 
    description: 'Build and develop new properties',
    icon: <TrendingUp className="w-5 h-5" />
  },
  { 
    value: 'reit', 
    label: 'REIT', 
    description: 'Real Estate Investment Trust',
    icon: <Landmark className="w-5 h-5" />
  },
]

export function OrganizationStep() {
  const { formData, updateOrganization, error, setError, canProceed, goToNextStep } = useOnboarding()
  const { organization } = formData

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization.name.trim()) {
      setError('Organization name is required')
      return
    }
    setError(null)
    goToNextStep()
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-amber-500/25 mb-6">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">
          Welcome to P11 Platform
        </h1>
        <p className="text-slate-400 text-lg">
          Let&apos;s start with your organization details
        </p>
      </div>

      <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-8">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization Name */}
          <div>
            <label htmlFor="orgName" className="block text-sm font-medium text-slate-300 mb-2">
              Organization name <span className="text-red-400">*</span>
            </label>
            <input
              id="orgName"
              type="text"
              value={organization.name}
              onChange={(e) => updateOrganization({ name: e.target.value })}
              placeholder="Acme Property Management"
              className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
              autoFocus
            />
            <p className="mt-2 text-xs text-slate-500">
              Your company or team name as it appears to clients
            </p>
          </div>

          {/* Legal Name */}
          <div>
            <label htmlFor="legalName" className="block text-sm font-medium text-slate-300 mb-2">
              Legal name <span className="text-slate-500">(optional)</span>
            </label>
            <input
              id="legalName"
              type="text"
              value={organization.legalName}
              onChange={(e) => updateOrganization({ legalName: e.target.value })}
              placeholder="Acme Property Management, LLC"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            />
            <p className="mt-2 text-xs text-slate-500">
              Legal entity name for contracts (if different)
            </p>
          </div>

          {/* Organization Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Organization type <span className="text-slate-500">(optional)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ORG_TYPE_OPTIONS.map(({ value, label, description, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateOrganization({ type: value })}
                  className={`
                    flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all
                    ${organization.type === value
                      ? 'border-amber-400 bg-amber-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                    }
                  `}
                >
                  <div className={`
                    mt-0.5 p-2 rounded-lg
                    ${organization.type === value ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-400'}
                  `}>
                    {icon}
                  </div>
                  <div>
                    <span className="font-medium block">{label}</span>
                    <span className="text-xs text-slate-500 mt-0.5 block">{description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!canProceed()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:from-amber-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}

