'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePropertyContext } from '../layout/PropertyContext'
import { 
  MessageSquare, 
  Clock, 
  Trash2, 
  RefreshCw,
  User,
  ChevronRight
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type Conversation = {
  id: string
  channel: string
  created_at: string
  lead: {
    first_name: string
    last_name: string
  } | null
  messageCount: number
  lastMessage: {
    content: string
    role: string
    created_at: string
  } | null
}

type ConversationListProps = {
  onSelectConversation: (id: string | null) => void
  selectedId: string | null
  refreshTrigger?: number
}

export function ConversationList({ 
  onSelectConversation, 
  selectedId,
  refreshTrigger 
}: ConversationListProps) {
  const { currentProperty } = usePropertyContext()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    if (!currentProperty?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/conversations?propertyId=${currentProperty.id}`)
      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [currentProperty?.id])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations, refreshTrigger])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    
    if (!confirm('Delete this conversation?')) return
    
    setDeletingId(id)
    try {
      await fetch(`/api/conversations?conversationId=${id}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== id))
      if (selectedId === id) {
        onSelectConversation(null)
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Recent Chats</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          Recent Chats
        </h3>
        <button
          onClick={fetchConversations}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">No conversations yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Start a chat to see history here
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                selectedId === conv.id
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                selectedId === conv.id
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {conv.lead ? (
                  <span className="text-sm font-medium">
                    {conv.lead.first_name?.charAt(0)}{conv.lead.last_name?.charAt(0)}
                  </span>
                ) : (
                  <User size={18} />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium truncate ${
                    selectedId === conv.id ? 'text-indigo-900' : 'text-slate-900'
                  }`}>
                    {conv.lead 
                      ? `${conv.lead.first_name} ${conv.lead.last_name || ''}`.trim()
                      : 'Chat Session'
                    }
                  </p>
                  <ChevronRight size={14} className={`flex-shrink-0 ${
                    selectedId === conv.id ? 'text-indigo-400' : 'text-slate-300'
                  }`} />
                </div>
                {conv.lastMessage && (
                  <p className="text-xs text-slate-500 truncate">
                    {conv.lastMessage.role === 'assistant' ? '🤖 ' : ''}
                    {conv.lastMessage.content}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })} • {conv.messageCount} messages
                </p>
              </div>

              <button
                onClick={(e) => handleDelete(e, conv.id)}
                disabled={deletingId === conv.id}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
              >
                {deletingId === conv.id ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


















