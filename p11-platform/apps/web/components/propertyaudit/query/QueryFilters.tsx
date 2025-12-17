'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { X, Filter } from 'lucide-react'
import type { QueryRow } from './QueryTable'

interface QueryFiltersProps {
  queries: QueryRow[]
  onFilteredChange?: (filtered: QueryRow[]) => void
}

interface FilterPillsProps {
  label: string
  options: { value: string; label: string; icon?: string }[]
  value: string
  onChange: (value: string) => void
}

function FilterPills({ label, options, value, onChange }: FilterPillsProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              value === option.value
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {option.icon && <span>{option.icon}</span>}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function QueryFilters({ queries, onFilteredChange }: QueryFiltersProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all')
  const [presenceFilter, setPresenceFilter] = useState(searchParams.get('presence') || 'all')
  const [activeFilter, setActiveFilter] = useState(searchParams.get('active') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'score')

  const filteredAndSorted = useMemo(() => {
    let filtered = [...queries]

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((q) => q.type === typeFilter)
    }

    // Presence filter
    if (presenceFilter === 'yes') {
      filtered = filtered.filter((q) => q.presence === true)
    } else if (presenceFilter === 'no') {
      filtered = filtered.filter((q) => q.presence === false)
    }

    // Active filter
    if (activeFilter === 'active') {
      filtered = filtered.filter((q) => q.isActive)
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter((q) => !q.isActive)
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'delta':
          return (b.deltas?.scoreDelta ?? 0) - (a.deltas?.scoreDelta ?? 0)
        case 'score':
          return (b.score ?? 0) - (a.score ?? 0)
        case 'presence':
          return (b.presence ? 1 : 0) - (a.presence ? 1 : 0)
        case 'type':
          return a.type.localeCompare(b.type)
        case 'text':
          return a.text.localeCompare(b.text)
        default:
          return 0
      }
    })

    return filtered
  }, [queries, typeFilter, presenceFilter, activeFilter, sortBy])

  // Sync with parent
  useEffect(() => {
    onFilteredChange?.(filteredAndSorted)
  }, [filteredAndSorted, onFilteredChange])

  // Update URL params
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || (key === 'sort' && value === 'score')) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const uniqueTypes = Array.from(new Set(queries.map((q) => q.type)))
  const activeFilterCount = [typeFilter, presenceFilter, activeFilter]
    .filter((f) => f !== 'all').length

  const clearAll = () => {
    setTypeFilter('all')
    setPresenceFilter('all')
    setActiveFilter('all')
    router.push('?', { scroll: false })
  }

  const typeOptions = [
    { value: 'all', label: 'All' },
    ...uniqueTypes.map((type) => ({ 
      value: type, 
      label: type.charAt(0).toUpperCase() + type.slice(1) 
    }))
  ]

  const presenceOptions = [
    { value: 'all', label: 'All' },
    { value: 'yes', label: 'Present', icon: '✓' },
    { value: 'no', label: 'Absent', icon: '✗' }
  ]

  const activeOptions = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]

  const sortOptions = [
    { value: 'score', label: 'Score' },
    { value: 'delta', label: 'Score Δ' },
    { value: 'presence', label: 'Presence' },
    { value: 'type', label: 'Type' },
    { value: 'text', label: 'Name' }
  ]

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <Filter className="w-4 h-4" />
          Filters
        </h3>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-3 h-3" />
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FilterPills
          label="Type"
          options={typeOptions}
          value={typeFilter}
          onChange={(value) => {
            setTypeFilter(value)
            updateFilter('type', value)
          }}
        />

        <FilterPills
          label="Presence"
          options={presenceOptions}
          value={presenceFilter}
          onChange={(value) => {
            setPresenceFilter(value)
            updateFilter('presence', value)
          }}
        />

        <FilterPills
          label="Status"
          options={activeOptions}
          value={activeFilter}
          onChange={(value) => {
            setActiveFilter(value)
            updateFilter('active', value)
          }}
        />

        <FilterPills
          label="Sort by"
          options={sortOptions}
          value={sortBy}
          onChange={(value) => {
            setSortBy(value)
            updateFilter('sort', value)
          }}
        />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 text-xs text-gray-500">
        Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredAndSorted.length}</span> of{' '}
        <span className="font-semibold text-gray-900 dark:text-white">{queries.length}</span> queries
      </div>
    </div>
  )
}
