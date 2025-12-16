'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { 
  Sparkles, 
  Send, 
  Loader2, 
  Table, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  HelpCircle,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  History,
  Star,
  StarOff,
  Lightbulb,
  X
} from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts'

type QueryResult = {
  success: boolean
  question: string
  sql: string
  data: Record<string, unknown>[]
  rowCount: number
  note?: string
}

type ChartType = 'table' | 'bar' | 'line' | 'pie' | 'area'

type QueryHistoryItem = {
  id: string
  question: string
  timestamp: number
  isFavorite: boolean
}

type NaturalLanguageQueryProps = {
  propertyId: string
  onQueryResult?: (result: QueryResult) => void
}

// Smart chart color palette
const CHART_COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
]

// Context-aware suggested questions
const SMART_SUGGESTIONS = [
  { 
    icon: TrendingUp,
    category: 'Performance',
    questions: [
      "What was my total spend last week?",
      "Show me clicks by channel for the last 30 days",
      "What's my average CPC by campaign?",
    ]
  },
  {
    icon: BarChart3,
    category: 'Comparison',
    questions: [
      "Compare Meta vs Google Ads performance",
      "Which campaign had the most conversions?",
      "What channel has the lowest CPA?",
    ]
  },
  {
    icon: PieChart,
    category: 'Breakdown',
    questions: [
      "Show me spend distribution by channel",
      "What percentage of clicks come from Meta?",
      "Break down impressions by campaign",
    ]
  },
]

const STORAGE_KEY = 'nl-query-history'
const MAX_HISTORY = 10

function analyzeDataForChart(data: Record<string, unknown>[]): ChartType {
  if (!data || data.length === 0) return 'table'
  
  const keys = Object.keys(data[0])
  const numericKeys = keys.filter(key => {
    const value = data[0][key]
    return typeof value === 'number'
  })
  
  const stringKeys = keys.filter(key => {
    const value = data[0][key]
    return typeof value === 'string'
  })
  
  // If we have a date column and numeric values, suggest line/area chart
  const hasDateColumn = stringKeys.some(key => 
    key.toLowerCase().includes('date') || 
    key.toLowerCase().includes('day') ||
    key.toLowerCase().includes('month') ||
    key.toLowerCase().includes('week')
  )
  
  if (hasDateColumn && numericKeys.length >= 1 && data.length > 2) {
    return 'area'
  }
  
  // If we have categories and single numeric value, suggest pie
  if (stringKeys.length === 1 && numericKeys.length === 1 && data.length <= 6) {
    return 'pie'
  }
  
  // If we have categories with multiple numeric values, suggest bar
  if (stringKeys.length >= 1 && numericKeys.length >= 1 && data.length <= 15) {
    return 'bar'
  }
  
  // Default to table for complex or large datasets
  return data.length > 20 ? 'table' : 'bar'
}

function getChartConfig(data: Record<string, unknown>[], chartType: ChartType) {
  if (!data || data.length === 0) return null
  
  const keys = Object.keys(data[0])
  const numericKeys = keys.filter(key => typeof data[0][key] === 'number')
  const stringKeys = keys.filter(key => typeof data[0][key] === 'string')
  
  // Find the best category/x-axis key
  const categoryKey = stringKeys.find(key => 
    key.toLowerCase().includes('date') || 
    key.toLowerCase().includes('channel') ||
    key.toLowerCase().includes('campaign') ||
    key.toLowerCase().includes('name')
  ) || stringKeys[0] || keys[0]
  
  // Find the primary value key (prefer spend, then conversions, then clicks)
  const valueKeyPriority = ['spend', 'conversions', 'conversion', 'clicks', 'impressions', 'total', 'sum', 'count', 'avg']
  const valueKey = numericKeys.find(key => 
    valueKeyPriority.some(v => key.toLowerCase().includes(v))
  ) || numericKeys[0]
  
  return {
    categoryKey,
    valueKey,
    numericKeys,
    stringKeys,
  }
}

export function NaturalLanguageQuery({ propertyId, onQueryResult }: NaturalLanguageQueryProps) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSQL, setShowSQL] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('table')
  const [history, setHistory] = useState<QueryHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setHistory(JSON.parse(stored))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Save history to localStorage
  const saveHistory = useCallback((newHistory: QueryHistoryItem[]) => {
    setHistory(newHistory)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory))
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Auto-detect best chart type when results change
  const suggestedChartType = useMemo(() => {
    if (!result?.data) return 'table'
    return analyzeDataForChart(result.data)
  }, [result])

  // Update selected chart type when suggestion changes
  useEffect(() => {
    if (suggestedChartType !== 'table') {
      setSelectedChartType(suggestedChartType)
    } else {
      setSelectedChartType('table')
    }
  }, [suggestedChartType])

  const chartConfig = useMemo(() => {
    if (!result?.data) return null
    return getChartConfig(result.data, selectedChartType)
  }, [result, selectedChartType])

  const handleQuery = useCallback(async () => {
    if (!question.trim() || loading) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/analytics/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, propertyId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Query failed')
      }

      setResult(data)
      onQueryResult?.(data)

      // Add to history
      const newItem: QueryHistoryItem = {
        id: Date.now().toString(),
        question: question.trim(),
        timestamp: Date.now(),
        isFavorite: false,
      }
      
      const newHistory = [newItem, ...history.filter(h => h.question !== question.trim())]
        .slice(0, MAX_HISTORY)
      saveHistory(newHistory)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed')
    } finally {
      setLoading(false)
    }
  }, [question, propertyId, loading, onQueryResult, history, saveHistory])

  const handleSuggestionClick = (suggestion: string) => {
    setQuestion(suggestion)
    setShowSuggestions(false)
  }

  const handleHistoryClick = (item: QueryHistoryItem) => {
    setQuestion(item.question)
    setShowHistory(false)
  }

  const toggleFavorite = (id: string) => {
    const newHistory = history.map(h => 
      h.id === id ? { ...h, isFavorite: !h.isFavorite } : h
    )
    // Sort favorites to top
    newHistory.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1
      if (!a.isFavorite && b.isFavorite) return 1
      return b.timestamp - a.timestamp
    })
    saveHistory(newHistory)
  }

  const clearHistory = () => {
    saveHistory(history.filter(h => h.isFavorite))
  }

  const copySQL = () => {
    if (result?.sql) {
      navigator.clipboard.writeText(result.sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'number') {
      if (value >= 0 && value < 1000000) {
        return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      }
      return value.toLocaleString()
    }
    return String(value)
  }

  const renderChart = () => {
    if (!result?.data || result.data.length === 0 || !chartConfig) return null

    const { categoryKey, valueKey, numericKeys } = chartConfig
    
    switch (selectedChartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={result.data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey={categoryKey}
                tick={{ fill: '#64748b', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
                tickFormatter={(value) => String(value).substring(0, 15)}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                  return value.toString()
                }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value) => {
                  const numeric =
                    typeof value === 'number' ? value : Number(value ?? 0)
                  return [formatValue(numeric), ''] as [string, '']
                }}
              />
              <Legend />
              {numericKeys.slice(0, 3).map((key, idx) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  fill={CHART_COLORS[idx]} 
                  radius={[4, 4, 0, 0]}
                  name={key.replace(/_/g, ' ')}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )
        
      case 'line':
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={result.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                {numericKeys.slice(0, 3).map((key, idx) => (
                  <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[idx]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS[idx]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis 
                dataKey={categoryKey}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => {
                  // Try to format dates
                  if (String(value).match(/^\d{4}-\d{2}-\d{2}/)) {
                    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                  return String(value).substring(0, 10)
                }}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                  return value.toString()
                }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value) => {
                  const numeric =
                    typeof value === 'number' ? value : Number(value ?? 0)
                  return [formatValue(numeric), ''] as [string, '']
                }}
              />
              <Legend />
              {numericKeys.slice(0, 3).map((key, idx) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[idx]}
                  strokeWidth={2}
                  fill={`url(#gradient-${key})`}
                  name={key.replace(/_/g, ' ')}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={result.data}
                dataKey={valueKey}
                nameKey={categoryKey}
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) =>
                  `${String(name).substring(0, 10)} (${(((percent ?? 0) as number) * 100).toFixed(0)}%)`
                }
                labelLine={{ stroke: '#94a3b8' }}
              >
                {result.data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value) => {
                  const numeric =
                    typeof value === 'number' ? value : Number(value ?? 0)
                  return [formatValue(numeric), ''] as [string, '']
                }}
              />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        )
        
      default:
        return null
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Ask Anything</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">AI-powered queries with auto-visualization</p>
            </div>
          </div>
          
          {/* History Button */}
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                showHistory 
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' 
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              <History size={14} />
              History
            </button>
          )}
        </div>
      </div>

      {/* Query History Panel */}
      {showHistory && history.length > 0 && (
        <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Recent Queries</span>
            <button 
              onClick={clearHistory}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              Clear history
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 group"
              >
                <button
                  onClick={() => toggleFavorite(item.id)}
                  className="p-1 text-slate-300 hover:text-amber-500 transition-colors"
                >
                  {item.isFavorite ? (
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                  ) : (
                    <StarOff size={14} />
                  )}
                </button>
                <button
                  onClick={() => handleHistoryClick(item)}
                  className="flex-1 text-left px-2 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors truncate"
                >
                  {item.question}
                </button>
                <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query Input */}
      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
            placeholder="Ask a question about your marketing data..."
            disabled={loading}
            className="w-full px-4 py-3 pr-12 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
          />
          <button
            onClick={handleQuery}
            disabled={!question.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>

        {/* Smart Suggestions */}
        <div className="mt-3">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <Lightbulb size={14} />
            Suggested questions
            {showSuggestions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          
          {showSuggestions && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              {SMART_SUGGESTIONS.map((category) => (
                <div key={category.category} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <category.icon size={14} className="text-indigo-500" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{category.category}</span>
                  </div>
                  <div className="space-y-1">
                    {category.questions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(q)}
                        className="block w-full text-left px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="border-t border-slate-200 dark:border-slate-700">
          {/* Visualization Type Selector & SQL Toggle */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">View as:</span>
              {[
                { type: 'table' as ChartType, icon: Table, label: 'Table' },
                { type: 'bar' as ChartType, icon: BarChart3, label: 'Bar' },
                { type: 'area' as ChartType, icon: LineChart, label: 'Line' },
                { type: 'pie' as ChartType, icon: PieChart, label: 'Pie' },
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setSelectedChartType(type)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                    selectedChartType === type
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                  title={label}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
              
              {suggestedChartType !== 'table' && suggestedChartType !== selectedChartType && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full flex items-center gap-1">
                  <Sparkles size={10} />
                  Try {suggestedChartType}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {result.rowCount} result{result.rowCount !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setShowSQL(!showSQL)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                {showSQL ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                SQL
              </button>
            </div>
          </div>

          {/* SQL Display */}
          {showSQL && (
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <div className="relative bg-slate-900 rounded-lg p-3 overflow-x-auto">
                <button
                  onClick={copySQL}
                  className="absolute top-2 right-2 p-1.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap pr-10">
                  {result.sql}
                </pre>
              </div>
            </div>
          )}

          {/* Chart Visualization */}
          {selectedChartType !== 'table' && result.data && result.data.length > 0 && (
            <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700">
              {renderChart()}
            </div>
          )}

          {/* Data Table */}
          {(selectedChartType === 'table' || !result.data || result.data.length === 0) && (
            result.data && result.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-700">
                    <tr>
                      {Object.keys(result.data[0]).map((key) => (
                        <th
                          key={key}
                          className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                        >
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {result.data.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                        {Object.values(row).map((value, vidx) => (
                          <td key={vidx} className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                            {formatValue(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.data.length > 10 && (
                  <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                    Showing 10 of {result.data.length} results
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Table size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No results found</p>
              </div>
            )
          )}

          {/* Note */}
          {result.note && (
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
              {result.note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
