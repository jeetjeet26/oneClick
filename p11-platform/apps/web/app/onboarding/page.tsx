'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, MapPin, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

type OnboardingStep = 'organization' | 'property' | 'complete'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>('organization')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data
  const [orgName, setOrgName] = useState('')
  const [propertyName, setPropertyName] = useState('')
  const [propertyAddress, setPropertyAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
  })

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) {
      setError('Organization name is required')
      return
    }
    setError(null)
    setStep('property')
  }

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!propertyName.trim()) {
      setError('Property name is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: orgName,
          propertyName,
          propertyAddress: propertyAddress.street ? propertyAddress : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete setup')
      }

      setStep('complete')
      
      // Redirect to dashboard after a brief celebration
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const skipProperty = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: orgName,
          propertyName: null,
          propertyAddress: null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete setup')
      }

      setStep('complete')
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Progress indicator */}
      <div className="relative z-10 pt-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
              step === 'organization' ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300' :
              step === 'property' || step === 'complete' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' :
              'border-slate-600 text-slate-500'
            }`}>
              {step === 'organization' ? '1' : <CheckCircle2 size={20} />}
            </div>
            <div className={`w-20 h-0.5 transition-all duration-500 ${
              step === 'property' || step === 'complete' ? 'bg-gradient-to-r from-emerald-400 to-indigo-400' : 'bg-slate-700'
            }`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
              step === 'property' ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300' :
              step === 'complete' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' :
              'border-slate-600 text-slate-500'
            }`}>
              {step === 'complete' ? <CheckCircle2 size={20} /> : '2'}
            </div>
            <div className={`w-20 h-0.5 transition-all duration-500 ${
              step === 'complete' ? 'bg-gradient-to-r from-emerald-400 to-indigo-400' : 'bg-slate-700'
            }`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
              step === 'complete' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' :
              'border-slate-600 text-slate-500'
            }`}>
              {step === 'complete' ? <Sparkles size={20} /> : '3'}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          
          {/* Step 1: Organization */}
          {step === 'organization' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/25 mb-6">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">
                  Let&apos;s get you set up
                </h1>
                <p className="text-slate-400 text-lg">
                  First, tell us about your organization
                </p>
              </div>

              <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-8">
                {error && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleCreateOrganization} className="space-y-6">
                  <div>
                    <label htmlFor="orgName" className="block text-sm font-medium text-slate-300 mb-2">
                      Organization name
                    </label>
                    <input
                      id="orgName"
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Acme Property Management"
                      className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      autoFocus
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      This is your company or team name
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-600 hover:to-purple-700 transition-all duration-200"
                  >
                    Continue
                    <ArrowRight size={18} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Step 2: Property */}
          {step === 'property' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/25 mb-6">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">
                  Add your first property
                </h1>
                <p className="text-slate-400 text-lg">
                  Set up a property to start tracking performance
                </p>
              </div>

              <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-8">
                {error && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleCreateProperty} className="space-y-5">
                  <div>
                    <label htmlFor="propertyName" className="block text-sm font-medium text-slate-300 mb-2">
                      Property name
                    </label>
                    <input
                      id="propertyName"
                      type="text"
                      value={propertyName}
                      onChange={(e) => setPropertyName(e.target.value)}
                      placeholder="Sunset Gardens Apartments"
                      className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label htmlFor="street" className="block text-sm font-medium text-slate-300 mb-2">
                      Address <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      id="street"
                      type="text"
                      value={propertyAddress.street}
                      onChange={(e) => setPropertyAddress({ ...propertyAddress, street: e.target.value })}
                      placeholder="123 Main Street"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <input
                        type="text"
                        value={propertyAddress.city}
                        onChange={(e) => setPropertyAddress({ ...propertyAddress, city: e.target.value })}
                        placeholder="City"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={propertyAddress.state}
                        onChange={(e) => setPropertyAddress({ ...propertyAddress, state: e.target.value })}
                        placeholder="State"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={propertyAddress.zip}
                        onChange={(e) => setPropertyAddress({ ...propertyAddress, zip: e.target.value })}
                        placeholder="ZIP"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-2 space-y-3">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Setting up...
                        </>
                      ) : (
                        <>
                          Complete setup
                          <Sparkles size={18} />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={skipProperty}
                      disabled={isLoading}
                      className="w-full px-6 py-3 text-slate-400 hover:text-white font-medium rounded-xl hover:bg-slate-700/50 transition-all duration-200 disabled:opacity-50"
                    >
                      Skip for now
                    </button>
                  </div>
                </form>
              </div>

              <button
                type="button"
                onClick={() => setStep('organization')}
                className="mt-4 mx-auto block text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                ← Back to organization
              </button>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 'complete' && (
            <div className="animate-in fade-in zoom-in-95 duration-500 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-xl shadow-emerald-500/30 mb-8">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">
                You&apos;re all set!
              </h1>
              <p className="text-slate-400 text-lg mb-8">
                Taking you to your dashboard...
              </p>
              <div className="flex justify-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 pb-6 text-center">
        <p className="text-slate-600 text-sm">
          P11 Platform • Built for property marketing teams
        </p>
      </div>
    </div>
  )
}

