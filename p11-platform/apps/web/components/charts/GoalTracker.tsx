'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Target, 
  Settings2, 
  X, 
  Check, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Loader2,
  Edit2,
  Trash2
} from 'lucide-react'

type MetricGoal = {
  id: string
  property_id: string
  metric_key: string
  goal_type: 'monthly' | 'quarterly' | 'yearly'
  target_value: number
  is_inverse: boolean
  alert_threshold_percent: number
  is_active: boolean
}

type GoalTrackerProps = {
  propertyId: string
  currentMetrics: {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpa: number
  }
}

const METRIC_CONFIG: Record<string, { 
  label: string
  format: (v: number) => string
  isInverse: boolean
  icon: string
  color: string
}> = {
  spend: { 
    label: 'Ad Spend', 
    format: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
    isInverse: false,
    icon: '💰',
    color: 'indigo'
  },
  impressions: { 
    label: 'Impressions', 
    format: (v) => v.toLocaleString('en-US'),
    isInverse: false,
    icon: '👁️',
    color: 'blue'
  },
  clicks: { 
    label: 'Clicks', 
    format: (v) => v.toLocaleString('en-US'),
    isInverse: false,
    icon: '👆',
    color: 'emerald'
  },
  conversions: { 
    label: 'Conversions', 
    format: (v) => v.toLocaleString('en-US'),
    isInverse: false,
    icon: '🎯',
    color: 'purple'
  },
  ctr: { 
    label: 'CTR', 
    format: (v) => `${v.toFixed(2)}%`,
    isInverse: false,
    icon: '📊',
    color: 'amber'
  },
  cpa: { 
    label: 'CPA', 
    format: (v) => `$${v.toFixed(2)}`,
    isInverse: true, // Lower is better
    icon: '💵',
    color: 'rose'
  },
}

function GoalProgressBar({ 
  current, 
  target, 
  isInverse, 
  alertThreshold 
}: { 
  current: number
  target: number
  isInverse: boolean
  alertThreshold: number
}) {
  // For inverse metrics (CPA), calculate progress differently
  // Lower than target = good, higher = bad
  let progress: number
  let isOnTrack: boolean
  
  if (isInverse) {
    // For CPA: if current is lower than target, we're doing well
    if (current <= 0) {
      progress = 100
      isOnTrack = true
    } else if (target <= 0) {
      progress = 0
      isOnTrack = false
    } else {
      // Calculate how much "under" target we are
      progress = Math.min(100, Math.max(0, ((target - current) / target) * 100 + 100))
      isOnTrack = current <= target
    }
  } else {
    // For normal metrics: higher is better
    progress = target > 0 ? Math.min(100, (current / target) * 100) : 0
    isOnTrack = progress >= alertThreshold
  }

  const getStatusColor = () => {
    if (isOnTrack) return 'bg-emerald-500'
    if (progress >= alertThreshold * 0.5) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="relative">
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getStatusColor()} transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {/* Alert threshold marker */}
      <div 
        className="absolute top-0 h-2 w-0.5 bg-slate-400"
        style={{ left: `${alertThreshold}%` }}
        title={`${alertThreshold}% alert threshold`}
      />
    </div>
  )
}

function GoalCard({
  goal,
  currentValue,
  onEdit,
  onDelete
}: {
  goal: MetricGoal
  currentValue: number
  onEdit: () => void
  onDelete: () => void
}) {
  const config = METRIC_CONFIG[goal.metric_key]
  if (!config) return null

  const progress = goal.is_inverse
    ? (goal.target_value > 0 ? Math.max(0, ((goal.target_value - currentValue) / goal.target_value) * 100 + 100) : 0)
    : (goal.target_value > 0 ? (currentValue / goal.target_value) * 100 : 0)
  
  const isOnTrack = goal.is_inverse 
    ? currentValue <= goal.target_value
    : progress >= goal.alert_threshold_percent

  const isExceeding = goal.is_inverse
    ? currentValue < goal.target_value * 0.8
    : progress > 100

  return (
    <div className={`bg-white rounded-xl border ${isOnTrack ? 'border-slate-200' : 'border-amber-200 bg-amber-50/30'} p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <div>
            <h4 className="font-medium text-slate-900">{config.label}</h4>
            <p className="text-xs text-slate-500 capitalize">{goal.goal_type} Goal</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onEdit}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Edit2 size={14} className="text-slate-400" />
          </button>
          <button 
            onClick={onDelete}
            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 size={14} className="text-slate-400 hover:text-red-500" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-end justify-between mb-1">
          <span className="text-2xl font-bold text-slate-900">
            {config.format(currentValue)}
          </span>
          <span className="text-sm text-slate-500">
            / {config.format(goal.target_value)}
          </span>
        </div>
        <GoalProgressBar 
          current={currentValue}
          target={goal.target_value}
          isInverse={goal.is_inverse}
          alertThreshold={goal.alert_threshold_percent}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1 text-xs font-medium ${
          isOnTrack ? 'text-emerald-600' : 'text-amber-600'
        }`}>
          {isExceeding ? (
            <>
              <Sparkles size={12} />
              Exceeding goal!
            </>
          ) : isOnTrack ? (
            <>
              <TrendingUp size={12} />
              On track
            </>
          ) : (
            <>
              <AlertTriangle size={12} />
              Below target
            </>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {progress.toFixed(0)}% {goal.is_inverse ? 'efficiency' : 'complete'}
        </span>
      </div>
    </div>
  )
}

function EditGoalModal({
  isOpen,
  onClose,
  onSave,
  goal,
  existingGoals
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { metricKey: string; targetValue: number; goalType: string; alertThreshold: number }) => void
  goal?: MetricGoal
  existingGoals: MetricGoal[]
}) {
  const [metricKey, setMetricKey] = useState(goal?.metric_key || '')
  const [targetValue, setTargetValue] = useState(goal?.target_value?.toString() || '')
  const [goalType, setGoalType] = useState(goal?.goal_type || 'monthly')
  const [alertThreshold, setAlertThreshold] = useState(goal?.alert_threshold_percent || 80)
  const [saving, setSaving] = useState(false)

  // Get metrics that don't already have goals
  const availableMetrics = Object.entries(METRIC_CONFIG).filter(([key]) => {
    if (goal && goal.metric_key === key) return true // Allow editing current metric
    return !existingGoals.some(g => g.metric_key === key && g.goal_type === goalType)
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        metricKey,
        targetValue: parseFloat(targetValue),
        goalType,
        alertThreshold,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Target className="text-indigo-600" size={20} />
              {goal ? 'Edit Goal' : 'Set New Goal'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Metric
              </label>
              <select
                value={metricKey}
                onChange={(e) => setMetricKey(e.target.value)}
                required
                disabled={!!goal}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white disabled:bg-slate-50"
              >
                <option value="">Select metric...</option>
                {availableMetrics.map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Target Value
                </label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  required
                  min="0"
                  step={metricKey === 'ctr' || metricKey === 'cpa' ? '0.01' : '1'}
                  placeholder={metricKey === 'cpa' ? '50.00' : '1000'}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Period
                </label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  disabled={!!goal}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white disabled:bg-slate-50"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Alert Threshold ({alertThreshold}%)
              </label>
              <input
                type="range"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
                min="50"
                max="100"
                step="5"
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-xs text-slate-500 mt-1">
                Alert when performance drops below {alertThreshold}% of goal
              </p>
            </div>

            {metricKey && METRIC_CONFIG[metricKey]?.isInverse && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                <strong>Note:</strong> For {METRIC_CONFIG[metricKey].label}, lower values are better. 
                Setting a target of ${targetValue || '0'} means you want to keep costs at or below this amount.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !metricKey || !targetValue}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><Check size={16} /> {goal ? 'Update Goal' : 'Create Goal'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export function GoalTracker({ propertyId, currentMetrics }: GoalTrackerProps) {
  const [goals, setGoals] = useState<MetricGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<MetricGoal | undefined>()
  const [expanded, setExpanded] = useState(false)

  const fetchGoals = useCallback(async () => {
    if (!propertyId) return
    
    try {
      const response = await fetch(`/api/analytics/goals?propertyId=${propertyId}`)
      if (response.ok) {
        const data = await response.json()
        setGoals(data.goals || [])
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error)
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const handleSaveGoal = async (data: { metricKey: string; targetValue: number; goalType: string; alertThreshold: number }) => {
    try {
      const response = await fetch('/api/analytics/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          metricKey: data.metricKey,
          goalType: data.goalType,
          targetValue: data.targetValue,
          alertThreshold: data.alertThreshold,
          isInverse: METRIC_CONFIG[data.metricKey]?.isInverse || false,
        }),
      })

      if (response.ok) {
        fetchGoals()
      }
    } catch (error) {
      console.error('Failed to save goal:', error)
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      const response = await fetch(`/api/analytics/goals?goalId=${goalId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchGoals()
      }
    } catch (error) {
      console.error('Failed to delete goal:', error)
    }
  }

  const handleEditGoal = (goal: MetricGoal) => {
    setEditingGoal(goal)
    setShowModal(true)
  }

  // Count goals that are below threshold
  const warningCount = goals.filter(goal => {
    const currentValue = currentMetrics[goal.metric_key as keyof typeof currentMetrics] || 0
    if (goal.is_inverse) {
      return currentValue > goal.target_value
    }
    const progress = goal.target_value > 0 ? (currentValue / goal.target_value) * 100 : 0
    return progress < goal.alert_threshold_percent
  }).length

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          Loading goals...
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Target size={20} className="text-indigo-600" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-slate-900">Goal Tracking</h3>
            <p className="text-sm text-slate-500">
              {goals.length} active goal{goals.length !== 1 ? 's' : ''}
              {warningCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                  <AlertTriangle size={12} />
                  {warningCount} below target
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditingGoal(undefined)
              setShowModal(true)
            }}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Add new goal"
          >
            <Settings2 size={20} />
          </button>
          <div className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <TrendingUp size={20} className="text-slate-400" />
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-200 p-6">
          {goals.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target size={24} className="text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium mb-1">No goals set yet</p>
              <p className="text-sm text-slate-500 mb-4">
                Set targets for your marketing metrics to track performance
              </p>
              <button
                onClick={() => {
                  setEditingGoal(undefined)
                  setShowModal(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                <Target size={16} />
                Set Your First Goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  currentValue={currentMetrics[goal.metric_key as keyof typeof currentMetrics] || 0}
                  onEdit={() => handleEditGoal(goal)}
                  onDelete={() => handleDeleteGoal(goal.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <EditGoalModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingGoal(undefined)
        }}
        onSave={handleSaveGoal}
        goal={editingGoal}
        existingGoals={goals}
      />
    </div>
  )
}

