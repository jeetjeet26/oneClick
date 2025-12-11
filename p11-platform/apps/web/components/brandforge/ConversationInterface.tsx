'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ConversationInterfaceProps {
  propertyId: string
  competitiveContext: any
  onComplete: (brandAssetId: string) => void
}

export function ConversationInterface({ 
  propertyId, 
  competitiveContext,
  onComplete 
}: ConversationInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [brandAssetId, setBrandAssetId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasStartedRef = useRef(false)
  const isSendingRef = useRef(false)

  // Start conversation on mount (with guard for React StrictMode)
  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true
    startConversation()
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-focus input when not loading
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isLoading, messages])

  async function startConversation() {
    if (isLoading) return
    setIsLoading(true)

    try {
      const res = await fetch('/api/brandforge/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          action: 'start',
          competitiveContext
        })
      })

      if (!res.ok) {
        console.error('Start conversation failed:', res.status, await res.text())
        return
      }

      const data = await res.json()
      setBrandAssetId(data.brandAssetId)
      setMessages(data.conversationHistory || [])
    } catch (err) {
      console.error('Failed to start conversation:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function sendMessage() {
    // Guard against double submission
    if (!input.trim() || !brandAssetId || isLoading || isSendingRef.current) return
    
    isSendingRef.current = true
    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message immediately (optimistic update)
    const updatedMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(updatedMessages)

    try {
      const res = await fetch('/api/brandforge/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          brandAssetId,
          action: 'message',
          message: userMessage,
          conversationHistory: updatedMessages
        })
      })

      const data = await res.json()
      setMessages(data.conversationHistory || [])

      // Check if conversation is complete
      if (data.status === 'ready_to_generate') {
        setTimeout(() => onComplete(brandAssetId), 1000)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setIsLoading(false)
      isSendingRef.current = false
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-900">Brand Strategist (Gemini 3)</h3>
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Let's create your brand strategy together
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-lg px-4 py-2">
              <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your response..."
            disabled={isLoading}
            autoFocus
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 bg-white text-slate-900 placeholder-slate-400"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}


