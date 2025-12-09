'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Link2,
  Unlink,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
  Building2,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react'

// Google Ads icon as SVG
const GoogleAdsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M12.0002 17.3334L17.3335 2.66675H21.3335L14.0002 22.6667H10.0002L12.0002 17.3334Z" fill="#FBBC04"/>
    <path d="M2.66683 2.66675H6.66683L14.0002 22.6667H10.0002L2.66683 2.66675Z" fill="#4285F4"/>
    <path d="M2.66683 22.6667C4.14159 22.6667 5.3335 21.4748 5.3335 20.0001C5.3335 18.5253 4.14159 17.3334 2.66683 17.3334C1.19207 17.3334 0.000163078 18.5253 0.000163078 20.0001C0.000163078 21.4748 1.19207 22.6667 2.66683 22.6667Z" fill="#34A853"/>
  </svg>
)

// Meta icon as SVG
const MetaIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/>
  </svg>
)

type GoogleAdsAccount = {
  customer_id: string
  descriptive_name: string
  currency_code?: string
  time_zone?: string
  linked: boolean
  linked_property_id?: string | null
  linked_property_name?: string | null
}

type AdConnection = {
  id: string
  property_id: string
  platform: string
  account_id: string
  account_name: string
  is_active: boolean
  last_sync_at?: string
  last_sync_status?: string
  properties?: { id: string; name: string }
}

type Property = {
  id: string
  name: string
}

export function AdAccountConnections() {
  const [loading, setLoading] = useState(true)
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAdsAccount[]>([])
  const [connections, setConnections] = useState<AdConnection[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mccId, setMccId] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  
  // UI state
  const [linkingAccount, setLinkingAccount] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [accountToLink, setAccountToLink] = useState<GoogleAdsAccount | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [accountsRes, connectionsRes, propertiesRes] = await Promise.all([
        fetch('/api/integrations/google-ads/accounts'),
        fetch('/api/integrations/ad-connections'),
        fetch('/api/properties'),
      ])

      const accountsData = await accountsRes.json()
      const connectionsData = await connectionsRes.json()
      const propertiesData = await propertiesRes.json()

      if (accountsRes.ok) {
        setGoogleAccounts(accountsData.accounts || [])
        setMccId(accountsData.mcc_id || null)
        setIsConfigured(accountsData.configured || false)
        setApiError(accountsData.api_error || accountsData.error || null)
      } else {
        // Even on error response, check if configured
        setIsConfigured(accountsData.configured || false)
        setApiError(accountsData.api_error || accountsData.error || 'Failed to load accounts')
      }

      if (connectionsRes.ok) {
        setConnections(connectionsData.connections || [])
      }

      if (propertiesRes.ok) {
        setProperties(propertiesData.properties || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Link an account to a property
  const handleLink = async () => {
    if (!accountToLink || !selectedProperty) return

    setActionLoading(accountToLink.customer_id)

    try {
      const response = await fetch('/api/integrations/ad-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: selectedProperty,
          platform: 'google_ads',
          account_id: accountToLink.customer_id,
          account_name: accountToLink.descriptive_name,
          manager_account_id: mccId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to link account')
      }

      // Refresh data
      await fetchData()
      setShowLinkModal(false)
      setAccountToLink(null)
      setSelectedProperty('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link account')
    } finally {
      setActionLoading(null)
    }
  }

  // Unlink an account
  const handleUnlink = async (connectionId: string) => {
    if (!confirm('Are you sure you want to unlink this account?')) return

    setActionLoading(connectionId)

    try {
      const response = await fetch(`/api/integrations/ad-connections?id=${connectionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to unlink account')
      }

      // Refresh data
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink account')
    } finally {
      setActionLoading(null)
    }
  }

  // Filter accounts by search query
  const filteredAccounts = googleAccounts.filter(
    (account) =>
      account.descriptive_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.customer_id.includes(searchQuery)
  )

  // Separate linked and unlinked accounts
  const linkedAccounts = filteredAccounts.filter((a) => a.linked)
  const unlinkedAccounts = filteredAccounts.filter((a) => !a.linked)

  // Get properties that don't have this platform connected yet
  const availableProperties = properties.filter(
    (p) => !connections.some((c) => c.property_id === p.id && c.platform === 'google_ads')
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="ml-2 text-slate-500">Loading accounts...</span>
      </div>
    )
  }

  if (!isConfigured) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="font-medium text-slate-900 mb-1">Google Ads Not Configured</h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Google Ads credentials are not set up. Please configure your MCC credentials in the environment variables.
        </p>
      </div>
    )
  }

  // Show API error if credentials are configured but API call failed
  if (apiError && googleAccounts.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="font-medium text-slate-900 mb-1">Google Ads API Error</h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
          Credentials are configured, but there was an error connecting to Google Ads.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-w-lg mx-auto text-left">
          <p className="text-sm text-red-700 font-mono break-words">{apiError}</p>
        </div>
        <div className="mt-4 text-left max-w-lg mx-auto">
          <p className="text-sm font-medium text-slate-700 mb-2">Common fixes:</p>
          <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1">
            <li>Enable <a href="https://console.cloud.google.com/apis/library/googleads.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google Ads API</a> in Google Cloud Console</li>
            <li>Ensure your developer token has production access (not test mode)</li>
            <li>Verify the refresh token is valid and not expired</li>
          </ol>
        </div>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <GoogleAdsIcon />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Google Ads Accounts</h3>
            <p className="text-sm text-slate-500">
              MCC: {mccId} · {googleAccounts.length} accounts available
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Refresh accounts"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search accounts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
        />
      </div>

      {/* Linked Accounts */}
      {linkedAccounts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            Linked Accounts ({linkedAccounts.length})
          </h4>
          <div className="space-y-2">
            {linkedAccounts.map((account) => {
              const connection = connections.find(
                (c) => c.account_id === account.customer_id && c.platform === 'google_ads'
              )
              return (
                <div
                  key={account.customer_id}
                  className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white rounded">
                      <GoogleAdsIcon />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{account.descriptive_name}</p>
                      <p className="text-xs text-slate-500">
                        {account.customer_id} → {account.linked_property_name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => connection && handleUnlink(connection.id)}
                    disabled={actionLoading === connection?.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    {actionLoading === connection?.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Unlink className="w-4 h-4" />
                    )}
                    Unlink
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Unlinked Accounts */}
      {unlinkedAccounts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-slate-400" />
            Available to Link ({unlinkedAccounts.length})
          </h4>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {unlinkedAccounts.map((account) => (
              <div
                key={account.customer_id}
                className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-slate-100 rounded">
                    <GoogleAdsIcon />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{account.descriptive_name}</p>
                    <p className="text-xs text-slate-500">{account.customer_id}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAccountToLink(account)
                    setShowLinkModal(true)
                  }}
                  disabled={availableProperties.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Link2 className="w-4 h-4" />
                  Link
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredAccounts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500">
            {searchQuery ? 'No accounts match your search' : 'No accounts found'}
          </p>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && accountToLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Link Ad Account</h3>
            
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Account to link:</p>
              <p className="font-medium text-slate-900">{accountToLink.descriptive_name}</p>
              <p className="text-xs text-slate-500">{accountToLink.customer_id}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Property
              </label>
              {availableProperties.length > 0 ? (
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                  >
                    <option value="">Choose a property...</option>
                    {availableProperties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    All properties already have a Google Ads account linked.
                    Create a new property or unlink an existing account first.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLinkModal(false)
                  setAccountToLink(null)
                  setSelectedProperty('')
                }}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLink}
                disabled={!selectedProperty || actionLoading === accountToLink.customer_id}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading === accountToLink.customer_id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Link Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

