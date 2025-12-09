'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { Building2, RefreshCw, Filter } from 'lucide-react'

interface CompetitorComparison {
  competitor: {
    id: string
    name: string
    address: string | null
  }
  avgRent: number
  avgPricePerSqft: number | null
  units: {
    unitType: string
    bedrooms: number
    rentMin: number | null
    rentMax: number | null
  }[]
}

interface RentComparisonChartProps {
  propertyId: string | undefined
  ourPropertyName?: string
  ourRent?: number
}

const COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // purple  
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
]

export function RentComparisonChart({ 
  propertyId, 
  ourPropertyName = 'Your Property',
  ourRent 
}: RentComparisonChartProps) {
  const [data, setData] = useState<CompetitorComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [unitTypeFilter, setUnitTypeFilter] = useState<string>('all')
  const [availableUnitTypes, setAvailableUnitTypes] = useState<string[]>([])

  useEffect(() => {
    if (propertyId) {
      fetchComparisonData()
    }
  }, [propertyId, unitTypeFilter])

  const fetchComparisonData = async () => {
    if (!propertyId) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        propertyId,
        type: 'comparison'
      })
      if (unitTypeFilter !== 'all') {
        params.set('unitType', unitTypeFilter)
      }

      const res = await fetch(`/api/marketvision/analysis?${params}`)
      const result = await res.json()

      if (res.ok) {
        setData(result.comparisons || [])
        
        // Extract unique unit types for filter
        if (unitTypeFilter === 'all' && result.comparisons?.length > 0) {
          const types = new Set<string>()
          result.comparisons.forEach((comp: CompetitorComparison) => {
            comp.units.forEach(u => types.add(u.unitType))
          })
          setAvailableUnitTypes(Array.from(types).sort())
        }
      }
    } catch (err) {
      console.error('Error fetching comparison data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Transform data for chart
  const chartData = data
    .filter(d => d.avgRent > 0)
    .map((comp, index) => ({
      name: comp.competitor.name.length > 20 
        ? comp.competitor.name.substring(0, 18) + '...' 
        : comp.competitor.name,
      fullName: comp.competitor.name,
      avgRent: comp.avgRent,
      pricePerSqft: comp.avgPricePerSqft,
      color: COLORS[index % COLORS.length]
    }))
    .sort((a, b) => a.avgRent - b.avgRent)

  // Add our property if we have rent data
  if (ourRent) {
    const ourIndex = chartData.findIndex(d => d.avgRent > ourRent)
    chartData.splice(ourIndex === -1 ? chartData.length : ourIndex, 0, {
      name: ourPropertyName.length > 20 ? ourPropertyName.substring(0, 18) + '...' : ourPropertyName,
      fullName: ourPropertyName,
      avgRent: ourRent,
      pricePerSqft: null,
      color: '#10b981' // green for our property
    })
  }

  if (!propertyId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Select a property to view rent comparison</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Rent Comparison
        </h3>
        <div className="flex items-center gap-3">
          {availableUnitTypes.length > 0 && (
            <select
              value={unitTypeFilter}
              onChange={(e) => setUnitTypeFilter(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700"
            >
              <option value="all">All Unit Types</option>
              {availableUnitTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          )}
          <button
            onClick={fetchComparisonData}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No competitor pricing data available</p>
          </div>
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                type="number" 
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                domain={['dataMin - 100', 'dataMax + 100']}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={150}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Avg Rent']}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.name === label)
                  return item?.fullName || label
                }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey="avgRent" 
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fullName === ourPropertyName ? '#10b981' : entry.color}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      {chartData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-gray-600 dark:text-gray-400">Your Property</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-indigo-500" />
              <span className="text-gray-600 dark:text-gray-400">Competitors</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {unitTypeFilter === 'all' ? 'Showing average rent across all unit types' : `Filtered by ${unitTypeFilter}`}
          </p>
        </div>
      )}
    </div>
  )
}

