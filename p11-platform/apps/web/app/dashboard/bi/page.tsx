'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePropertyContext } from '@/components/layout/PropertyContext'
import { 
  MetricCard, 
  PerformanceChart, 
  ChannelBreakdown, 
  DateRangePicker,
  NaturalLanguageQuery,
  CampaignTable,
  CampaignDetailDrawer,
  ExportButton,
  ScheduleReportModal,
  GoalTracker,
  AnomalyAlert,
  CSVUploadModal,
  DATE_PRESETS,
  type DateRange 
} from '@/components/charts'
import type { ExportData } from '@/utils/export'
import { 
  DollarSign, 
  MousePointerClick, 
  Eye, 
  Target,
  RefreshCw,
  AlertCircle,
  ArrowLeftRight,
  Calendar,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Table,
  Upload
} from 'lucide-react'
import { format } from 'date-fns'

type ComparisonData = {
  previousPeriod: {
    start: string
    end: string
  }
  totals: {
    impressions: number
    clicks: number
    spend: number
    conversions: number
    ctr: number
    cpa: number
  }
  changes: {
    spend: number | null
    clicks: number | null
    impressions: number | null
    conversions: number | null
    ctr: number | null
    cpa: number | null
  }
  channelChanges: Array<{
    channel: string
    spend: number | null
    clicks: number | null
    impressions: number | null
    conversions: number | null
  }>
}

type AnalyticsData = {
  timeSeries: Array<{
    date: string
    impressions: number
    clicks: number
    spend: number
    conversions: number
  }>
  channels: Array<{
    channel: string
    impressions: number
    clicks: number
    spend: number
    conversions: number
    cpa: number
    ctr: number
  }>
  totals: {
    impressions: number
    clicks: number
    spend: number
    conversions: number
    ctr: number
    cpa: number
  }
  comparison?: ComparisonData | null
}

type Campaign = {
  campaign_id: string
  campaign_name: string
  channel: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  ctr: number
  cpc: number
  cpa: number
  first_date: string
  last_date: string
}

type CampaignsData = {
  campaigns: Campaign[]
  channels: string[]
  totals: {
    campaigns: number
    impressions: number
    clicks: number
    spend: number
    conversions: number
    avgCtr: number
    avgCpc: number
    avgCpa: number
  }
}

export default function MultiChannelBIPage() {
  const { currentProperty } = usePropertyContext()
  const [dateRange, setDateRange] = useState<DateRange>(DATE_PRESETS[2]) // Last 30 days
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [campaignsData, setCampaignsData] = useState<CampaignsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [compareEnabled, setCompareEnabled] = useState(true) // Enable comparison by default
  const [showCampaigns, setShowCampaigns] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const fetchData = useCallback(async () => {
    if (!currentProperty?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        propertyId: currentProperty.id,
        startDate: format(dateRange.start, 'yyyy-MM-dd'),
        endDate: format(dateRange.end, 'yyyy-MM-dd'),
        compare: compareEnabled.toString(),
      })
      
      const response = await fetch(`/api/analytics/performance?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [currentProperty?.id, dateRange, compareEnabled])

  const fetchCampaigns = useCallback(async () => {
    if (!currentProperty?.id) return
    
    setCampaignsLoading(true)
    
    try {
      const params = new URLSearchParams({
        propertyId: currentProperty.id,
        startDate: format(dateRange.start, 'yyyy-MM-dd'),
        endDate: format(dateRange.end, 'yyyy-MM-dd'),
      })
      
      const response = await fetch(`/api/analytics/campaigns?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaign data')
      }
      
      const result = await response.json()
      setCampaignsData(result)
    } catch (err) {
      console.error('Error fetching campaigns:', err)
    } finally {
      setCampaignsLoading(false)
    }
  }, [currentProperty?.id, dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch campaigns when expanded
  useEffect(() => {
    if (showCampaigns) {
      fetchCampaigns()
    }
  }, [showCampaigns])

  // Refetch campaigns when date range changes (if expanded)
  useEffect(() => {
    if (showCampaigns && campaignsData) {
      // Only refetch if already expanded and has data (meaning date range changed)
      fetchCampaigns()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

  // Get period-over-period changes from actual data
  const periodChanges = data?.comparison?.changes ?? null

  const hasData = data && (data.timeSeries.length > 0 || data.channels.length > 0)

  // Prepare data for export
  const getExportData = (): ExportData | null => {
    if (!data || !currentProperty) return null

    // Format metrics for export
    const formatCurrency = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const formatNumber = (val: number) => val.toLocaleString('en-US')

    return {
      propertyName: currentProperty.name,
      dateRange: {
        start: format(dateRange.start, 'MMM d, yyyy'),
        end: format(dateRange.end, 'MMM d, yyyy'),
      },
      metrics: [
        { 
          label: 'Total Spend', 
          value: formatCurrency(data.totals.spend),
          change: periodChanges?.spend ?? null
        },
        { 
          label: 'Impressions', 
          value: formatNumber(data.totals.impressions),
          change: periodChanges?.impressions ?? null
        },
        { 
          label: 'Clicks', 
          value: formatNumber(data.totals.clicks),
          change: periodChanges?.clicks ?? null
        },
        { 
          label: 'Conversions', 
          value: formatNumber(data.totals.conversions),
          change: periodChanges?.conversions ?? null
        },
        {
          label: 'CTR',
          value: `${data.totals.ctr.toFixed(2)}%`,
          change: periodChanges?.ctr ?? null
        },
        {
          label: 'CPA',
          value: formatCurrency(data.totals.cpa),
          change: periodChanges?.cpa ?? null
        },
      ],
      timeSeries: data.timeSeries,
      channels: data.channels,
      campaigns: campaignsData?.campaigns ?? undefined,
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">MultiChannel BI</h1>
          <p className="text-slate-500 mt-1">
            Performance analytics for {currentProperty?.name || 'your property'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCompareEnabled(!compareEnabled)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              compareEnabled 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title={compareEnabled ? 'Disable period comparison' : 'Enable period comparison'}
          >
            <ArrowLeftRight size={16} />
            <span className="hidden sm:inline">Compare</span>
          </button>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            title="Import CSV data from Google Ads or Meta"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Import</span>
          </button>
          <ExportButton 
            getData={getExportData}
            disabled={!hasData || loading}
          />
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
            title="Schedule automated email report"
          >
            <CalendarClock size={16} />
            <span className="hidden sm:inline">Schedule</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw size={18} className={`text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Comparison Period Info */}
      {compareEnabled && data?.comparison?.previousPeriod && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg px-4 py-2 flex items-center gap-2 text-sm">
          <Calendar size={16} className="text-indigo-500" />
          <span className="text-indigo-700">
            Comparing to previous period: {data.comparison.previousPeriod.start} → {data.comparison.previousPeriod.end}
          </span>
        </div>
      )}

      {/* Anomaly Detection Alerts */}
      {currentProperty?.id && data && data.timeSeries.length > 0 && (
        <AnomalyAlert
          propertyId={currentProperty.id}
          currentMetrics={data.timeSeries}
          previousMetrics={data.comparison?.totals ? {
            impressions: data.comparison.totals.impressions,
            clicks: data.comparison.totals.clicks,
            spend: data.comparison.totals.spend,
            conversions: data.comparison.totals.conversions,
          } : undefined}
        />
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-red-800 font-medium">Error loading data</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Spend"
          value={data?.totals.spend ?? 0}
          prefix="$"
          change={compareEnabled && periodChanges?.spend !== null ? periodChanges?.spend : undefined}
          changeLabel="vs previous period"
          previousValue={data?.comparison?.totals?.spend}
          showPrevious={compareEnabled && !!data?.comparison}
          icon={<DollarSign size={20} />}
          loading={loading}
        />
        <MetricCard
          title="Impressions"
          value={data?.totals.impressions ?? 0}
          change={compareEnabled && periodChanges?.impressions !== null ? periodChanges?.impressions : undefined}
          changeLabel="vs previous period"
          previousValue={data?.comparison?.totals?.impressions}
          showPrevious={compareEnabled && !!data?.comparison}
          icon={<Eye size={20} />}
          loading={loading}
        />
        <MetricCard
          title="Clicks"
          value={data?.totals.clicks ?? 0}
          change={compareEnabled && periodChanges?.clicks !== null ? periodChanges?.clicks : undefined}
          changeLabel="vs previous period"
          previousValue={data?.comparison?.totals?.clicks}
          showPrevious={compareEnabled && !!data?.comparison}
          icon={<MousePointerClick size={20} />}
          loading={loading}
        />
        <MetricCard
          title="Conversions"
          value={data?.totals.conversions ?? 0}
          change={compareEnabled && periodChanges?.conversions !== null ? periodChanges?.conversions : undefined}
          changeLabel="vs previous period"
          previousValue={data?.comparison?.totals?.conversions}
          showPrevious={compareEnabled && !!data?.comparison}
          icon={<Target size={20} />}
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      {!error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Time Series Chart */}
          <div className="lg:col-span-2">
            {hasData ? (
              <PerformanceChart
                data={data.timeSeries}
                lines={[
                  { key: 'spend', name: 'Spend ($)', color: '#6366f1' },
                  { key: 'clicks', name: 'Clicks', color: '#10b981' },
                ]}
                title="Performance Over Time"
                loading={loading}
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Performance Over Time</h3>
                <div className="h-[350px] flex items-center justify-center">
                  {loading ? (
                    <div className="animate-pulse text-slate-400">Loading chart data...</div>
                  ) : (
                    <div className="text-center">
                      <div className="text-slate-400 mb-2">
                        <Eye size={48} className="mx-auto opacity-30" />
                      </div>
                      <p className="text-slate-500">No performance data available</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Run your data pipelines to populate this chart
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Channel Breakdown */}
          <div>
            {hasData && data.channels.length > 0 ? (
              <ChannelBreakdown
                data={data.channels.map(c => ({
                  ...c,
                  color: c.channel === 'meta' ? '#1877F2' : c.channel === 'google_ads' ? '#EA4335' : '#6366f1'
                }))}
                title="Spend by Channel"
                metric="spend"
                loading={loading}
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Spend by Channel</h3>
                <div className="h-[200px] flex items-center justify-center">
                  {loading ? (
                    <div className="animate-pulse text-slate-400">Loading...</div>
                  ) : (
                    <div className="text-center">
                      <p className="text-slate-500 text-sm">No channel data</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Metrics Row */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CTR Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Click-Through Rate</h3>
            <div className="flex items-end gap-4">
              <div>
                <p className="text-4xl font-bold text-indigo-600">
                  {data.totals.ctr.toFixed(2)}%
                </p>
                <p className="text-sm text-slate-500 mt-1">Average CTR across all channels</p>
              </div>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(data.totals.ctr * 10, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* CPA Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Cost Per Acquisition</h3>
            <div className="flex items-end gap-4">
              <div>
                <p className="text-4xl font-bold text-emerald-600">
                  ${data.totals.cpa.toFixed(2)}
                </p>
                <p className="text-sm text-slate-500 mt-1">Average cost per conversion</p>
              </div>
              {data.channels.length > 0 && (
                <div className="flex-1">
                  <div className="flex gap-2">
                    {data.channels.map(channel => (
                      <div 
                        key={channel.channel}
                        className="flex-1 text-center"
                      >
                        <p className="text-xs text-slate-400 mb-1">
                          {channel.channel === 'meta' ? 'Meta' : 
                           channel.channel === 'google_ads' ? 'Google' : 
                           channel.channel}
                        </p>
                        <p className="text-sm font-medium text-slate-700">
                          ${channel.cpa.toFixed(0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Goal Tracking */}
      {currentProperty?.id && data && (
        <GoalTracker
          propertyId={currentProperty.id}
          currentMetrics={{
            spend: data.totals.spend,
            impressions: data.totals.impressions,
            clicks: data.totals.clicks,
            conversions: data.totals.conversions,
            ctr: data.totals.ctr,
            cpa: data.totals.cpa,
          }}
        />
      )}

      {/* Campaign Drill-Down Section */}
      {hasData && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowCampaigns(!showCampaigns)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Table size={20} className="text-indigo-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-slate-900">Campaign Breakdown</h3>
                <p className="text-sm text-slate-500">
                  {campaignsData?.totals.campaigns ?? '—'} campaigns • Click to {showCampaigns ? 'collapse' : 'expand'}
                </p>
              </div>
            </div>
            {showCampaigns ? (
              <ChevronUp size={20} className="text-slate-400" />
            ) : (
              <ChevronDown size={20} className="text-slate-400" />
            )}
          </button>
          
          {showCampaigns && (
            <div className="border-t border-slate-200">
              <CampaignTable
                campaigns={campaignsData?.campaigns ?? []}
                channels={campaignsData?.channels ?? []}
                loading={campaignsLoading}
                onSelectCampaign={(campaign) => setSelectedCampaign(campaign)}
              />
            </div>
          )}
        </div>
      )}

      {/* Campaign Detail Drawer */}
      {selectedCampaign && currentProperty && (
        <CampaignDetailDrawer
          campaign={selectedCampaign}
          propertyId={currentProperty.id}
          startDate={format(dateRange.start, 'yyyy-MM-dd')}
          endDate={format(dateRange.end, 'yyyy-MM-dd')}
          onClose={() => setSelectedCampaign(null)}
        />
      )}

      {/* Natural Language Query */}
      <div className="mt-6">
        <NaturalLanguageQuery 
          propertyId={currentProperty?.id || ''} 
        />
      </div>

      {/* Empty State */}
      {!loading && !error && !hasData && (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="h-16 w-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Eye size={32} className="text-indigo-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No Marketing Data Yet
            </h3>
            <p className="text-slate-500 mb-6">
              Your MultiChannel BI dashboard will come alive once you import data or connect your ad platforms.
            </p>
            <div className="bg-white rounded-lg p-4 text-left text-sm border border-slate-200 mb-4">
              <p className="font-medium text-slate-700 mb-2">Quick Start:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Click the <strong>Import</strong> button above</li>
                <li>Upload a CSV export from Google Ads or Meta</li>
                <li>Review and confirm the import</li>
              </ol>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <Upload size={16} />
              Import Marketing Data
            </button>
          </div>
        </div>
      )}

      {/* Schedule Report Modal */}
      <ScheduleReportModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        propertyId={currentProperty?.id}
        propertyName={currentProperty?.name}
      />

      {/* CSV Upload Modal */}
      {currentProperty?.id && (
        <CSVUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          propertyId={currentProperty.id}
          propertyName={currentProperty.name}
          onSuccess={() => {
            // Refresh data after successful import
            fetchData()
          }}
        />
      )}
    </div>
  )
}

