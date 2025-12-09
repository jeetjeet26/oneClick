'use client'

import { useState } from 'react'
import { X, Sparkles, Loader2, Wand2 } from 'lucide-react'

interface ResponseGeneratorProps {
  reviewId: string
  defaultTone?: 'professional' | 'empathetic' | 'friendly' | 'apologetic'
  onGenerated: () => void
  onClose: () => void
}

const toneOptions = [
  { 
    value: 'professional', 
    label: 'Professional', 
    description: 'Business-like and courteous',
    emoji: '👔'
  },
  { 
    value: 'empathetic', 
    label: 'Empathetic', 
    description: 'Understanding and supportive',
    emoji: '💜'
  },
  { 
    value: 'friendly', 
    label: 'Friendly', 
    description: 'Warm and personable',
    emoji: '😊'
  },
  { 
    value: 'apologetic', 
    label: 'Apologetic', 
    description: 'Sincere and accountable',
    emoji: '🙏'
  }
]

export function ResponseGenerator({ 
  reviewId, 
  defaultTone = 'professional',
  onGenerated, 
  onClose 
}: ResponseGeneratorProps) {
  const [selectedTone, setSelectedTone] = useState(defaultTone)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/reviewflow/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          tone: selectedTone
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate response')
      }

      onGenerated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Generate Response
                </h2>
                <p className="text-sm text-slate-500">
                  AI will craft a personalized reply
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Tone Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Response Tone
            </label>
            <div className="grid grid-cols-2 gap-3">
              {toneOptions.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => setSelectedTone(tone.value as typeof selectedTone)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    selectedTone === tone.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{tone.emoji}</span>
                    <span className={`font-medium ${
                      selectedTone === tone.value 
                        ? 'text-indigo-700 dark:text-indigo-300' 
                        : 'text-slate-900 dark:text-white'
                    }`}>
                      {tone.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tone.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong>AI-Powered:</strong> The response will be tailored to the review content, 
              sentiment, and your property&apos;s personality. You can edit before posting.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate Response
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

