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
  Sparkles
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

    setScrapeStatus({ isLoading: true, message: 'Refreshing competitor prices...', type: 'info' })

    try {
      const res = await fetch('/api/marketvision/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refresh',
          propertyId: currentProperty.id
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Refresh failed')
      }

      setScrapeStatus({
        isLoading: false,
        message: 'Price refresh started in background',
        type: 'success'
      })

      // Refresh after delay
      setTimeout(() => {
        handleRefresh()
        setScrapeStatus({ isLoading: false, message: null, type: null })
      }, 5000)

    } catch (err) {
      console.error('Refresh error:', err)
      setScrapeStatus({
        isLoading: false,
        message: err instanceof Error ? err.message : 'Refresh failed',
        type: 'error'
      })
    }
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

      {/* Scrape Status Banner */}
      {scrapeStatus.message && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
          scrapeStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' :
          scrapeStatus.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' :
          'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
        }`}>
          {scrapeStatus.isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : scrapeStatus.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : scrapeStatus.type === 'error' ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Radar className="w-5 h-5" />
          )}
          <span className="flex-1">{scrapeStatus.message}</span>
          {!scrapeStatus.isLoading && (
            <button
              onClick={() => setScrapeStatus({ isLoading: false, message: null, type: null })}
              className="p-1 hover:bg-black/10 rounded"
            >
              ×
            </button>
          )}
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

