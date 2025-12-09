'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Calendar, 
  Clock, 
  Mail, 
  MoreVertical, 
  Trash2, 
  Pause, 
  Play,
  AlertCircle,
  Loader2,
  Check,
  X,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

type ScheduledReport = {
  id: string
  name: string
  property_id: string | null
  property: { id: string; name: string } | null
  schedule_type: 'daily' | 'weekly' | 'monthly'
  day_of_week: number | null
  day_of_month: number | null
  hour_utc: number
  recipients: string[]
  date_range_type: string
  is_active: boolean
  last_sent_at: string | null
  next_run_at: string | null
  created_at: string
  recent_history: Array<{
    id: string
    status: 'pending' | 'sent' | 'failed'
    created_at: string
    completed_at: string | null
    error_message: string | null
  }>
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatSchedule(report: ScheduledReport): string {
  const hour = report.hour_utc
  const timeStr = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:00 ${hour < 12 ? 'AM' : 'PM'} UTC`
  
  switch (report.schedule_type) {
    case 'daily':
      return `Daily at ${timeStr}`
    case 'weekly':
      return `Every ${DAYS_OF_WEEK[report.day_of_week || 0]} at ${timeStr}`
    case 'monthly':
      const day = report.day_of_month || 1
      const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'
      return `Monthly on the ${day}${suffix} at ${timeStr}`
    default:
      return timeStr
  }
}

export function ScheduledReportsList() {
  const [reports, setReports] = useState<ScheduledReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/reports/scheduled')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch scheduled reports')
      }
      
      setReports(data.reports || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const toggleActive = async (reportId: string, currentlyActive: boolean) => {
    setUpdating(reportId)
    setMenuOpen(null)
    
    try {
      const response = await fetch('/api/reports/scheduled', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, is_active: !currentlyActive }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update report')
      }
      
      fetchReports()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update report')
    } finally {
      setUpdating(null)
    }
  }

  const deleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) return
    
    setUpdating(reportId)
    setMenuOpen(null)
    
    try {
      const response = await fetch(`/api/reports/scheduled?id=${reportId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete report')
      }
      
      fetchReports()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete report')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="animate-pulse border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-red-700 dark:text-red-400 font-medium">Error loading reports</p>
          <p className="text-sm text-red-600 dark:text-red-500 mt-1">{error}</p>
        </div>
        <button
          onClick={fetchReports}
          className="text-red-600 hover:text-red-700 p-1"
        >
          <RefreshCw size={18} />
        </button>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
        <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">No scheduled reports</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
          Go to the BI Dashboard to schedule your first automated report
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map(report => {
        const isUpdating = updating === report.id
        const lastHistory = report.recent_history?.[0]
        
        return (
          <div 
            key={report.id}
            className={`border rounded-lg transition-colors ${
              report.is_active 
                ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800' 
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  report.is_active 
                    ? 'bg-indigo-100 dark:bg-indigo-900/30' 
                    : 'bg-slate-100 dark:bg-slate-700'
                }`}>
                  <Calendar size={20} className={
                    report.is_active 
                      ? 'text-indigo-600 dark:text-indigo-400' 
                      : 'text-slate-400 dark:text-slate-500'
                  } />
                </div>
                
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium truncate ${
                      report.is_active 
                        ? 'text-slate-900 dark:text-white' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {report.name}
                    </h4>
                    {!report.is_active && (
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs rounded-full">
                        Paused
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatSchedule(report)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail size={14} />
                      {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {report.property && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Property: {report.property.name}
                    </p>
                  )}
                  
                  {/* Next run / Last sent */}
                  <div className="flex flex-wrap gap-4 mt-2 text-xs">
                    {report.is_active && report.next_run_at && (
                      <span className="text-indigo-600 dark:text-indigo-400">
                        Next: {formatDistanceToNow(new Date(report.next_run_at), { addSuffix: true })}
                      </span>
                    )}
                    {report.last_sent_at && (
                      <span className="text-slate-400 dark:text-slate-500">
                        Last sent: {format(new Date(report.last_sent_at), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Actions Menu */}
                <div className="relative flex-shrink-0">
                  {isUpdating ? (
                    <Loader2 size={18} className="animate-spin text-slate-400" />
                  ) : (
                    <button
                      onClick={() => setMenuOpen(menuOpen === report.id ? null : report.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>
                  )}
                  
                  {menuOpen === report.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setMenuOpen(null)}
                      />
                      <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                        <button
                          onClick={() => toggleActive(report.id, report.is_active)}
                          className="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          {report.is_active ? (
                            <>
                              <Pause size={14} />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play size={14} />
                              Resume
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* History Toggle */}
              {report.recent_history && report.recent_history.length > 0 && (
                <button
                  onClick={() => setExpandedHistory(expandedHistory === report.id ? null : report.id)}
                  className="flex items-center gap-1 mt-3 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  {expandedHistory === report.id ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  Recent history ({report.recent_history.length})
                  {lastHistory && (
                    <span className={`ml-2 ${
                      lastHistory.status === 'sent' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : lastHistory.status === 'failed'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      • Last: {lastHistory.status}
                    </span>
                  )}
                </button>
              )}
            </div>
            
            {/* Expanded History */}
            {expandedHistory === report.id && report.recent_history.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                <div className="space-y-2">
                  {report.recent_history.map(history => (
                    <div 
                      key={history.id}
                      className="flex items-center gap-3 text-xs"
                    >
                      {history.status === 'sent' ? (
                        <Check size={14} className="text-emerald-500" />
                      ) : history.status === 'failed' ? (
                        <X size={14} className="text-red-500" />
                      ) : (
                        <Loader2 size={14} className="text-amber-500 animate-spin" />
                      )}
                      <span className="text-slate-500 dark:text-slate-400">
                        {format(new Date(history.created_at), 'MMM d, h:mm a')}
                      </span>
                      <span className={`font-medium ${
                        history.status === 'sent' 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : history.status === 'failed'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {history.status}
                      </span>
                      {history.error_message && (
                        <span className="text-red-500 dark:text-red-400 truncate max-w-[200px]" title={history.error_message}>
                          {history.error_message}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

