'use client'

import { useState, useEffect } from 'react'
import { usePropertyContext } from '@/components/layout/PropertyContext'
import {
  Zap,
  RefreshCw,
  Plus,
  Play,
  Pause,
  Settings,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  Mail,
  Phone
} from 'lucide-react'

type WorkflowStep = {
  id: number
  delay_hours: number
  action: 'sms' | 'email' | 'wait'
  template_slug: string
}

type Workflow = {
  id: string
  name: string
  description: string | null
  trigger_on: string
  steps: WorkflowStep[]
  exit_conditions: string[]
  is_active: boolean
  created_at: string
}

const TRIGGER_LABELS: Record<string, string> = {
  lead_created: 'New Lead Created',
  tour_no_show: 'Tour No-Show',
  tour_completed: 'Tour Completed',
}

export default function WorkflowsSettingsPage() {
  const { currentProperty } = usePropertyContext()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  const fetchWorkflows = async () => {
    if (!currentProperty?.id) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/workflows/templates?propertyId=${currentProperty.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch workflows')
      }

      const data = await response.json()
      setWorkflows(data.workflows || [])
    } catch (err) {
      console.error('Error fetching workflows:', err)
      setError(err instanceof Error ? err.message : 'Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkflows()
  }, [currentProperty?.id])

  const handleToggleWorkflow = async (workflowId: string, currentState: boolean) => {
    try {
      const response = await fetch('/api/workflows/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          is_active: !currentState
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update workflow')
      }

      // Update local state
      setWorkflows(workflows.map(w => 
        w.id === workflowId ? { ...w, is_active: !currentState } : w
      ))
    } catch (err) {
      console.error('Error toggling workflow:', err)
      alert('Failed to update workflow. Please try again.')
    }
  }

  const handleSeedDefaults = async () => {
    if (!currentProperty?.id) return
    
    if (!confirm('This will create default workflow templates and message templates for your property. Continue?')) {
      return
    }

    setSeeding(true)

    try {
      const response = await fetch('/api/workflows/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: currentProperty.id,
          seedDefaults: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to seed workflows')
      }

      const data = await response.json()
      alert(`✅ Created ${data.workflows?.length || 0} workflows and ${data.templatesCount || 0} message templates!`)
      fetchWorkflows()
    } catch (err) {
      console.error('Error seeding workflows:', err)
      alert('Failed to create default workflows. Please try again.')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="text-amber-500" size={24} />
            Workflow Automation
          </h1>
          <p className="text-slate-500 mt-1">
            Manage automated follow-up sequences for {currentProperty?.name || 'your property'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchWorkflows}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {workflows.length === 0 && !loading && (
            <button
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {seeding ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Default Workflows
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-900 mb-1">
              Automated Lead Nurturing
            </h3>
            <p className="text-sm text-amber-700">
              Workflows automatically send SMS and email follow-ups to your leads based on their actions. 
              Toggle workflows on/off below to control which automations are active.
            </p>
          </div>
        </div>
      </div>

      {/* Workflows List */}
      {error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-500" size={24} />
          </div>
          <p className="text-slate-900 font-medium mb-1">Error loading workflows</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Loading workflows...</p>
        </div>
      ) : workflows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="text-slate-400" size={24} />
          </div>
          <p className="text-slate-900 font-medium mb-1">No workflows configured</p>
          <p className="text-slate-500 text-sm mb-4">
            Get started with pre-built workflow templates
          </p>
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {seeding ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus size={16} />
                Create Default Workflows
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map(workflow => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onToggle={handleToggleWorkflow}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function WorkflowCard({ 
  workflow, 
  onToggle 
}: { 
  workflow: Workflow
  onToggle: (id: string, currentState: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`bg-white rounded-xl border transition-all ${
      workflow.is_active 
        ? 'border-emerald-200 shadow-sm shadow-emerald-500/10' 
        : 'border-slate-200'
    }`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-semibold text-slate-900">{workflow.name}</h3>
              {workflow.is_active ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                  <CheckCircle2 size={12} />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                  <Pause size={12} />
                  Inactive
                </span>
              )}
            </div>
            {workflow.description && (
              <p className="text-sm text-slate-600">{workflow.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Zap size={12} />
                Trigger: {TRIGGER_LABELS[workflow.trigger_on] || workflow.trigger_on}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare size={12} />
                {workflow.steps.length} steps
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="View details"
            >
              <Settings size={18} className="text-slate-400" />
            </button>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={workflow.is_active}
                onChange={() => onToggle(workflow.id, workflow.is_active)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-emerald-500/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>
        </div>

        {/* Expanded View */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Workflow Steps</h4>
            <div className="space-y-2">
              {workflow.steps.map((step, index) => {
                const Icon = step.action === 'sms' ? Phone : step.action === 'email' ? Mail : Clock
                const delayLabel = step.delay_hours < 1 
                  ? `${Math.round(step.delay_hours * 60)} minutes`
                  : step.delay_hours === 1
                    ? '1 hour'
                    : step.delay_hours < 24
                      ? `${step.delay_hours} hours`
                      : `${Math.round(step.delay_hours / 24)} days`

                return (
                  <div 
                    key={step.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      step.action === 'sms' 
                        ? 'bg-emerald-100 text-emerald-600'
                        : step.action === 'email'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 capitalize">
                        {step.action === 'sms' ? 'Send SMS' : step.action === 'email' ? 'Send Email' : 'Wait'}
                      </p>
                      <p className="text-xs text-slate-500">
                        After {delayLabel} • Template: {step.template_slug}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      Step {index + 1}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Exit Conditions */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                Stops when lead status becomes:
              </h4>
              <div className="flex flex-wrap gap-2">
                {workflow.exit_conditions.map(condition => (
                  <span 
                    key={condition}
                    className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium"
                  >
                    {condition.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

