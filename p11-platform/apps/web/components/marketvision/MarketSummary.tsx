'use client'

import { useState, useEffect } from 'react'
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  DollarSign,
  Bell,
  Home,
  RefreshCw
} from 'lucide-react'

interface MarketSummaryData {
  competitorCount: number
  avgRentByBedroom: Record<string, { min: number; max: number; avg: number }>
  totalUnitsTracked: number
  recentPriceChanges: number
  marketTrend: 'rising' | 'falling' | 'stable'
  lastUpdated: string
}

interface MarketSummaryProps {
  propertyId: string | undefined
  onRefresh?: () => void
}

export function MarketSummary({ propertyId, onRefresh }: MarketSummaryProps) {
  const [summary, setSummary] = useState<MarketSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (propertyId) {
      fetchSummary()
    }
  }, [propertyId])

  const fetchSummary = async () => {
    if (!propertyId) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/marketvision/analysis?propertyId=${propertyId}&type=summary`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setSummary(data.summary)
    } catch (err) {
      console.error('Error fetching market summary:', err)
      setError('Failed to load market summary')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchSummary()
    onRefresh?.()
  }

  if (!propertyId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-500 text-center">Select a property to view market data</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  const trendConfig = {
    rising: { icon: TrendingUp, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Rising' },
    falling: { icon: TrendingDown, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', label: 'Falling' },
    stable: { icon: Minus, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20', label: 'Stable' }
  }

  const trend = summary?.marketTrend ? trendConfig[summary.marketTrend] : trendConfig.stable
  const TrendIcon = trend.icon

  // Get primary bedroom types for display
  const bedroomTypes = summary?.avgRentByBedroom 
    ? Object.entries(summary.avgRentByBedroom).slice(0, 3)
    : []

  return (
    <div className="space-y-4">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Competitors Tracked */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Competitors
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {summary?.competitorCount || 0}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
              <Building2 className="w-6 h-6 text-indigo-500" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Active properties being tracked
          </p>
        </div>

        {/* Units Tracked */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Units Tracked
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {summary?.totalUnitsTracked || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
              <Home className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Floor plans across all competitors
          </p>
        </div>

        {/* Market Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Market Trend
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1 capitalize">
                {trend.label}
              </p>
            </div>
            <div className={`p-3 ${trend.bg} rounded-xl`}>
              <TrendIcon className={`w-6 h-6 ${trend.color}`} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Based on recent price changes
          </p>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Price Changes
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {summary?.recentPriceChanges || 0}
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
              <Bell className="w-6 h-6 text-amber-500" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Changes in the last 7 days
          </p>
        </div>
      </div>

      {/* Average Rent by Bedroom */}
      {bedroomTypes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Market Rent Averages
            </h3>
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bedroomTypes.map(([type, data]) => (
              <div 
                key={type}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
              >
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {type === '0BR' ? 'Studio' : type}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ${data.avg.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ${data.min.toLocaleString()} - ${data.max.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          {summary?.lastUpdated && (
            <p className="text-xs text-gray-400 mt-4">
              Last updated: {new Date(summary.lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

