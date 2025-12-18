'use client'

import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface QueryTypePerformance {
  type: string
  label: string
  total: number
  withPresence: number
  visibilityPct: number
  avgRank: number | null
  trend: 'up' | 'down' | 'stable' | 'new'
  color: string
}

interface QueryTypeRingsProps {
  queries: Array<{
    type: string
    presence?: boolean
    llmRank?: number | null
  }>
}

export function QueryTypeRings({ queries }: QueryTypeRingsProps) {
  // Calculate performance by type
  const performanceByType = calculateTypePerformance(queries)

  if (performanceByType.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500 py-8">
        No query data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {performanceByType.map(perf => (
          <QueryTypeRing key={perf.type} performance={perf} />
        ))}
      </div>

      {/* Insights */}
      <div className="flex items-start gap-2 text-sm">
        <div className="flex-shrink-0 mt-0.5">
          {getBestPerformer(performanceByType) && (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          )}
        </div>
        <div className="text-gray-700 dark:text-gray-300">
          {generateTypeInsight(performanceByType)}
        </div>
      </div>
    </div>
  )
}

function QueryTypeRing({ performance }: { performance: QueryTypePerformance }) {
  const { label, visibilityPct, total, withPresence, avgRank, trend, color } = performance

  const strokeWidth = 8
  const size = 80
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (visibilityPct / 100) * circumference

  const TrendIcon = trend === 'up' ? TrendingUp 
    : trend === 'down' ? TrendingDown 
    : trend === 'new' ? AlertTriangle
    : Minus

  const trendColor = trend === 'up' ? 'text-green-500' 
    : trend === 'down' ? 'text-red-500'
    : trend === 'new' ? 'text-blue-500'
    : 'text-gray-400'

  const statusIcon = visibilityPct === 100 ? '✓' 
    : visibilityPct >= 70 ? '→'
    : '⚠️'

  return (
    <div className="flex flex-col items-center text-center">
      {/* Ring Chart */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg]"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-gray-200 dark:stroke-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {Math.round(visibilityPct)}%
          </span>
          <span className="text-[10px] text-gray-500">
            {withPresence}/{total}
          </span>
        </div>
      </div>

      {/* Label */}
      <div className="mt-2 space-y-1">
        <div className="font-medium text-sm text-gray-900 dark:text-white">
          {label}
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg">{statusIcon}</span>
          <TrendIcon className={`w-3 h-3 ${trendColor}`} />
        </div>
        {avgRank !== null && (
          <div className="text-xs text-gray-500">
            Avg Rank: {avgRank.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  )
}

function calculateTypePerformance(queries: QueryTypeRingsProps['queries']): QueryTypePerformance[] {
  const typeMap = new Map<string, {
    total: number
    withPresence: number
    ranks: number[]
  }>()

  // Aggregate by type
  queries.forEach(q => {
    if (!typeMap.has(q.type)) {
      typeMap.set(q.type, { total: 0, withPresence: 0, ranks: [] })
    }
    const data = typeMap.get(q.type)!
    data.total++
    if (q.presence) {
      data.withPresence++
      if (q.llmRank) {
        data.ranks.push(q.llmRank)
      }
    }
  })

  // Type metadata
  const typeConfig: Record<string, { label: string; color: string; order: number }> = {
    branded: { label: 'Branded', color: 'stroke-purple-500', order: 1 },
    category: { label: 'Category', color: 'stroke-blue-500', order: 2 },
    comparison: { label: 'Comparison', color: 'stroke-orange-500', order: 3 },
    local: { label: 'Local', color: 'stroke-green-500', order: 4 },
    faq: { label: 'FAQ', color: 'stroke-gray-500', order: 5 },
    voice_search: { label: 'Voice', color: 'stroke-indigo-500', order: 6 },
  }

  // Build performance array
  const performance: QueryTypePerformance[] = []
  typeMap.forEach((data, type) => {
    const config = typeConfig[type] || { label: type, color: 'stroke-gray-500', order: 99 }
    const visibilityPct = data.total > 0 ? (data.withPresence / data.total) * 100 : 0
    const avgRank = data.ranks.length > 0 
      ? data.ranks.reduce((a, b) => a + b, 0) / data.ranks.length
      : null

    // Determine trend (simplified - would need historical data)
    let trend: QueryTypePerformance['trend'] = 'stable'
    if (data.total === data.withPresence) trend = 'up'
    else if (visibilityPct < 50) trend = 'down'
    
    // Mark voice_search as new
    if (type === 'voice_search') trend = 'new'

    performance.push({
      type,
      label: config.label,
      total: data.total,
      withPresence: data.withPresence,
      visibilityPct,
      avgRank,
      trend,
      color: config.color,
    })
  })

  // Sort by config order
  return performance.sort((a, b) => {
    const aOrder = typeConfig[a.type]?.order || 99
    const bOrder = typeConfig[b.type]?.order || 99
    return aOrder - bOrder
  })
}

function getBestPerformer(performance: QueryTypePerformance[]): QueryTypePerformance | null {
  return performance.reduce((best, curr) => {
    if (!best || curr.visibilityPct > best.visibilityPct) return curr
    return best
  }, null as QueryTypePerformance | null)
}

function generateTypeInsight(performance: QueryTypePerformance[]): string {
  const sorted = [...performance].sort((a, b) => b.visibilityPct - a.visibilityPct)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]

  if (!best || !worst) return 'Run a GEO audit to see performance by query type.'

  if (best.visibilityPct === 100 && worst.visibilityPct === 100) {
    return `Perfect performance across all query types! You're ranking on every query.`
  }

  if (worst.visibilityPct < 70) {
    return `${worst.label} queries underperforming (${Math.round(worst.visibilityPct)}% visibility). Consider adding more specific ${worst.label.toLowerCase()} queries with amenity combinations.`
  }

  if (best.visibilityPct === 100) {
    return `${best.label} queries performing excellently (100% visibility). ${worst.label} queries at ${Math.round(worst.visibilityPct)}% - room for improvement.`
  }

  return `Solid performance overall. ${best.label} leading at ${Math.round(best.visibilityPct)}%, ${worst.label} at ${Math.round(worst.visibilityPct)}%.`
}
