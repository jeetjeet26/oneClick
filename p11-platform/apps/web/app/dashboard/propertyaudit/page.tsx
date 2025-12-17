'use client'

import { useState, useEffect } from 'react'
import { usePropertyContext } from '@/components/layout/PropertyContext'
import {
  TrendChart,
  DumbbellChart,
  ScoreRing,
  QueryTable,
  QueryFilters,
  CreateQueryModal,
  ExportMenu,
  RunDetails,
  RunStatusIndicator,
  CompetitorInsights,
  type QueryRow,
} from '@/components/propertyaudit'
import {
  Search,
  RefreshCw,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Eye,
  Plus,
  Sparkles,
  Globe,
} from 'lucide-react'

interface GeoScoreSummary {
  propertyId: string
  overallScore: number
  visibilityPct: number
  scoreBucket: 'excellent' | 'good' | 'fair' | 'poor'
  surfaces: {
    openai: SurfaceScore | null
    claude: SurfaceScore | null
  }
  breakdown: {
    position: number
    link: number
    sov: number
    accuracy: number
  }
  lastRunAt: string | null
  trend: {
    direction: 'up' | 'down' | 'stable'
    changePercent: number
  } | null
}

interface SurfaceScore {
  overallScore: number
  visibilityPct: number
  runId: string
  runAt: string
}

interface GeoRun {
  id: string
  surface: 'openai' | 'claude'
  status: 'queued' | 'running' | 'completed' | 'failed'
  queryCount: number
  startedAt: string
  score: {
    overallScore: number
    visibilityPct: number
  } | null
  diff: {
    scoreChange: number
    direction: 'up' | 'down' | 'stable'
  } | null
}

export default function PropertyAuditPage() {
  const { currentProperty } = usePropertyContext()
  const [score, setScore] = useState<GeoScoreSummary | null>(null)
  const [queries, setQueries] = useState<QueryRow[]>([])
  const [runs, setRuns] = useState<GeoRun[]>([])
  const [loading, setLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [isGeneratingQueries, setIsGeneratingQueries] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'queries' | 'insights' | 'history'>('overview')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  useEffect(() => {
    if (currentProperty?.id) {
      fetchData()
    }
  }, [currentProperty?.id])

  const fetchData = async () => {
    if (!currentProperty?.id) return

    setLoading(true)
    try {
      await Promise.all([
        fetchScore(),
        fetchQueries(),
        fetchRuns()
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchScore = async () => {
    const res = await fetch(`/api/propertyaudit/score?propertyId=${currentProperty?.id}`)
    const data = await res.json()
    if (res.ok && data.score) {
      setScore(data.score)
    }
  }

  const fetchQueries = async () => {
    const res = await fetch(`/api/propertyaudit/queries?propertyId=${currentProperty?.id}`)
    const data = await res.json()
    if (res.ok) {
      setQueries(data.queries || [])
    }
  }

  const fetchRuns = async () => {
    const res = await fetch(`/api/propertyaudit/runs?propertyId=${currentProperty?.id}`)
    const data = await res.json()
    if (res.ok) {
      setRuns(data.runs || [])
    }
  }

  const generateQueryPanel = async () => {
    if (!currentProperty?.id) return

    setIsGeneratingQueries(true)
    try {
      const res = await fetch('/api/propertyaudit/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: currentProperty.id,
          generateFromProperty: true
        })
      })

      if (res.ok) {
        await fetchQueries()
      }
    } catch (err) {
      console.error('Error generating queries:', err)
    } finally {
      setIsGeneratingQueries(false)
    }
  }

  const runAudit = async () => {
    if (!currentProperty?.id) return

    setIsRunning(true)
    try {
      const res = await fetch('/api/propertyaudit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: currentProperty.id,
          surfaces: ['openai', 'claude']
        })
      })

      if (res.ok) {
        await fetchRuns()
      }
    } catch (err) {
      console.error('Error running audit:', err)
    } finally {
      setIsRunning(false)
    }
  }

  const handleCreateQuery = async (queryData: {
    text: string
    type: 'branded' | 'category' | 'comparison' | 'local' | 'faq'
    weight: number
    geo?: string
  }) => {
    const res = await fetch('/api/propertyaudit/queries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: currentProperty?.id,
        query: queryData
      })
    })

    if (res.ok) {
      await fetchQueries()
    }
  }

  const handleDeleteQuery = async (id: string) => {
    if (!confirm('Delete this query?')) return

    const res = await fetch(`/api/propertyaudit/queries/${id}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      await fetchQueries()
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/propertyaudit/queries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive })
    })

    if (res.ok) {
      await fetchQueries()
    }
  }

  const handleBulkDelete = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} queries?`)) return

    await Promise.all(
      ids.map(id => fetch(`/api/propertyaudit/queries/${id}`, { method: 'DELETE' }))
    )
    await fetchQueries()
  }

  const getScoreColor = (bucket: string) => {
    switch (bucket) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'fair': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'stable' }) => {
    if (direction === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />
    if (direction === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-gray-400" />
  }

  // Build trend data for chart
  const trendData = runs
    .filter(r => r.status === 'completed' && r.score)
    .slice(0, 10)
    .reverse()
    .map(r => ({
      date: r.startedAt,
      score: r.score!.overallScore,
      visibility: r.score!.visibilityPct
    }))

  // Build comparison data for dumbbell
  const comparisonData = queries
    .filter(q => q.score !== undefined)
    .slice(0, 10)
    .map(q => ({
      id: q.id,
      label: q.text,
      openai: 0, // Would need separate scores per surface
      claude: q.score!
    }))

  if (!currentProperty?.id) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Select a property to view GEO insights</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Search className="w-7 h-7 text-indigo-500" />
            <span>PropertyAudit</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Generative Engine Optimization (GEO) - Track AI visibility
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportMenu 
            runId={runs.find(r => r.status === 'completed')?.id || null}
          />
          <button
            onClick={runAudit}
            disabled={isRunning || queries.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className={`w-4 h-4 ${isRunning ? 'animate-pulse' : ''}`} />
            {isRunning ? 'Running...' : 'Run Audit'}
          </button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Run Status Indicator */}
      {currentProperty?.id && (
        <RunStatusIndicator 
          propertyId={currentProperty.id}
          onRunCompleted={fetchData}
        />
      )}

      {/* Score Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">GEO Score</span>
            {score?.trend && <TrendIcon direction={score.trend.direction} />}
          </div>
          {loading ? (
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
          ) : score ? (
            <div className="flex items-center gap-3">
              <ScoreRing score={score.overallScore} size={60} />
              <div>
                <div className={`text-3xl font-bold ${getScoreColor(score.scoreBucket)}`}>
                  {Math.round(score.overallScore)}
                </div>
                {score.trend && score.trend.changePercent !== 0 && (
                  <span className={`text-xs ${score.trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {score.trend.direction === 'up' ? '+' : ''}{score.trend.changePercent.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data yet</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Visibility</span>
            <Eye className="w-4 h-4 text-gray-400" />
          </div>
          {loading ? (
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
          ) : score ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {Math.round(score.visibilityPct)}%
              </span>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data yet</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">OpenAI</span>
            <Sparkles className="w-4 h-4 text-green-500" />
          </div>
          {loading ? (
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
          ) : score?.surfaces.openai ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {Math.round(score.surfaces.openai.overallScore)}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(score.surfaces.openai.visibilityPct)}%
              </span>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data yet</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Claude</span>
            <Globe className="w-4 h-4 text-purple-500" />
          </div>
          {loading ? (
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
          ) : score?.surfaces.claude ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {Math.round(score.surfaces.claude.overallScore)}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(score.surfaces.claude.visibilityPct)}%
              </span>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data yet</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {(['overview', 'queries', 'insights', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'queries' ? `Queries (${queries.length})` : tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {queries.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Query Panel Yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Generate a query panel from your property data to start tracking GEO visibility.
                </p>
                <button
                  onClick={generateQueryPanel}
                  disabled={isGeneratingQueries}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isGeneratingQueries ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isGeneratingQueries ? 'Generating...' : 'Generate Query Panel'}
                </button>
              </div>
            ) : (
              <>
                {/* Trend Chart */}
                {trendData.length > 1 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                      Score Trend
                    </h3>
                    <TrendChart points={trendData} height={200} />
                  </div>
                )}

                {/* Score Breakdown */}
                {score?.breakdown && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                      Score Breakdown
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Position (45%)</span>
                          <span className="text-sm font-medium">{Math.round(score.breakdown.position)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full" 
                            style={{ width: `${score.breakdown.position}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Link Rank (25%)</span>
                          <span className="text-sm font-medium">{Math.round(score.breakdown.link)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${score.breakdown.link}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Share of Voice (20%)</span>
                          <span className="text-sm font-medium">{Math.round(score.breakdown.sov)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full" 
                            style={{ width: `${score.breakdown.sov}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Accuracy (10%)</span>
                          <span className="text-sm font-medium">{Math.round(score.breakdown.accuracy)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-500 rounded-full" 
                            style={{ width: `${score.breakdown.accuracy}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Queries Tab */}
        {activeTab === 'queries' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Query Panel
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Query
                </button>
                <button
                  onClick={generateQueryPanel}
                  disabled={isGeneratingQueries}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <RefreshCw className={`w-4 h-4 ${isGeneratingQueries ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
              </div>
            </div>

            <QueryFilters queries={queries} />

            <QueryTable
              queries={queries}
              onDelete={handleDeleteQuery}
              onToggleActive={handleToggleActive}
              onBulkDelete={handleBulkDelete}
            />
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && currentProperty?.id && (
          <div className="space-y-6">
            <CompetitorInsights propertyId={currentProperty.id} />
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {runs.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500">
                No runs yet. Click "Run Audit" to start tracking.
              </div>
            ) : (
              <div className="grid gap-4">
                {runs.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => setSelectedRunId(run.id)}
                    className="w-full text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {run.surface === 'openai' ? (
                          <Sparkles className="w-5 h-5 text-green-500" />
                        ) : (
                          <Globe className="w-5 h-5 text-purple-500" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white capitalize">
                            {run.surface} Run
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(run.startedAt).toLocaleString()} • {run.queryCount} queries
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {run.score && (
                          <>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {Math.round(run.score.overallScore)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {Math.round(run.score.visibilityPct)}% visible
                              </p>
                            </div>
                            {run.diff && (
                              <TrendIcon direction={run.diff.direction} />
                            )}
                          </>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          run.status === 'completed' ? 'bg-green-100 text-green-700' :
                          run.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {run.status}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals/Drawers */}
      <CreateQueryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateQuery}
        defaultGeo={currentProperty?.address?.city ? 
          `${currentProperty.address.city}, ${currentProperty.address.state}` : 
          undefined
        }
        propertyName={currentProperty?.name}
      />

      <RunDetails
        runId={selectedRunId}
        isOpen={selectedRunId !== null}
        onClose={() => setSelectedRunId(null)}
      />
    </div>
  )
}
