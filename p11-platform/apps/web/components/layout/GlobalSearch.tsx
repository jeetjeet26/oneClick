'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  X,
  User,
  Building2,
  FileText,
  MessageSquare,
  BarChart3,
  Sparkles,
  ChevronRight,
  Loader2,
  Command
} from 'lucide-react'

interface SearchResult {
  id: string
  type: 'lead' | 'property' | 'document' | 'conversation' | 'page'
  title: string
  subtitle?: string
  url: string
  icon: typeof User
  meta?: string
}

const QUICK_LINKS: SearchResult[] = [
  { id: 'overview', type: 'page', title: 'Overview Dashboard', url: '/dashboard', icon: BarChart3 },
  { id: 'leads', type: 'page', title: 'TourSpark Leads', url: '/dashboard/leads', icon: Sparkles },
  { id: 'luma', type: 'page', title: 'LumaLeasing Chat', url: '/dashboard/luma', icon: MessageSquare },
  { id: 'bi', type: 'page', title: 'MultiChannel BI', url: '/dashboard/bi', icon: BarChart3 },
  { id: 'property', type: 'page', title: 'Property', url: '/dashboard/community', icon: Building2 },
]

export function GlobalSearch() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      // Close with Escape
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(QUICK_LINKS)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      
      if (data.results) {
        setResults(data.results.map((r: any) => ({
          ...r,
          icon: getIconForType(r.type)
        })))
      }
    } catch (err) {
      console.error('Search error:', err)
      // Fall back to filtered quick links
      const filtered = QUICK_LINKS.filter(link => 
        link.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setResults(filtered)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  // Handle navigation in results
  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      navigateTo(results[selectedIndex])
    }
  }

  const navigateTo = (result: SearchResult) => {
    router.push(result.url)
    setIsOpen(false)
    setQuery('')
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'lead': return User
      case 'property': return Building2
      case 'document': return FileText
      case 'conversation': return MessageSquare
      default: return Search
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
      >
        <Search size={16} />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded text-xs font-medium text-slate-400 border border-slate-200 dark:border-slate-600">
          <Command size={10} />K
        </kbd>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 top-[15vh] z-50 mx-auto max-w-xl">
        <div 
          ref={containerRef}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Search Input */}
          <div className="flex items-center px-4 border-b border-slate-200 dark:border-slate-700">
            <Search size={20} className="text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleKeyNavigation}
              placeholder="Search leads, properties, documents..."
              className="flex-1 px-3 py-4 bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
            />
            {loading && <Loader2 size={18} className="text-slate-400 animate-spin" />}
            {query && !loading && (
              <button
                onClick={() => setQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X size={16} />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="ml-2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
            >
              <kbd className="text-xs font-medium">ESC</kbd>
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {results.length === 0 && query && !loading ? (
              <div className="px-4 py-8 text-center">
                <Search size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500">No results found for "{query}"</p>
                <p className="text-sm text-slate-400 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="py-2">
                {!query && (
                  <div className="px-3 py-1.5">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Quick Links
                    </span>
                  </div>
                )}
                {results.map((result, index) => {
                  const Icon = result.icon
                  const isSelected = index === selectedIndex
                  
                  return (
                    <button
                      key={result.id}
                      onClick={() => navigateTo(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected 
                          ? 'bg-indigo-50 dark:bg-indigo-900/30' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        isSelected 
                          ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${
                          isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'
                        }`}>
                          {result.title}
                        </p>
                        {result.subtitle && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      {result.meta && (
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          {result.meta}
                        </span>
                      )}
                      <ChevronRight size={16} className={`flex-shrink-0 ${
                        isSelected ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'
                      }`} />
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">↵</kbd>
                to select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">esc</kbd>
              to close
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

