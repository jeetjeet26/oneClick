'use client'

import { useState } from 'react'
import { 
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Loader2,
  XCircle
} from 'lucide-react'

type Task = {
  id: string
  property_id: string
  task_type: string
  task_name: string
  description: string | null
  category: 'setup' | 'documents' | 'integrations' | 'billing' | 'training' | 'general'
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped'
  priority: number
  due_date: string | null
  completed_at: string | null
  completed_by: string | null
  blocked_reason: string | null
  notes: string | null
}

type Props = {
  tasks: Task[]
  stats: {
    total: number
    completed: number
    inProgress: number
    pending: number
    blocked: number
    progress: number
  }
  onTaskUpdate?: (taskId: string, status: string) => void
  onRefresh?: () => void
}

const CATEGORY_CONFIG = {
  setup: { label: 'Setup', color: 'bg-indigo-100 text-indigo-700' },
  documents: { label: 'Documents', color: 'bg-blue-100 text-blue-700' },
  integrations: { label: 'Integrations', color: 'bg-emerald-100 text-emerald-700' },
  billing: { label: 'Billing', color: 'bg-amber-100 text-amber-700' },
  training: { label: 'Training', color: 'bg-purple-100 text-purple-700' },
  general: { label: 'General', color: 'bg-slate-100 text-slate-700' },
}

const STATUS_CONFIG = {
  pending: { icon: Circle, color: 'text-slate-400', label: 'Not Started' },
  in_progress: { icon: Clock, color: 'text-blue-500', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Completed' },
  blocked: { icon: AlertCircle, color: 'text-red-500', label: 'Blocked' },
  skipped: { icon: XCircle, color: 'text-slate-400', label: 'Skipped' },
}

const TASK_GUIDES: Record<string, string> = {
  ga4_access: 'Go to Google Analytics → Admin → Account Access Management → Add user: analytics@p11.com with Admin role',
  google_ads_access: 'Go to Google Ads → Tools → Access and security → Add ads@p11.com with Admin role',
  meta_access: 'Go to Meta Business Manager → Settings → Partners → Send partner invite to P11 Agency',
  doc_upload: 'Upload PDF documents with property info, pricing, policies, and amenities',
  intake_form: 'Complete all fields in the community profile section',
  payment_setup: 'Configure your preferred payment method in billing settings',
}

export function OnboardingChecklist({ tasks, stats, onTaskUpdate, onRefresh }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdatingId(taskId)
    try {
      const response = await fetch('/api/community/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update')
      onTaskUpdate?.(taskId, newStatus)
      onRefresh?.()
    } catch (error) {
      console.error('Error updating task:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  // Group tasks
  const completedTasks = tasks.filter(t => t.status === 'completed')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const blockedTasks = tasks.filter(t => t.status === 'blocked')
  const skippedTasks = tasks.filter(t => t.status === 'skipped')

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Onboarding Progress</h3>
          <span className="text-2xl font-bold text-indigo-600">{stats.progress}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${stats.progress}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
            <p className="text-xs text-slate-500">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            <p className="text-xs text-slate-500">In Progress</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-600">{stats.pending}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{stats.blocked}</p>
            <p className="text-xs text-slate-500">Blocked</p>
          </div>
        </div>
      </div>

      {/* Blocked Tasks Alert */}
      {blockedTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">
                {blockedTasks.length} task{blockedTasks.length > 1 ? 's' : ''} blocked
              </h4>
              <p className="text-sm text-red-700 mt-1">
                These tasks need attention before you can proceed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Task Sections */}
      <div className="space-y-4">
        {/* In Progress */}
        {inProgressTasks.length > 0 && (
          <TaskSection
            title="In Progress"
            icon={<Clock className="h-5 w-5 text-blue-500" />}
            tasks={inProgressTasks}
            expandedId={expandedId}
            onToggle={setExpandedId}
            onStatusChange={handleStatusChange}
            updatingId={updatingId}
          />
        )}

        {/* Pending */}
        {pendingTasks.length > 0 && (
          <TaskSection
            title="Not Started"
            icon={<Circle className="h-5 w-5 text-slate-400" />}
            tasks={pendingTasks}
            expandedId={expandedId}
            onToggle={setExpandedId}
            onStatusChange={handleStatusChange}
            updatingId={updatingId}
          />
        )}

        {/* Blocked */}
        {blockedTasks.length > 0 && (
          <TaskSection
            title="Blocked"
            icon={<AlertCircle className="h-5 w-5 text-red-500" />}
            tasks={blockedTasks}
            expandedId={expandedId}
            onToggle={setExpandedId}
            onStatusChange={handleStatusChange}
            updatingId={updatingId}
          />
        )}

        {/* Completed */}
        {completedTasks.length > 0 && (
          <TaskSection
            title="Completed"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            tasks={completedTasks}
            expandedId={expandedId}
            onToggle={setExpandedId}
            onStatusChange={handleStatusChange}
            updatingId={updatingId}
            collapsed
          />
        )}
      </div>
    </div>
  )
}

function TaskSection({
  title,
  icon,
  tasks,
  expandedId,
  onToggle,
  onStatusChange,
  updatingId,
  collapsed = false,
}: {
  title: string
  icon: React.ReactNode
  tasks: Task[]
  expandedId: string | null
  onToggle: (id: string | null) => void
  onStatusChange: (taskId: string, status: string) => void
  updatingId: string | null
  collapsed?: boolean
}) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-slate-900">{title}</span>
          <span className="text-sm text-slate-500">({tasks.length})</span>
        </div>
        <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${!isCollapsed ? 'rotate-90' : ''}`} />
      </button>

      {!isCollapsed && (
        <div className="border-t border-slate-200 divide-y divide-slate-100">
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              isExpanded={expandedId === task.id}
              onToggle={() => onToggle(expandedId === task.id ? null : task.id)}
              onStatusChange={onStatusChange}
              isUpdating={updatingId === task.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskItem({
  task,
  isExpanded,
  onToggle,
  onStatusChange,
  isUpdating,
}: {
  task: Task
  isExpanded: boolean
  onToggle: () => void
  onStatusChange: (taskId: string, status: string) => void
  isUpdating: boolean
}) {
  const statusConfig = STATUS_CONFIG[task.status]
  const categoryConfig = CATEGORY_CONFIG[task.category]
  const StatusIcon = statusConfig.icon
  const guide = TASK_GUIDES[task.task_type]

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
          <div className="text-left">
            <p className="font-medium text-slate-900 text-sm">{task.task_name}</p>
            {task.description && (
              <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${categoryConfig.color}`}>
            {categoryConfig.label}
          </span>
          <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-4 pt-0">
          {/* Guide */}
          {guide && task.status !== 'completed' && (
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 mb-4">
              <p className="text-xs font-medium text-indigo-700 mb-1">How to complete:</p>
              <p className="text-xs text-indigo-600">{guide}</p>
            </div>
          )}

          {/* Blocked reason */}
          {task.blocked_reason && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-100 mb-4">
              <p className="text-xs font-medium text-red-700 mb-1">Blocked:</p>
              <p className="text-xs text-red-600">{task.blocked_reason}</p>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-4">
              <p className="text-xs font-medium text-slate-700 mb-1">Notes:</p>
              <p className="text-xs text-slate-600">{task.notes}</p>
            </div>
          )}

          {/* Completed info */}
          {task.completed_at && (
            <p className="text-xs text-slate-500 mb-4">
              Completed {new Date(task.completed_at).toLocaleDateString()}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {task.status === 'pending' && (
              <button
                onClick={() => onStatusChange(task.id, 'in_progress')}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
                Start
              </button>
            )}
            {(task.status === 'pending' || task.status === 'in_progress') && (
              <button
                onClick={() => onStatusChange(task.id, 'completed')}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Mark Complete
              </button>
            )}
            {task.status === 'blocked' && (
              <button
                onClick={() => onStatusChange(task.id, 'pending')}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Unblock
              </button>
            )}
            {task.status === 'completed' && (
              <button
                onClick={() => onStatusChange(task.id, 'pending')}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Mark Incomplete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

