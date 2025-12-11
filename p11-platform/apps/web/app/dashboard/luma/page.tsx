'use client'

import { useState, useCallback, useEffect } from 'react'
import { ChatInterface } from '@/components/luma/ChatInterface'
import { DocumentUploader } from '@/components/luma/DocumentUploader'
import { DocumentList } from '@/components/luma/DocumentList'
import { ConversationList } from '@/components/luma/ConversationList'
import { usePropertyContext } from '@/components/layout/PropertyContext'
import { MessageSquare, Brain, Zap, History, UserCheck } from 'lucide-react'

export default function LumaPage() {
  const { currentProperty } = usePropertyContext()
  const [docRefreshKey, setDocRefreshKey] = useState(0)
  const [convRefreshKey, setConvRefreshKey] = useState(0)
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [isAgentMode, setIsAgentMode] = useState(true) // Default to agent view for dashboard users

  // Reset selected conversation when property changes
  useEffect(() => {
    setSelectedConversation(null)
  }, [currentProperty.id])

  const handleUploadComplete = () => {
    setDocRefreshKey(prev => prev + 1)
  }

  const handleConversationStart = useCallback((id: string) => {
    setSelectedConversation(id)
    setConvRefreshKey(prev => prev + 1)
  }, [])

  const handleSelectConversation = (id: string | null) => {
    setSelectedConversation(id)
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="text-indigo-500" size={28} />
              LumaLeasing
            </h1>
            <p className="text-slate-500 mt-1">
              AI-powered leasing assistant for {currentProperty?.name || 'your property'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsAgentMode(!isAgentMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                isAgentMode 
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <UserCheck size={12} />
              {isAgentMode ? 'Agent Mode' : 'Viewer Mode'}
            </button>
            <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 flex items-center gap-1.5">
              <Zap size={12} />
              AI Ready
            </div>
            <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-indigo-200 flex items-center gap-1.5">
              <Brain size={12} />
              RAG Enabled
            </div>
            <div className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-200 flex items-center gap-1.5">
              <History size={12} />
              History Saved
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid - 3 columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Conversation History */}
        <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
          <ConversationList 
            onSelectConversation={handleSelectConversation}
            selectedId={selectedConversation}
            refreshTrigger={convRefreshKey}
          />
        </div>

        {/* Middle Column - Chat Interface */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <ChatInterface 
            conversationId={selectedConversation}
            onConversationStart={handleConversationStart}
            isAgentView={isAgentMode}
          />
        </div>
        
        {/* Right Column - Documents */}
        <div className="lg:col-span-1 space-y-6 order-3">
          {/* Document Uploader */}
          <DocumentUploader onUploadComplete={handleUploadComplete} />
          
          {/* Document List */}
          <DocumentList refreshTrigger={docRefreshKey} />

          {/* Tips Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Brain size={16} className="text-indigo-500" />
              Tips
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2">
                <span className="text-indigo-500">•</span>
                Upload pet policies, lease terms, and FAQs
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500">•</span>
                Conversations are saved automatically
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500">•</span>
                Click a chat to continue the conversation
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500">•</span>
                Click &quot;Take Over&quot; to respond as a human agent
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
