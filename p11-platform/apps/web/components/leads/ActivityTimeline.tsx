'use client'

import { useState } from 'react'
import {
  Calendar,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Square,
  User,
  FileText,
  MapPin,
  Send,
  Plus,
  Loader2
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

type Activity = {
  id: string
  type: string
  description: string
  metadata?: Record<string, unknown>
  created_at: string
  created_by_user?: {
    id: string
    full_name: string | null
  }
}

interface ActivityTimelineProps {
  activities: Activity[]
  leadId: string
  onActivityAdded?: () => void
}

const ACTIVITY_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  note: { icon: FileText, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  status_change: { icon: CheckCircle2, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  tour_scheduled: { icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  tour_completed: { icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  tour_cancelled: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  tour_no_show: { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  tour_booked: { icon: MapPin, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  email_sent: { icon: Mail, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  sms_sent: { icon: Phone, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  call_made: { icon: Phone, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  workflow_started: { icon: Zap, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  workflow_stopped: { icon: Square, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  lead_created: { icon: User, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
}

function ActivityItem({ activity }: { activity: Activity }) {
  const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.note
  const Icon = config.icon
  
  return (
    <div className="flex gap-3 group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className={`h-8 w-8 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0 ring-4 ring-white`}>
          <Icon size={14} className={config.color} />
        </div>
        <div className="w-0.5 flex-1 bg-slate-200 mt-2 group-last:hidden" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
          <p className="text-sm text-slate-900">{activity.description}</p>
          
          {/* Metadata */}
          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap gap-2">
                {Object.entries(activity.metadata).map(([key, value]) => {
                  // Skip internal fields
                  if (key.startsWith('_') || key === 'tour_id' || key === 'workflow_id') return null
                  
                  return (
                    <span 
                      key={key}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-600 rounded text-xs"
                    >
                      <span className="font-medium">{key}:</span>
                      <span>{String(value)}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <Clock size={12} />
            <span>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
            {activity.created_by_user?.full_name && (
              <>
                <span>•</span>
                <span>by {activity.created_by_user.full_name}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ActivityTimeline({ activities, leadId, onActivityAdded }: ActivityTimelineProps) {
  const [showAddNote, setShowAddNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAddNote = async () => {
    if (!noteText.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'note',
          description: noteText.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add note')
      }

      setNoteText('')
      setShowAddNote(false)
      onActivityAdded?.()
    } catch (error) {
      console.error('Error adding note:', error)
      alert('Failed to add note. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (activities.length === 0 && !showAddNote) {
    return (
      <div className="bg-slate-50 rounded-xl p-6 text-center">
        <FileText className="mx-auto text-slate-300 mb-3" size={32} />
        <p className="text-sm text-slate-600 font-medium mb-1">No activity yet</p>
        <p className="text-xs text-slate-500 mb-4">
          Add a note or interact with this lead to see activity here.
        </p>
        <button
          onClick={() => setShowAddNote(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Add Note
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add Note Section */}
      {showAddNote ? (
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-start gap-2 mb-3">
            <FileText size={18} className="text-indigo-600 mt-1" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Add a note
              </label>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="What happened with this lead?"
                rows={3}
                autoFocus
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowAddNote(false)
                setNoteText('')
              }}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              disabled={loading || !noteText.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Add Note
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddNote(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 border-dashed"
        >
          <Plus size={16} />
          <span className="text-sm font-medium">Add Note</span>
        </button>
      )}

      {/* Timeline */}
      {activities.length > 0 && (
        <div className="relative">
          {activities.map(activity => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  )
}

