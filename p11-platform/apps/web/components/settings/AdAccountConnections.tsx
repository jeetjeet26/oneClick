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

type MetaAdAccount = {
  id: string
  name: string
  account_status: number
  currency: string
  timezone_name: string
  amount_spent: string
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
  const [metaAccounts, setMetaAccounts] = useState<MetaAdAccount[]>([])
  const [connections, setConnections] = useState<AdConnection[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mccId, setMccId] = useState<string | null>(null)
  const [googleConfigured, setGoogleConfigured] = useState(false)
  const [metaConfigured, setMetaConfigured] = useState(false)
  const [googleApiError, setGoogleApiError] = useState<string | null>(null)
  const [metaApiError, setMetaApiError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'google' | 'meta'>('google')
  
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
      const [googleRes, metaRes, connectionsRes, propertiesRes] = await Promise.all([
        fetch('/api/integrations/google-ads/accounts'),
        fetch('/api/integrations/meta-ads/accounts'),
        fetch('/api/integrations/ad-connections'),
        fetch('/api/properties'),
      ])

      const googleData = await googleRes.json()
      const metaData = await metaRes.json()
      const connectionsData = await connectionsRes.json()
      const propertiesData = await propertiesRes.json()

      // Google Ads
      if (googleRes.ok) {
        setGoogleAccounts(googleData.accounts || [])
        setMccId(googleData.mcc_id || null)
        setGoogleConfigured(googleData.configured || false)
        setGoogleApiError(googleData.api_error || googleData.error || null)
      } else {
        setGoogleConfigured(googleData.configured || false)
        setGoogleApiError(googleData.api_error || googleData.error || 'Failed to load accounts')
      }

      // Meta Ads
      if (metaRes.ok) {
        setMetaAccounts(metaData.accounts || [])
        setMetaConfigured(metaData.configured || false)
        setMetaApiError(metaData.api_error || metaData.error || null)
      } else {
        setMetaConfigured(metaData.configured || false)
        setMetaApiError(metaData.api_error || metaData.error || null)
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
  const handleLink = async (platform: 'google_ads' | 'meta_ads') => {
    if (!accountToLink || !selectedProperty) return

    const accountId = 'customer_id' in accountToLink 
      ? accountToLink.customer_id 
      : accountToLink.id
    
    const accountName = 'descriptive_name' in accountToLink
      ? accountToLink.descriptive_name
      : accountToLink.name

    setActionLoading(accountId)

    try {
      const response = await fetch('/api/integrations/ad-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: selectedProperty,
          platform,
          account_id: accountId,
          account_name: accountName,
          manager_account_id: platform === 'google_ads' ? mccId : undefined,
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

  // Filter Google accounts by search query
  const filteredGoogleAccounts = googleAccounts.filter(
    (account) =>
      account.descriptive_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.customer_id.includes(searchQuery)
  )
  
  // Filter Meta accounts by search query
  const filteredMetaAccounts = metaAccounts.filter(
    (account) =>
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.id.includes(searchQuery)
  )

  // Separate linked and unlinked Google accounts
  const linkedGoogleAccounts = filteredGoogleAccounts.filter((a) => a.linked)
  const unlinkedGoogleAccounts = filteredGoogleAccounts.filter((a) => !a.linked)
  
  // Separate linked and unlinked Meta accounts
  const linkedMetaAccounts = filteredMetaAccounts.filter((a) => a.linked)
  const unlinkedMetaAccounts = filteredMetaAccounts.filter((a) => !a.linked)

  // Get properties that don't have this platform connected yet
  const currentPlatform = activeTab === 'google' ? 'google_ads' : 'meta_ads'
  const availableProperties = properties.filter(
    (p) => !connections.some((c) => c.property_id === p.id && c.platform === currentPlatform)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="ml-2 text-slate-500">Loading accounts...</span>
      </div>
    )
  }

  // Platform-specific error states
  const renderPlatformError = (platform: 'google' | 'meta') => {
    const isConfigured = platform === 'google' ? googleConfigured : metaConfigured
    const apiError = platform === 'google' ? googleApiError : metaApiError
    const platformName = platform === 'google' ? 'Google Ads' : 'Meta Ads'
    const Icon = platform === 'google' ? GoogleAdsIcon : MetaIcon
    
    if (!isConfigured) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="font-medium text-slate-900 mb-1">{platformName} Not Configured</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {platform === 'google' 
              ? 'Google Ads credentials are not set up. Please configure your MCC credentials in the environment variables.'
              : 'Meta Ads credentials are not set up. Please add META_ACCESS_TOKEN and META_AD_ACCOUNT_ID to environment variables.'}
          </p>
        </div>
      )
    }

    if (apiError) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="font-medium text-slate-900 mb-1">{platformName} API Error</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
            Credentials are configured, but there was an error connecting to {platformName}.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-w-lg mx-auto text-left">
            <p className="text-sm text-red-700 font-mono break-words">{apiError}</p>
          </div>
          {platform === 'google' && (
            <div className="mt-4 text-left max-w-lg mx-auto">
              <p className="text-sm font-medium text-slate-700 mb-2">Common fixes:</p>
              <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1">
                <li>Enable <a href="https://console.cloud.google.com/apis/library/googleads.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google Ads API</a> in Google Cloud Console</li>
                <li>Ensure your developer token has production access (not test mode)</li>
                <li>Verify the refresh token is valid and not expired</li>
              </ol>
            </div>
          )}
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

    return null
  }

  // Get active platform error
  const activePlatformError = renderPlatformError(activeTab)
  
  return (
    <div className="space-y-6">
      {/* Platform Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('google')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'google'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <GoogleAdsIcon />
          <span className="font-medium">Google Ads</span>
          {googleConfigured && googleAccounts.length > 0 && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
              {googleAccounts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('meta')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'meta'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MetaIcon />
          <span className="font-medium">Meta Ads</span>
          {metaConfigured && metaAccounts.length > 0 && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
              {metaAccounts.length}
            </span>
          )}
        </button>
        
        <div className="flex-1"></div>
        
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Refresh accounts"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Header Info */}
      {activeTab === 'google' && googleConfigured && !googleApiError && (
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
      )}
      
      {activeTab === 'meta' && metaConfigured && !metaApiError && (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MetaIcon />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Meta Ad Accounts</h3>
            <p className="text-sm text-slate-500">
              {metaAccounts.length} accounts available
            </p>
          </div>
        </div>
      )}
      
      {/* Show error state if platform has issues */}
      {activePlatformError && activePlatformError}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!activePlatformError && (
        <>
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

          {/* Google Ads Accounts */}
          {activeTab === 'google' && (
            <>
              {/* Linked Google Accounts */}
              {linkedGoogleAccounts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    Linked Accounts ({linkedGoogleAccounts.length})
                  </h4>
                  <div className="space-y-2">
                    {linkedGoogleAccounts.map((account) => {
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

              {/* Unlinked Google Accounts */}
              {unlinkedGoogleAccounts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-slate-400" />
                    Available to Link ({unlinkedGoogleAccounts.length})
                  </h4>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {unlinkedGoogleAccounts.map((account) => (
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

              {/* Empty State for Google */}
              {filteredGoogleAccounts.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-500">
                    {searchQuery ? 'No accounts match your search' : 'No accounts found'}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Meta Ads Accounts */}
          {activeTab === 'meta' && (
            <>
              {/* Linked Meta Accounts */}
              {linkedMetaAccounts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    Linked Accounts ({linkedMetaAccounts.length})
                  </h4>
                  <div className="space-y-2">
                    {linkedMetaAccounts.map((account) => {
                      const connection = connections.find(
                        (c) => c.account_id === account.id && c.platform === 'meta_ads'
                      )
                      return (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white rounded">
                              <MetaIcon />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{account.name}</p>
                              <p className="text-xs text-slate-500">
                                {account.id} → {account.linked_property_name}
                              </p>
                              <p className="text-xs text-slate-400">
                                ${(parseFloat(account.amount_spent) / 100).toFixed(2)} spent · {account.currency}
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

              {/* Unlinked Meta Accounts */}
              {unlinkedMetaAccounts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-slate-400" />
                    Available to Link ({unlinkedMetaAccounts.length})
                  </h4>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {unlinkedMetaAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-slate-100 rounded">
                            <MetaIcon />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{account.name}</p>
                            <p className="text-xs text-slate-500">ID: {account.id}</p>
                            <p className="text-xs text-slate-400">
                              ${(parseFloat(account.amount_spent) / 100).toFixed(2)} spent · {account.currency}
                            </p>
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

              {/* Empty State for Meta */}
              {filteredMetaAccounts.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-500">
                    {searchQuery ? 'No accounts match your search' : 'No accounts found'}
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Link Modal */}
      {showLinkModal && accountToLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Link Ad Account</h3>
            
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Account to link:</p>
              <p className="font-medium text-slate-900">
                {'descriptive_name' in accountToLink ? accountToLink.descriptive_name : accountToLink.name}
              </p>
              <p className="text-xs text-slate-500">
                {'customer_id' in accountToLink ? accountToLink.customer_id : accountToLink.id}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Platform: {activeTab === 'google' ? 'Google Ads' : 'Meta Ads'}
              </p>
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
                    All properties already have a {activeTab === 'google' ? 'Google Ads' : 'Meta Ads'} account linked.
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
                onClick={() => handleLink(activeTab === 'google' ? 'google_ads' : 'meta_ads')}
                disabled={!selectedProperty || actionLoading !== null}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading ? (
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

