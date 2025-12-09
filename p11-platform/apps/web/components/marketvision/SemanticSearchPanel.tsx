'use client'

/**
 * Semantic Search Panel Component
 * Natural language search across competitor content
 */

import React, { useState, useCallback } from 'react'
import { SemanticSearchResult } from './types'

interface SemanticSearchPanelProps {
  propertyId: string
  competitorIds?: string[]
}

export function SemanticSearchPanel({ 
  propertyId,
  competitorIds 
}: SemanticSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SemanticSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch('/api/marketvision/brand-intelligence/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          propertyId,
          competitorIds,
          limit: 10
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [query, propertyId, competitorIds])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const exampleQueries = [
    "How do competitors talk about pet policies?",
    "What move-in specials are being offered?",
    "How do they market their fitness amenities?",
    "What sustainability features do they highlight?",
    "How do competitors describe their location benefits?"
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Competitive Intelligence Search
        </h3>
        <p className="text-sm text-gray-600">
          Ask questions in natural language to find insights across competitor websites
        </p>
      </div>

      {/* Search Input */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., How do competitors promote their pools?"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Searching...
              </span>
            ) : (
              'Search'
            )}
          </button>
        </div>

        {/* Example Queries */}
        {!hasSearched && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Try searching for:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(example)}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="p-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-600">Searching competitor content...</p>
            </div>
          </div>
        )}

        {!isLoading && hasSearched && results.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <h4 className="text-lg font-medium text-gray-900 mb-1">No results found</h4>
            <p className="text-sm text-gray-600">
              Try a different search query or make sure competitors have been analyzed
            </p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Found {results.length} relevant results
            </p>

            {results.map((result) => (
              <div 
                key={result.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-medium text-gray-900">
                      {result.competitorName}
                    </span>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className="text-sm text-gray-500 capitalize">
                      {result.pageType} page
                    </span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                    {Math.round(result.similarity * 100)}% match
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 leading-relaxed">
                  {result.content.length > 500 
                    ? `${result.content.slice(0, 500)}...` 
                    : result.content
                  }
                </p>

                {result.pageUrl && (
                  <a 
                    href={result.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-blue-600 hover:underline"
                  >
                    View source ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {!hasSearched && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">💡</div>
            <p className="text-sm">
              Enter a question above to search competitor content
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

