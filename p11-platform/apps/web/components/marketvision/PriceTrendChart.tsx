'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { TrendingUp, RefreshCw, Calendar } from 'lucide-react'

interface PriceTrend {
  date: string
  avgRent: number
  minRent: number
  maxRent: number
  dataPoints: number
}

interface PriceTrendChartProps {
  propertyId: string | undefined
  unitTypeFilter?: string
}

export function PriceTrendChart({ propertyId, unitTypeFilter }: PriceTrendChartProps) {
  const [trends, setTrends] = useState<PriceTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    if (propertyId) {
      fetchTrends()
    }
  }, [propertyId, unitTypeFilter, days])

  const fetchTrends = async () => {
    if (!propertyId) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        propertyId,
        type: 'trends',
        days: days.toString()
      })
      if (unitTypeFilter && unitTypeFilter !== 'all') {
        params.set('unitType', unitTypeFilter)
      }

      const res = await fetch(`/api/marketvision/analysis?${params}`)
      const data = await res.json()

      if (res.ok) {
        setTrends(data.trends || [])
      }
    } catch (err) {
      console.error('Error fetching trends:', err)
    } finally {
      setLoading(false)
    }
  }

  // Format data for chart
  const chartData = trends.map(t => ({
    ...t,
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }))

  // Calculate trend direction
  const getTrendDirection = () => {
    if (trends.length < 2) return null
    const first = trends[0].avgRent
    const last = trends[trends.length - 1].avgRent
    const change = ((last - first) / first) * 100
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      percent: Math.abs(change).toFixed(1)
    }
  }

  const trend = getTrendDirection()

  if (!propertyId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Select a property to view price trends</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Price Trends
          </h3>
          {trend && (
            <p className={`text-sm mt-1 ${
              trend.direction === 'up' ? 'text-red-500' : 
              trend.direction === 'down' ? 'text-green-500' : 
              'text-gray-500'
            }`}>
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} 
              {' '}{trend.percent}% over period
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={fetchTrends}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-72 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-72 flex items-center justify-center">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No historical price data available</p>
            <p className="text-sm text-gray-400 mt-1">
              Price history will appear as you track competitors
            </p>
          </div>
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                domain={['dataMin - 50', 'dataMax + 50']}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString()}`,
                  name === 'avgRent' ? 'Average' : name === 'minRent' ? 'Minimum' : 'Maximum'
                ]}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend 
                formatter={(value) => 
                  value === 'avgRent' ? 'Avg Rent' : 
                  value === 'minRent' ? 'Min' : 'Max'
                }
              />
              <Area
                type="monotone"
                dataKey="avgRent"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#avgGradient)"
              />
              <Line
                type="monotone"
                dataKey="minRent"
                stroke="#22c55e"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="maxRent"
                stroke="#f43f5e"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Based on {chartData.reduce((sum, d) => sum + d.dataPoints, 0)} data points
            </span>
            {unitTypeFilter && unitTypeFilter !== 'all' && (
              <span className="text-gray-400">
                Filtered by {unitTypeFilter}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

