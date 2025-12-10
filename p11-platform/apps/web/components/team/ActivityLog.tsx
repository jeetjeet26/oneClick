'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Activity,
  Plus, 
  Pencil, 
  Trash2, 
  LogIn, 
  LogOut, 
  Download, 
  UserPlus, 
  Shield, 
  Eye, 
  Upload, 
  MessageSquare, 
  Calendar, 
  CalendarX, 
  UserCheck, 
  Settings,
  Loader2,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Search
} from 'lucide-react'

type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout' 
  | 'export' 
  | 'invite' 
  | 'role_change'
  | 'view'
  | 'upload'
  | 'download'
  | 'send_message'
  | 'schedule_tour'
  | 'cancel_tour'
  | 'takeover'
  | 'settings_change'

type EntityType = 
  | 'lead'
  | 'property'
  | 'document'
  | 'user'
  | 'team_member'
  | 'conversation'
  | 'tour'
  | 'report'
  | 'workflow'
  | 'settings'
  | 'organization'
  | 'goal'

type AuditLog = {
  id: string
  org_id: string
  user_id: string | null
  action: AuditAction
  entity_type: EntityType
  entity_id: string | null
  entity_name: string | null
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user?: {
    full_name: string | null
  }
}

const ACTION_ICONS: Record<AuditAction, typeof Activity> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  login: LogIn,
  logout: LogOut,
  export: Download,
  invite: UserPlus,
  role_change: Shield,
  view: Eye,
  upload: Upload,
  download: Download,
  send_message: MessageSquare,
  schedule_tour: Calendar,
  cancel_tour: CalendarX,
  takeover: UserCheck,
  settings_change: Settings
}

const ACTION_COLORS: Record<AuditAction, string> = {
  create: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  update: 'text-blue-600 bg-blue-50 border-blue-200',
  delete: 'text-red-600 bg-red-50 border-red-200',
  login: 'text-green-600 bg-green-50 border-green-200',
  logout: 'text-slate-500 bg-slate-50 border-slate-200',
  export: 'text-purple-600 bg-purple-50 border-purple-200',
  invite: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  role_change: 'text-amber-600 bg-amber-50 border-amber-200',
  view: 'text-slate-500 bg-slate-50 border-slate-200',
  upload: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  download: 'text-purple-600 bg-purple-50 border-purple-200',
  send_message: 'text-blue-600 bg-blue-50 border-blue-200',
  schedule_tour: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  cancel_tour: 'text-red-600 bg-red-50 border-red-200',
  takeover: 'text-amber-600 bg-amber-50 border-amber-200',
  settings_change: 'text-slate-600 bg-slate-50 border-slate-200'
}

const ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  login: 'Logged in',
  logout: 'Logged out',
  export: 'Exported',
  invite: 'Invited',
  role_change: 'Changed role',
  view: 'Viewed',
  upload: 'Uploaded',
  download: 'Downloaded',
  send_message: 'Sent message',
  schedule_tour: 'Scheduled tour',
  cancel_tour: 'Cancelled tour',
  takeover: 'Took over',
  settings_change: 'Changed settings'
}

const ENTITY_LABELS: Record<EntityType, string> = {
  lead: 'lead',
  property: 'property',
  document: 'document',
  user: 'user',
  team_member: 'team member',
  conversation: 'conversation',
  tour: 'tour',
  report: 'report',
  workflow: 'workflow',
  settings: 'settings',
  organization: 'organization',
  goal: 'goal'
}

function formatRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return then.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: now.getFullYear() !== then.getFullYear() ? 'numeric' : undefined
  })
}

function formatFullDate(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export function ActivityLog() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  
  // Filters
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('')
  const [entityFilter, setEntityFilter] = useState<EntityType | ''>('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const limit = 20

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit)
      })
      
      if (actionFilter) params.append('action', actionFilter)
      if (entityFilter) params.append('entity_type', entityFilter)
      if (searchQuery) params.append('search', searchQuery)
      
      const response = await fetch(`/api/audit?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch activity logs')
      }
      
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, entityFilter, searchQuery])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const clearFilters = () => {
    setActionFilter('')
    setEntityFilter('')
    setSearchQuery('')
    setPage(0)
  }

  const hasFilters = actionFilter || entityFilter || searchQuery
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Activity size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Activity Log</h2>
              <p className="text-sm text-slate-500">
                {total} total activities
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                hasFilters 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Filter size={14} />
              Filters
              {hasFilters && (
                <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                  {[actionFilter, entityFilter, searchQuery].filter(Boolean).length}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        
        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value as AuditAction | ''); setPage(0); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            >
              <option value="">All Actions</option>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value as EntityType | ''); setPage(0); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            >
              <option value="">All Types</option>
              {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>
              ))}
            </select>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="sm:col-span-3 flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
              >
                <X size={14} />
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="px-6 py-4 flex items-start gap-4 animate-pulse">
              <div className="h-9 w-9 bg-slate-200 rounded-lg flex-shrink-0"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-64 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Activity size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No activity logs found</p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Activity List */}
          <div className="divide-y divide-slate-100">
            {logs.map(log => {
              const Icon = ACTION_ICONS[log.action] || Activity
              const colorClass = ACTION_COLORS[log.action] || 'text-slate-600 bg-slate-50'
              const actionLabel = ACTION_LABELS[log.action] || log.action
              const entityLabel = ENTITY_LABELS[log.entity_type] || log.entity_type
              
              return (
                <div 
                  key={log.id}
                  className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors group"
                >
                  {/* Icon */}
                  <div className={`p-2 rounded-lg border flex-shrink-0 ${colorClass}`}>
                    <Icon size={18} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900">
                      <span className="font-medium">{log.user?.full_name || 'Unknown User'}</span>
                      {' '}
                      <span className="text-slate-600">{actionLabel.toLowerCase()}</span>
                      {' '}
                      {log.entity_name ? (
                        <>
                          <span className="text-slate-600">{entityLabel}</span>
                          {' '}
                          <span className="font-medium text-indigo-600">&quot;{log.entity_name}&quot;</span>
                        </>
                      ) : (
                        <span className="text-slate-600">{entityLabel}</span>
                      )}
                    </p>
                    
                    {/* Details */}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-1.5 text-xs text-slate-500 bg-slate-50 rounded px-2 py-1 inline-block">
                        {Object.entries(log.details).slice(0, 3).map(([key, value]) => (
                          <span key={key} className="mr-3">
                            <span className="text-slate-400">{key}:</span>{' '}
                            <span>{String(value)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Timestamp */}
                    <p className="text-xs text-slate-400 mt-1" title={formatFullDate(log.created_at)}>
                      {formatRelativeTime(log.created_at)}
                      {log.ip_address && (
                        <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          • {log.ip_address}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-slate-600 px-2">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}





