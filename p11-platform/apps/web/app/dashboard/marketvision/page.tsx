'use client'

import { useState, useCallback } from 'react'
import { usePropertyContext } from '@/components/layout/PropertyContext'
import { 
  MarketSummary, 
  CompetitorList, 
  CompetitorForm, 
  RentComparisonChart,
  PriceTrendChart,
  MarketAlertsList,
  CompetitorDetailDrawer
} from '@/components/marketvision'
import { BrandIntelligenceDashboard } from '@/components/marketvision/BrandIntelligenceDashboard'
import {
  Eye,
  TrendingUp,
  Building2,
  Bell,
  Settings,
  RefreshCw,
  Radar,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Search,
  Link2
} from 'lucide-react'

interface Competitor {
  id: string
  name: string
  address: string | null
  websiteUrl: string | null
  phone: string | null
  unitsCount: number | null
  yearBuilt: number | null
  propertyType: string
  amenities: string[]
  photos: string[]
  ilsListings: Record<string, string>
  notes: string | null
  isActive: boolean
  lastScrapedAt: string | null
}

type TabId = 'overview' | 'competitors' | 'brand-intel' | 'alerts'

interface ScrapeStatus {
  isLoading: boolean
  message: string | null
  type: 'info' | 'success' | 'error' | null
  progress?: {
    current: number
    total: number
    stage: 'starting' | 'scraping' | 'processing' | 'complete'
    details?: string
  }
}

export default function MarketVisionPage() {
  const { currentProperty } = usePropertyContext()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null)
  const [viewingCompetitor, setViewingCompetitor] = useState<Competitor | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus>({
    isLoading: false,
    message: null,
    type: null
  })
  const [showDiscoverModal, setShowDiscoverModal] = useState(false)
  const [discoverSettings, setDiscoverSettings] = useState({
    radiusMiles: 3,
    maxCompetitors: 20,
    autoAdd: true,
    extractBrandIntelligence: true
  })
  const [showCityStateModal, setShowCityStateModal] = useState(false)
  const [cityStateInput, setCityStateInput] = useState({ city: '', state: '' })

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  const handleDiscover = async () => {
    if (!currentProperty?.id) return

    const message = discoverSettings.extractBrandIntelligence 
      ? 'Discovering competitors and analyzing brands...'
      : 'Discovering competitors...'
    setScrapeStatus({ isLoading: true, message, type: 'info' })
    setShowDiscoverModal(false)

    try {
      const res = await fetch('/api/marketvision/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discover',
          propertyId: currentProperty.id,
          radiusMiles: discoverSettings.radiusMiles,
          maxCompetitors: discoverSettings.maxCompetitors,
          autoAdd: discoverSettings.autoAdd
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Discovery failed')
      }

      const result = data.result
      let statusMessage = 'Discovery started in background'
      
      if (result?.data?.discovered_count !== undefined) {
        statusMessage = `Found ${result.data.discovered_count} competitors, added ${result.data.added_count} new`
        
        // Trigger brand intelligence extraction if enabled and competitors were added
        if (discoverSettings.extractBrandIntelligence && result.data.added_count > 0) {
          try {
            await fetch('/api/marketvision/brand-intelligence', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                propertyId: currentProperty.id,
                forceRefresh: false
              })
            })
            statusMessage += '. Brand analysis started in background.'
          } catch (brandErr) {
            console.error('Brand intelligence error:', brandErr)
          }
        }
      }

      setScrapeStatus({
        isLoading: false,
        message: statusMessage,
        type: 'success'
      })

      // Refresh the list after a short delay
      setTimeout(() => {
        handleRefresh()
        setScrapeStatus({ isLoading: false, message: null, type: null })
      }, 3000)

    } catch (err) {
      console.error('Discovery error:', err)
      setScrapeStatus({
        isLoading: false,
        message: err instanceof Error ? err.message : 'Discovery failed',
        type: 'error'
      })
    }
  }

  const handleRefreshPrices = async () => {
    if (!currentProperty?.id) return

    // Start with progress indication
    setScrapeStatus({ 
      isLoading: true, 
      message: 'Starting price refresh...', 
      type: 'info',
      progress: {
        current: 0,
        total: 100,
        stage: 'starting',
        details: 'Connecting to competitor websites'
      }
    })

    // Simulate progress while waiting for backend
    let progressInterval: NodeJS.Timeout | null = null
    let currentProgress = 0
    
    const updateProgress = (stage: 'starting' | 'scraping' | 'processing' | 'complete', details: string, targetProgress: number) => {
      setScrapeStatus(prev => ({
        ...prev,
        message: `Refreshing competitor prices...`,
        progress: {
          current: targetProgress,
          total: 100,
          stage,
          details
        }
      }))
    }

    // Start progress animation
    progressInterval = setInterval(() => {
      currentProgress += Math.random() * 5
      if (currentProgress < 30) {
        updateProgress('starting', 'Connecting to competitor websites...', Math.min(currentProgress, 25))
      } else if (currentProgress < 70) {
        updateProgress('scraping', 'Scraping pricing data from websites...', Math.min(currentProgress, 65))
      } else if (currentProgress < 90) {
        updateProgress('processing', 'Processing and comparing prices...', Math.min(currentProgress, 85))
      }
    }, 500)

    try {
      // The API now runs synchronously and waits for completion
      // Set a 10 minute timeout since scraping multiple competitors takes time
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000) // 10 minutes
      
      const res = await fetch('/api/marketvision/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refresh',
          propertyId: currentProperty.id
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      const data = await res.json()

      // Clear the progress interval since we got a response
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }

      if (!res.ok) {
        throw new Error(data.error || 'Refresh failed')
      }

      // Build detailed status message from actual results (data now contains full result)
      const result = data
      let statusMessage = 'Price refresh complete'
      
      if (result) {
        const websiteUpdated = result.website_updated || 0
        const ilsUpdated = result.ils_updated || 0
        const totalUpdated = result.updated_count || websiteUpdated + ilsUpdated
        const totalCompetitors = result.total_competitors || 0
        const errorCount = result.error_count || 0
        
        if (totalUpdated > 0) {
          if (websiteUpdated > 0 && ilsUpdated > 0) {
            statusMessage = `Updated ${totalUpdated} competitors (${websiteUpdated} from websites, ${ilsUpdated} from listings)`
          } else if (websiteUpdated > 0) {
            statusMessage = `Updated ${websiteUpdated} competitors from websites`
          } else if (ilsUpdated > 0) {
            statusMessage = `Updated ${ilsUpdated} competitors from listings`
          } else {
            statusMessage = `Updated ${totalUpdated} competitors`
          }
        } else if (totalCompetitors > 0) {
          if (errorCount > 0 && errorCount === totalCompetitors) {
            statusMessage = `Checked ${totalCompetitors} competitors - websites unavailable`
          } else if (errorCount > 0) {
            statusMessage = `Checked ${totalCompetitors} competitors - some sites unavailable`
          } else {
            statusMessage = `Checked ${totalCompetitors} competitors - no price changes`
          }
        }
      }

      // Show success immediately since scraping is complete
      setScrapeStatus({
        isLoading: false,
        message: statusMessage,
        type: 'success',
        progress: {
          current: 100,
          total: 100,
          stage: 'complete',
          details: 'Price refresh complete!'
        }
      })

      // Refresh the competitor data
      handleRefresh()

      // Auto-dismiss after showing success
      setTimeout(() => {
        setScrapeStatus({ isLoading: false, message: null, type: null })
      }, 5000)

    } catch (err) {
      // Clear the progress interval
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      console.error('Refresh error:', err)
      setScrapeStatus({
        isLoading: false,
        message: err instanceof Error ? err.message : 'Refresh failed',
        type: 'error'
      })
    }
  }

  const handleFindApartmentsComListings = async (city?: string, state?: string) => {
    if (!currentProperty?.id) return

    setScrapeStatus({ 
      isLoading: true, 
      message: 'Searching apartments.com for competitor listings...', 
      type: 'info' 
    })

    try {
      const res = await fetch('/api/marketvision/apartments-com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'find_listings',
          propertyId: currentProperty.id,
          autoScrape: true,
          city: city || undefined,
          state: state || undefined
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Search failed')
      }

      // Check if all failed due to missing city/state
      const allMissingCityState = data.not_found_listings?.every(
        (l: { reason?: string }) => l.reason === 'Missing city/state'
      )
      
      if (data.found === 0 && data.not_found > 0 && allMissingCityState && !city && !state) {
        // Show modal to get city/state
        setScrapeStatus({ isLoading: false, message: null, type: null })
        setShowCityStateModal(true)
        return
      }

      // Build status message
      let statusMessage = ''
      if (data.found > 0) {
        statusMessage = `Found ${data.found} apartments.com listings out of ${data.searched} competitors`
        if (data.found_listings?.some((l: { units_scraped?: number }) => l.units_scraped)) {
          statusMessage += ' - pricing data scraped!'
        }
      } else if (data.searched > 0) {
        statusMessage = `Searched ${data.searched} competitors but no apartments.com matches found`
      } else {
        statusMessage = data.message || 'All competitors already have apartments.com URLs'
      }

      setScrapeStatus({
        isLoading: false,
        message: statusMessage,
        type: data.found > 0 ? 'success' : 'info'
      })

      // Refresh after delay
      setTimeout(() => {
        handleRefresh()
        setScrapeStatus({ isLoading: false, message: null, type: null })
      }, 5000)

    } catch (err) {
      console.error('Find listings error:', err)
      setScrapeStatus({
        isLoading: false,
        message: err instanceof Error ? err.message : 'Search failed',
        type: 'error'
      })
    }
  }
  
  const handleCityStateSubmit = () => {
    setShowCityStateModal(false)
    handleFindApartmentsComListings(cityStateInput.city, cityStateInput.state)
  }

  const handleAddCompetitor = async (data: Record<string, unknown>) => {
    const res = await fetch('/api/marketvision/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: currentProperty?.id,
        ...data,
        units: (data.units as Array<Record<string, unknown>>)?.map(u => ({
          unitType: u.unitType,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms || 1,
          sqftMin: u.sqftMin ? parseInt(u.sqftMin as string) : null,
          sqftMax: u.sqftMax ? parseInt(u.sqftMax as string) : null,
          rentMin: u.rentMin ? parseFloat(u.rentMin as string) : null,
          rentMax: u.rentMax ? parseFloat(u.rentMax as string) : null,
          availableCount: u.availableCount ? parseInt(u.availableCount as string) : 0
        }))
      })
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to add competitor')
    }

    handleRefresh()
  }

  const handleEditCompetitor = async (data: Record<string, unknown>) => {
    if (!editingCompetitor) return

    const res = await fetch('/api/marketvision/competitors', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingCompetitor.id,
        ...data
      })
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to update competitor')
    }

    handleRefresh()
    setEditingCompetitor(null)
  }

  const tabs = [
    { id: 'overview' as TabId, label: 'Overview', icon: Eye },
    { id: 'competitors' as TabId, label: 'Competitors', icon: Building2 },
    { id: 'brand-intel' as TabId, label: 'Brand Intelligence', icon: Sparkles },
    { id: 'alerts' as TabId, label: 'Alerts', icon: Bell }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-emerald-500" />
            MarketVision 360
          </h1>
          <p className="text-gray-500 mt-1">
            Competitive intelligence and market analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDiscoverModal(true)}
            disabled={scrapeStatus.isLoading || !currentProperty}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Radar className="w-4 h-4" />
            Auto-Discover
          </button>
          <button
            onClick={() => handleFindApartmentsComListings()}
            disabled={scrapeStatus.isLoading || !currentProperty}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Find apartments.com listings for existing competitors"
          >
            {scrapeStatus.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            Find Listings
          </button>
          <button
            onClick={handleRefreshPrices}
            disabled={scrapeStatus.isLoading || !currentProperty}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {scrapeStatus.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh Prices
          </button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrape Status Banner with Progress Bar */}
      {scrapeStatus.message && (
        <div className={`rounded-xl border overflow-hidden ${
          scrapeStatus.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
            : scrapeStatus.type === 'error' 
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        }`}>
          {/* Progress Bar */}
          {scrapeStatus.progress && scrapeStatus.isLoading && (
            <div className="h-1.5 bg-black/5 dark:bg-white/5 relative overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ease-out ${
                  scrapeStatus.type === 'success' 
                    ? 'bg-emerald-500' 
                    : scrapeStatus.type === 'error'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                }`}
                style={{ width: `${scrapeStatus.progress.current}%` }}
              />
              {/* Animated shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
                   style={{ backgroundSize: '200% 100%' }} />
            </div>
          )}
          
          {/* Completed Progress Bar */}
          {scrapeStatus.progress && !scrapeStatus.isLoading && scrapeStatus.type === 'success' && (
            <div className="h-1.5 bg-emerald-500" />
          )}
          
          {/* Status Content */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              {scrapeStatus.isLoading ? (
                <div className="relative">
                  <Loader2 className={`w-5 h-5 animate-spin ${
                    scrapeStatus.type === 'success' ? 'text-emerald-600' :
                    scrapeStatus.type === 'error' ? 'text-red-600' : 'text-blue-600'
                  }`} />
                </div>
              ) : scrapeStatus.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : scrapeStatus.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-600" />
              ) : (
                <Radar className="w-5 h-5 text-blue-600" />
              )}
              
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${
                  scrapeStatus.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' :
                  scrapeStatus.type === 'error' ? 'text-red-700 dark:text-red-300' :
                  'text-blue-700 dark:text-blue-300'
                }`}>
                  {scrapeStatus.message}
                </div>
                
                {/* Progress Details */}
                {scrapeStatus.progress && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm ${
                      scrapeStatus.type === 'success' ? 'text-emerald-600/70 dark:text-emerald-400/70' :
                      scrapeStatus.type === 'error' ? 'text-red-600/70 dark:text-red-400/70' :
                      'text-blue-600/70 dark:text-blue-400/70'
                    }`}>
                      {scrapeStatus.progress.details}
                    </span>
                    {scrapeStatus.isLoading && (
                      <span className={`text-sm font-mono ${
                        scrapeStatus.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                        scrapeStatus.type === 'error' ? 'text-red-600 dark:text-red-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`}>
                        {Math.round(scrapeStatus.progress.current)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {!scrapeStatus.isLoading && (
                <button
                  onClick={() => setScrapeStatus({ isLoading: false, message: null, type: null })}
                  className={`p-1.5 rounded-lg transition-colors ${
                    scrapeStatus.type === 'success' 
                      ? 'hover:bg-emerald-200 dark:hover:bg-emerald-800' 
                      : scrapeStatus.type === 'error'
                        ? 'hover:bg-red-200 dark:hover:bg-red-800'
                        : 'hover:bg-blue-200 dark:hover:bg-blue-800'
                  }`}
                >
                  ×
                </button>
              )}
            </div>
            
            {/* Stage Indicator */}
            {scrapeStatus.progress && scrapeStatus.isLoading && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                {(['starting', 'scraping', 'processing', 'complete'] as const).map((stage, idx) => (
                  <div key={stage} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full transition-colors ${
                      scrapeStatus.progress?.stage === stage 
                        ? 'bg-blue-500 animate-pulse' 
                        : (['starting', 'scraping', 'processing', 'complete'].indexOf(scrapeStatus.progress?.stage || 'starting') > idx)
                          ? 'bg-emerald-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    <span className={`text-xs capitalize ${
                      scrapeStatus.progress?.stage === stage 
                        ? 'text-blue-600 dark:text-blue-400 font-medium' 
                        : 'text-gray-500'
                    }`}>
                      {stage}
                    </span>
                    {idx < 3 && (
                      <div className={`w-6 h-0.5 mx-1 ${
                        (['starting', 'scraping', 'processing', 'complete'].indexOf(scrapeStatus.progress?.stage || 'starting') > idx)
                          ? 'bg-emerald-400'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Market Summary */}
          <MarketSummary 
            key={`summary-${refreshKey}`}
            propertyId={currentProperty?.id} 
            onRefresh={handleRefresh}
          />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RentComparisonChart 
              key={`comparison-${refreshKey}`}
              propertyId={currentProperty?.id}
              ourPropertyName={currentProperty?.name}
            />
            <PriceTrendChart 
              key={`trends-${refreshKey}`}
              propertyId={currentProperty?.id}
            />
          </div>

          {/* Recent Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                Recent Alerts
              </h3>
              <button
                onClick={() => setActiveTab('alerts')}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                View all →
              </button>
            </div>
            <MarketAlertsList 
              key={`alerts-compact-${refreshKey}`}
              propertyId={currentProperty?.id}
              limit={5}
              compact
            />
          </div>
        </div>
      )}

      {activeTab === 'competitors' && (
        <CompetitorList
          key={`competitors-${refreshKey}`}
          propertyId={currentProperty?.id}
          onAddClick={() => setShowAddForm(true)}
          onEditClick={setEditingCompetitor}
          onViewClick={setViewingCompetitor}
          onRefresh={handleRefresh}
        />
      )}

      {activeTab === 'brand-intel' && currentProperty?.id && (
        <BrandIntelligenceDashboard
          key={`brand-intel-${refreshKey}`}
          propertyId={currentProperty.id}
          propertyName={currentProperty.name}
        />
      )}

      {activeTab === 'alerts' && (
        <MarketAlertsList
          key={`alerts-full-${refreshKey}`}
          propertyId={currentProperty?.id}
          limit={50}
        />
      )}

      {/* Add Competitor Modal */}
      {showAddForm && currentProperty && (
        <CompetitorForm
          propertyId={currentProperty.id}
          onSubmit={handleAddCompetitor}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Edit Competitor Modal */}
      {editingCompetitor && currentProperty && (
        <CompetitorForm
          propertyId={currentProperty.id}
          initialData={{
            name: editingCompetitor.name,
            address: editingCompetitor.address || '',
            websiteUrl: editingCompetitor.websiteUrl || '',
            phone: editingCompetitor.phone || '',
            unitsCount: editingCompetitor.unitsCount?.toString() || '',
            yearBuilt: editingCompetitor.yearBuilt?.toString() || '',
            propertyType: editingCompetitor.propertyType,
            amenities: editingCompetitor.amenities,
            notes: editingCompetitor.notes || ''
          }}
          onSubmit={handleEditCompetitor}
          onClose={() => setEditingCompetitor(null)}
          isEdit
        />
      )}

      {/* Competitor Detail Drawer */}
      {viewingCompetitor && (
        <CompetitorDetailDrawer
          competitor={viewingCompetitor}
          onClose={() => setViewingCompetitor(null)}
          onEdit={(comp) => {
            setViewingCompetitor(null)
            setEditingCompetitor(comp)
          }}
        />
      )}

      {/* City/State Input Modal */}
      {showCityStateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-500" />
                Specify Location
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Could not detect city/state from competitor addresses. Please enter the location to search.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={cityStateInput.city}
                  onChange={(e) => setCityStateInput(s => ({ ...s, city: e.target.value }))}
                  placeholder="e.g., San Diego"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  State (2-letter code)
                </label>
                <input
                  type="text"
                  value={cityStateInput.state}
                  onChange={(e) => setCityStateInput(s => ({ ...s, state: e.target.value.toUpperCase().slice(0, 2) }))}
                  placeholder="e.g., CA"
                  maxLength={2}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This will search apartments.com for all your competitors in this location and link their listings.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCityStateModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCityStateSubmit}
                disabled={!cityStateInput.city || !cityStateInput.state}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />
                Search Apartments.com
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Discover Modal */}
      {showDiscoverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Radar className="w-5 h-5 text-emerald-500" />
                Auto-Discover Competitors
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Automatically find and add competitor properties near {currentProperty?.name}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Radius (miles)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={discoverSettings.radiusMiles}
                  onChange={(e) => setDiscoverSettings(s => ({ ...s, radiusMiles: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>1 mi</span>
                  <span className="font-medium text-emerald-600">{discoverSettings.radiusMiles} miles</span>
                  <span>10 mi</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Competitors
                </label>
                <select
                  value={discoverSettings.maxCompetitors}
                  onChange={(e) => setDiscoverSettings(s => ({ ...s, maxCompetitors: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value={5}>5 competitors</option>
                  <option value={10}>10 competitors</option>
                  <option value={20}>20 competitors</option>
                  <option value={30}>30 competitors</option>
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={discoverSettings.autoAdd}
                  onChange={(e) => setDiscoverSettings(s => ({ ...s, autoAdd: e.target.checked }))}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Automatically add to tracker
                  </span>
                  <p className="text-xs text-gray-500">
                    Discovered competitors will be added with current pricing
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={discoverSettings.extractBrandIntelligence}
                  onChange={(e) => setDiscoverSettings(s => ({ ...s, extractBrandIntelligence: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    Extract Brand Intelligence
                  </span>
                  <p className="text-xs text-gray-500">
                    Scrape competitor websites for brand positioning, specials, and messaging
                  </p>
                </div>
              </label>

              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Note:</strong> Discovery uses Google Places to find competitors. 
                  Brand intelligence extraction analyzes their websites using AI.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowDiscoverModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscover}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Radar className="w-4 h-4" />
                Start Discovery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

