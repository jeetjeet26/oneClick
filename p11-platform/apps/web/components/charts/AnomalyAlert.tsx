'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  X, 
  Zap,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

type Anomaly = {
  id: string
  metric: string
  type: 'spike' | 'drop' | 'unusual'
  severity: 'high' | 'medium' | 'low'
  value: number
  expectedValue: number
  deviation: number // percentage deviation
  date: string
  message: string
}

type AnomalyAlertProps = {
  propertyId: string
  currentMetrics: {
    date: string
    impressions: number
    clicks: number
    spend: number
    conversions: number
  }[]
  previousMetrics?: {
    impressions: number
    clicks: number
    spend: number
    conversions: number
  }
}

const METRIC_CONFIG: Record<string, { 
  label: string
  format: (v: number) => string
  threshold: number // percentage threshold for anomaly detection
}> = {
  spend: { 
    label: 'Ad Spend', 
    format: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    threshold: 50
  },
  impressions: { 
    label: 'Impressions', 
    format: (v) => v.toLocaleString('en-US'),
    threshold: 40
  },
  clicks: { 
    label: 'Clicks', 
    format: (v) => v.toLocaleString('en-US'),
    threshold: 40
  },
  conversions: { 
    label: 'Conversions', 
    format: (v) => v.toLocaleString('en-US'),
    threshold: 60
  },
}

function detectAnomalies(
  currentMetrics: AnomalyAlertProps['currentMetrics'],
  previousMetrics?: AnomalyAlertProps['previousMetrics']
): Anomaly[] {
  const anomalies: Anomaly[] = []
  
  if (!currentMetrics || currentMetrics.length === 0) return anomalies

  // Calculate current totals
  const currentTotals = currentMetrics.reduce((acc, day) => ({
    impressions: acc.impressions + day.impressions,
    clicks: acc.clicks + day.clicks,
    spend: acc.spend + day.spend,
    conversions: acc.conversions + day.conversions,
  }), { impressions: 0, clicks: 0, spend: 0, conversions: 0 })

  // Calculate daily averages for the current period
  const numDays = currentMetrics.length
  const dailyAverages = {
    impressions: currentTotals.impressions / numDays,
    clicks: currentTotals.clicks / numDays,
    spend: currentTotals.spend / numDays,
    conversions: currentTotals.conversions / numDays,
  }

  // Check for daily anomalies (days that deviate significantly from the average)
  currentMetrics.forEach((day, index) => {
    Object.entries(METRIC_CONFIG).forEach(([metricKey, config]) => {
      const dailyValue = day[metricKey as keyof typeof day] as number
      const avgValue = dailyAverages[metricKey as keyof typeof dailyAverages]
      
      if (avgValue > 0) {
        const deviation = ((dailyValue - avgValue) / avgValue) * 100
        
        if (Math.abs(deviation) >= config.threshold) {
          const isSpike = deviation > 0
          const severity: Anomaly['severity'] = 
            Math.abs(deviation) >= config.threshold * 2 ? 'high' :
            Math.abs(deviation) >= config.threshold * 1.5 ? 'medium' : 'low'

          anomalies.push({
            id: `${metricKey}-${index}`,
            metric: metricKey,
            type: isSpike ? 'spike' : 'drop',
            severity,
            value: dailyValue,
            expectedValue: avgValue,
            deviation,
            date: day.date,
            message: `${config.label} ${isSpike ? 'spiked' : 'dropped'} ${Math.abs(deviation).toFixed(0)}% ${isSpike ? 'above' : 'below'} average on ${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          })
        }
      }
    })
  })

  // Check period-over-period anomalies
  if (previousMetrics) {
    const periodDays = numDays
    
    Object.entries(METRIC_CONFIG).forEach(([metricKey, config]) => {
      const currentValue = currentTotals[metricKey as keyof typeof currentTotals]
      const previousValue = previousMetrics[metricKey as keyof typeof previousMetrics]
      
      if (previousValue > 0) {
        const deviation = ((currentValue - previousValue) / previousValue) * 100
        
        if (Math.abs(deviation) >= config.threshold) {
          const isSpike = deviation > 0
          const severity: Anomaly['severity'] = 
            Math.abs(deviation) >= config.threshold * 2 ? 'high' :
            Math.abs(deviation) >= config.threshold * 1.5 ? 'medium' : 'low'

          anomalies.push({
            id: `period-${metricKey}`,
            metric: metricKey,
            type: isSpike ? 'spike' : 'drop',
            severity,
            value: currentValue,
            expectedValue: previousValue,
            deviation,
            date: 'period',
            message: `${config.label} ${isSpike ? 'increased' : 'decreased'} ${Math.abs(deviation).toFixed(0)}% compared to previous period`
          })
        }
      }
    })
  }

  // Sort by severity and deviation
  return anomalies.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity]
    }
    return Math.abs(b.deviation) - Math.abs(a.deviation)
  }).slice(0, 5) // Limit to top 5 anomalies
}

function AnomalyCard({ anomaly, onDismiss }: { anomaly: Anomaly; onDismiss: () => void }) {
  const config = METRIC_CONFIG[anomaly.metric]
  if (!config) return null

  const getSeverityStyles = () => {
    switch (anomaly.severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'medium':
        return 'bg-amber-50 border-amber-200 text-amber-800'
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getIcon = () => {
    if (anomaly.type === 'spike') {
      return <TrendingUp size={16} className={anomaly.severity === 'high' ? 'text-red-500' : anomaly.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'} />
    }
    return <TrendingDown size={16} className={anomaly.severity === 'high' ? 'text-red-500' : anomaly.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'} />
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityStyles()}`}>
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{anomaly.message}</p>
        <div className="flex items-center gap-3 mt-1 text-xs opacity-80">
          <span>Current: {config.format(anomaly.value)}</span>
          <span>Expected: {config.format(anomaly.expectedValue)}</span>
        </div>
      </div>
      <button 
        onClick={onDismiss}
        className="flex-shrink-0 p-1 hover:bg-black/5 rounded transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function AnomalyAlert({ propertyId, currentMetrics, previousMetrics }: AnomalyAlertProps) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    const detected = detectAnomalies(currentMetrics, previousMetrics)
    setAnomalies(detected)
  }, [currentMetrics, previousMetrics])

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]))
  }

  const visibleAnomalies = anomalies.filter(a => !dismissedIds.has(a.id))
  
  if (visibleAnomalies.length === 0) return null

  const highSeverityCount = visibleAnomalies.filter(a => a.severity === 'high').length
  const mediumSeverityCount = visibleAnomalies.filter(a => a.severity === 'medium').length

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${highSeverityCount > 0 ? 'bg-red-100' : mediumSeverityCount > 0 ? 'bg-amber-100' : 'bg-blue-100'}`}>
            <AlertTriangle size={20} className={highSeverityCount > 0 ? 'text-red-600' : mediumSeverityCount > 0 ? 'text-amber-600' : 'text-blue-600'} />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              Performance Anomalies Detected
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                {visibleAnomalies.length}
              </span>
            </h3>
            <p className="text-sm text-slate-500">
              {highSeverityCount > 0 && (
                <span className="text-red-600 font-medium">{highSeverityCount} critical</span>
              )}
              {highSeverityCount > 0 && mediumSeverityCount > 0 && ' • '}
              {mediumSeverityCount > 0 && (
                <span className="text-amber-600 font-medium">{mediumSeverityCount} warnings</span>
              )}
              {(highSeverityCount > 0 || mediumSeverityCount > 0) && visibleAnomalies.length - highSeverityCount - mediumSeverityCount > 0 && ' • '}
              {visibleAnomalies.length - highSeverityCount - mediumSeverityCount > 0 && (
                <span className="text-blue-600">{visibleAnomalies.length - highSeverityCount - mediumSeverityCount} info</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <div className="pt-4 space-y-2">
            {visibleAnomalies.map(anomaly => (
              <AnomalyCard 
                key={anomaly.id} 
                anomaly={anomaly}
                onDismiss={() => handleDismiss(anomaly.id)}
              />
            ))}
          </div>
          
          {/* Info */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <p>
              Anomalies are detected when metrics deviate significantly from their expected values.
              High severity alerts indicate changes of 100%+ from baseline.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

