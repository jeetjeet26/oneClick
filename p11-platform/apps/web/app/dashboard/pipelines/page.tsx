'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePropertyContext } from '@/components/layout/PropertyContext'
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Play,
  Calendar,
  Database,
  TrendingUp,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { format, formatDistanceToNow, subDays } from 'date-fns'

type PipelineStatus = 'success' | 'failed' | 'running' | 'pending' | 'never_run'

type PipelineRun = {
  id: string
  pipeline: string
  status: PipelineStatus
  started_at: string
  completed_at?: string
  records_processed: number
  error_message?: string
}

type PipelineConfig = {
  id: string
  name: string
  description: string
  schedule: string
  lastRun?: PipelineRun
  enabled: boolean
}

// Mock data for demonstration - in production this would come from the database
const MOCK_PIPELINES: PipelineConfig[] = [
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    description: 'Facebook & Instagram advertising data',
    schedule: 'Daily at 6:00 AM UTC',
    enabled: true,
    lastRun: {
      id: '1',
      pipeline: 'meta_ads',
      status: 'success',
      started_at: subDays(new Date(), 0).toISOString(),
      completed_at: subDays(new Date(), 0).toISOString(),
      records_processed: 1250,
    },
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Search and display advertising data',
    schedule: 'Daily at 6:00 AM UTC',
    enabled: true,
    lastRun: {
      id: '2',
      pipeline: 'google_ads',
      status: 'success',
      started_at: subDays(new Date(), 0).toISOString(),
      completed_at: subDays(new Date(), 0).toISOString(),
      records_processed: 890,
    },
  },
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    description: 'Website analytics and user behavior',
    schedule: 'Daily at 6:00 AM UTC',
    enabled: false,
    lastRun: {
      id: '3',
      pipeline: 'ga4',
      status: 'never_run',
      started_at: '',
      records_processed: 0,
    },
  },
]

const MOCK_RUNS: PipelineRun[] = [
  {
    id: '1',
    pipeline: 'meta_ads',
    status: 'success',
    started_at: subDays(new Date(), 0).setHours(6, 0, 0, 0).toString(),
    completed_at: subDays(new Date(), 0).setHours(6, 2, 35, 0).toString(),
    records_processed: 1250,
  },
  {
    id: '2',
    pipeline: 'google_ads',
    status: 'success',
    started_at: subDays(new Date(), 0).setHours(6, 0, 0, 0).toString(),
    completed_at: subDays(new Date(), 0).setHours(6, 1, 48, 0).toString(),
    records_processed: 890,
  },
  {
    id: '3',
    pipeline: 'meta_ads',
    status: 'success',
    started_at: subDays(new Date(), 1).setHours(6, 0, 0, 0).toString(),
    completed_at: subDays(new Date(), 1).setHours(6, 2, 12, 0).toString(),
    records_processed: 1180,
  },
  {
    id: '4',
    pipeline: 'google_ads',
    status: 'failed',
    started_at: subDays(new Date(), 1).setHours(6, 0, 0, 0).toString(),
    completed_at: subDays(new Date(), 1).setHours(6, 0, 45, 0).toString(),
    records_processed: 0,
    error_message: 'Authentication token expired',
  },
  {
    id: '5',
    pipeline: 'meta_ads',
    status: 'success',
    started_at: subDays(new Date(), 2).setHours(6, 0, 0, 0).toString(),
    completed_at: subDays(new Date(), 2).setHours(6, 2, 8, 0).toString(),
    records_processed: 1320,
  },
]

const STATUS_CONFIG = {
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    label: 'Success',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Failed',
  },
  running: {
    icon: Loader2,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'Running',
  },
  pending: {
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'Pending',
  },
  never_run: {
    icon: AlertTriangle,
    color: 'text-slate-400',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    label: 'Never Run',
  },
}

function StatusBadge({ status }: { status: PipelineStatus }) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.border} border`}>
      <Icon size={14} className={`${config.color} ${status === 'running' ? 'animate-spin' : ''}`} />
      <span className={config.color}>{config.label}</span>
    </span>
  )
}

export default function PipelinesPage() {
  const { currentProperty } = usePropertyContext()
  const [pipelines, setPipelines] = useState<PipelineConfig[]>(MOCK_PIPELINES)
  const [runs, setRuns] = useState<PipelineRun[]>(MOCK_RUNS)
  const [loading, setLoading] = useState(false)
  const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null)
  const [triggeringPipeline, setTriggeringPipeline] = useState<string | null>(null)

  // Calculate overall stats
  const stats = {
    total: runs.length,
    successful: runs.filter(r => r.status === 'success').length,
    failed: runs.filter(r => r.status === 'failed').length,
    totalRecords: runs.reduce((sum, r) => sum + r.records_processed, 0),
  }

  const successRate = stats.total > 0 ? (stats.successful / stats.total) * 100 : 0

  const handleTriggerPipeline = async (pipelineId: string) => {
    setTriggeringPipeline(pipelineId)
    
    // Simulate triggering - in production this would call the pipeline API
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Update pipeline status
    setPipelines(prev => prev.map(p => 
      p.id === pipelineId 
        ? { 
            ...p, 
            lastRun: {
              id: Date.now().toString(),
              pipeline: pipelineId,
              status: 'running' as PipelineStatus,
              started_at: new Date().toISOString(),
              records_processed: 0,
            }
          }
        : p
    ))
    
    setTriggeringPipeline(null)
    
    // Simulate completion after 3 seconds
    setTimeout(() => {
      setPipelines(prev => prev.map(p => 
        p.id === pipelineId && p.lastRun?.status === 'running'
          ? { 
              ...p, 
              lastRun: {
                ...p.lastRun,
                status: 'success' as PipelineStatus,
                completed_at: new Date().toISOString(),
                records_processed: Math.floor(Math.random() * 1000) + 500,
              }
            }
          : p
      ))
    }, 3000)
  }

  const refreshData = useCallback(() => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => setLoading(false), 500)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="text-indigo-500" size={28} />
            Pipeline Monitor
          </h1>
          <p className="text-slate-500 mt-1">
            Track and manage your data ingestion pipelines
          </p>
        </div>
        <button
          onClick={refreshData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={`text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-slate-700 font-medium">Refresh</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Success Rate</span>
            <TrendingUp size={18} className="text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{successRate.toFixed(0)}%</p>
          <p className="text-xs text-slate-400 mt-1">Last 7 days</p>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Total Runs</span>
            <Activity size={18} className="text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-400 mt-1">Last 7 days</p>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Records Processed</span>
            <Database size={18} className="text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.totalRecords.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Last 7 days</p>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Failed Runs</span>
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.failed}</p>
          <p className="text-xs text-slate-400 mt-1">Needs attention</p>
        </div>
      </div>

      {/* Pipelines List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-900">Data Pipelines</h2>
        </div>
        
        <div className="divide-y divide-slate-100">
          {pipelines.map(pipeline => {
            const isExpanded = expandedPipeline === pipeline.id
            const pipelineRuns = runs.filter(r => r.pipeline === pipeline.id)
            
            return (
              <div key={pipeline.id} className="group">
                <div className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        pipeline.enabled ? 'bg-indigo-100' : 'bg-slate-100'
                      }`}>
                        <Database size={20} className={pipeline.enabled ? 'text-indigo-600' : 'text-slate-400'} />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 flex items-center gap-2">
                          {pipeline.name}
                          {!pipeline.enabled && (
                            <span className="text-xs text-slate-400 font-normal">(Disabled)</span>
                          )}
                        </h3>
                        <p className="text-sm text-slate-500">{pipeline.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {pipeline.lastRun && (
                        <StatusBadge status={pipeline.lastRun.status} />
                      )}
                      
                      <div className="text-right hidden sm:block">
                        <p className="text-sm text-slate-600">
                          {pipeline.lastRun?.started_at && pipeline.lastRun.status !== 'never_run'
                            ? formatDistanceToNow(new Date(pipeline.lastRun.started_at), { addSuffix: true })
                            : 'Never run'
                          }
                        </p>
                        <p className="text-xs text-slate-400">{pipeline.schedule}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTriggerPipeline(pipeline.id)}
                          disabled={!pipeline.enabled || triggeringPipeline === pipeline.id || pipeline.lastRun?.status === 'running'}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Trigger pipeline manually"
                        >
                          {triggeringPipeline === pipeline.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Play size={18} />
                          )}
                        </button>
                        
                        <button
                          onClick={() => setExpandedPipeline(isExpanded ? null : pipeline.id)}
                          className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Run History */}
                {isExpanded && (
                  <div className="px-6 pb-4 bg-slate-50">
                    <div className="ml-14 mt-2">
                      <h4 className="text-sm font-medium text-slate-600 mb-3">Recent Runs</h4>
                      {pipelineRuns.length > 0 ? (
                        <div className="space-y-2">
                          {pipelineRuns.slice(0, 5).map(run => (
                            <div 
                              key={run.id}
                              className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-slate-200"
                            >
                              <div className="flex items-center gap-3">
                                <StatusBadge status={run.status} />
                                <span className="text-sm text-slate-600">
                                  {run.started_at && format(new Date(Number(run.started_at) || run.started_at), 'MMM d, yyyy h:mm a')}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                {run.records_processed > 0 && (
                                  <span className="text-slate-500">
                                    {run.records_processed.toLocaleString()} records
                                  </span>
                                )}
                                {run.error_message && (
                                  <span className="text-red-500 text-xs max-w-xs truncate" title={run.error_message}>
                                    {run.error_message}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No runs recorded yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Pipeline Configuration</h3>
        <p className="text-indigo-100 text-sm mb-4">
          Configure your ad platform credentials in <code className="bg-white/20 px-1.5 py-0.5 rounded text-xs">.env.local</code> to enable automated data collection.
        </p>
        <div className="flex flex-wrap gap-3">
          <a 
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            Connect Integrations →
          </a>
          <a
            href="https://github.com/your-repo/docs/pipelines"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
          >
            View Documentation
          </a>
        </div>
      </div>
    </div>
  )
}


















