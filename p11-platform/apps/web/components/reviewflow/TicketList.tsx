'use client'

import { useState, useEffect } from 'react'
import { 
  AlertTriangle, Clock, User, CheckCircle, 
  Loader2, ChevronRight, MessageSquare, Star
} from 'lucide-react'
import { PlatformIcon } from './PlatformIcon'
import { formatDistanceToNow } from 'date-fns'

interface Ticket {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assigned_to: string | null
  created_at: string
  reviews?: {
    id: string
    reviewer_name: string | null
    rating: number | null
    review_text: string
    sentiment: string
    platform: string
    review_date: string
  }
  assigned_user?: {
    id: string
    full_name: string | null
  }
}

interface TicketListProps {
  propertyId: string
  onSelectTicket?: (ticket: Ticket) => void
  compact?: boolean
  limit?: number
}

export function TicketList({ propertyId, onSelectTicket, compact = false, limit }: TicketListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('open')

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ 
        propertyId,
        ...(statusFilter && { status: statusFilter }),
        ...(limit && { limit: limit.toString() })
      })
      const res = await fetch(`/api/reviewflow/tickets?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [propertyId, statusFilter])

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/reviewflow/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, status: newStatus })
      })
      if (res.ok) {
        fetchTickets()
      }
    } catch (error) {
      console.error('Error updating ticket:', error)
    }
  }

  const priorityConfig = {
    low: { color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', label: 'Low' },
    medium: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Medium' },
    high: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'High' },
    urgent: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Urgent' }
  }

  const statusConfig = {
    open: { color: 'bg-blue-100 text-blue-700', label: 'Open' },
    in_progress: { color: 'bg-amber-100 text-amber-700', label: 'In Progress' },
    resolved: { color: 'bg-emerald-100 text-emerald-700', label: 'Resolved' },
    closed: { color: 'bg-slate-100 text-slate-500', label: 'Closed' }
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No open tickets 🎉
          </p>
        ) : (
          tickets.map(ticket => (
            <div 
              key={ticket.id}
              onClick={() => onSelectTicket?.(ticket)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
            >
              <AlertTriangle className={`w-4 h-4 ${
                ticket.priority === 'urgent' ? 'text-red-500' :
                ticket.priority === 'high' ? 'text-orange-500' :
                'text-amber-500'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {ticket.title}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConfig[ticket.priority].color}`}>
                {priorityConfig[ticket.priority].label}
              </span>
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        {['open', 'in_progress', 'resolved', 'closed'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === status
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {statusConfig[status as keyof typeof statusConfig].label}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            {statusFilter ? `No ${statusFilter.replace('_', ' ')} tickets` : 'No tickets'}
          </h3>
          <p className="text-slate-500">
            {statusFilter === 'open' 
              ? 'All caught up! No negative reviews need attention.'
              : 'Tickets will appear here when negative reviews are detected.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => (
            <div 
              key={ticket.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectTicket?.(ticket)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    ticket.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30' :
                    ticket.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30' :
                    'bg-amber-100 dark:bg-amber-900/30'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 ${
                      ticket.priority === 'urgent' ? 'text-red-600 dark:text-red-400' :
                      ticket.priority === 'high' ? 'text-orange-600 dark:text-orange-400' :
                      'text-amber-600 dark:text-amber-400'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      {ticket.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                      {ticket.assigned_user && (
                        <>
                          <span>•</span>
                          <User className="w-3 h-3" />
                          <span>{ticket.assigned_user.full_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${priorityConfig[ticket.priority].color}`}>
                    {priorityConfig[ticket.priority].label}
                  </span>
                  <select
                    value={ticket.status}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleStatusChange(ticket.id, e.target.value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-xs px-2.5 py-1 rounded-full appearance-none cursor-pointer ${statusConfig[ticket.status].color}`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Review Preview */}
              {ticket.reviews && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <PlatformIcon platform={ticket.reviews.platform} size={14} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {ticket.reviews.reviewer_name || 'Anonymous'}
                    </span>
                    {ticket.reviews.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-sm">{ticket.reviews.rating}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    &ldquo;{ticket.reviews.review_text}&rdquo;
                  </p>
                </div>
              )}

              {/* Description */}
              {ticket.description && (
                <p className="text-sm text-slate-500 mt-3">
                  {ticket.description}
                </p>
              )}

              {/* View Button */}
              <div className="flex justify-end mt-4">
                <button className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  View Details
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

