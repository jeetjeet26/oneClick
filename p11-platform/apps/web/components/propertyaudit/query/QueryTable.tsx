'use client'

import React, { useState, useMemo } from 'react'
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  Trash2, 
  Edit2, 
  ToggleLeft,
  ToggleRight,
  MoreHorizontal,
  ArrowUpDown,
  Download
} from 'lucide-react'
import { DeltaBadge, Sparkline } from '../charts'
import { ScoreBreakdown } from '../score'

export interface QueryRow {
  id: string
  text: string
  type: 'branded' | 'category' | 'comparison' | 'local' | 'faq'
  geo: string | null
  weight: number
  isActive: boolean
  // Score data (from latest run)
  presence?: boolean
  llmRank?: number | null
  linkRank?: number | null
  sov?: number | null
  score?: number
  breakdown?: {
    position: number
    link: number
    sov: number
    accuracy: number
  }
  // Delta from previous run
  deltas?: {
    scoreDelta: number | null
    presenceDelta: number
  }
  // Historical scores for sparkline
  history?: number[]
}

interface QueryTableProps {
  queries: QueryRow[]
  onDelete?: (id: string) => void
  onEdit?: (query: QueryRow) => void
  onToggleActive?: (id: string, isActive: boolean) => void
  onBulkDelete?: (ids: string[]) => void
  onExport?: () => void
}

type SortKey = 'text' | 'type' | 'presence' | 'llmRank' | 'score' | 'delta'
type SortDir = 'asc' | 'desc'
type GroupBy = 'none' | 'type' | 'presence'

const TYPE_COLORS: Record<string, string> = {
  branded: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  category: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  comparison: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  local: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  faq: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export function QueryTable({
  queries,
  onDelete,
  onEdit,
  onToggleActive,
  onBulkDelete,
  onExport
}: QueryTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null)
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']))
  const [showActions, setShowActions] = useState<string | null>(null)

  // Sorting
  const sortedQueries = useMemo(() => {
    if (!sort) return queries
    return [...queries].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      switch (sort.key) {
        case 'text':
          return a.text.localeCompare(b.text) * dir
        case 'type':
          return a.type.localeCompare(b.type) * dir
        case 'presence':
          return ((a.presence ? 1 : 0) - (b.presence ? 1 : 0)) * dir
        case 'llmRank':
          const av = a.llmRank ?? Infinity
          const bv = b.llmRank ?? Infinity
          return (av - bv) * dir
        case 'score':
          return ((a.score ?? 0) - (b.score ?? 0)) * dir
        case 'delta':
          return ((a.deltas?.scoreDelta ?? 0) - (b.deltas?.scoreDelta ?? 0)) * dir
        default:
          return 0
      }
    })
  }, [queries, sort])

  // Grouping
  const groupedQueries = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Queries', items: sortedQueries }]
    }

    const groups = new Map<string, QueryRow[]>()
    sortedQueries.forEach((q) => {
      let key: string
      if (groupBy === 'type') {
        key = q.type
      } else if (groupBy === 'presence') {
        key = q.presence ? 'present' : 'absent'
      } else {
        key = 'all'
      }
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(q)
    })

    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label: groupBy === 'type' 
        ? key.charAt(0).toUpperCase() + key.slice(1)
        : key === 'present' ? 'With Presence' : 'No Presence',
      items
    }))
  }, [sortedQueries, groupBy])

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'desc' }
      if (prev.dir === 'desc') return { key, dir: 'asc' }
      return null
    })
  }

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === queries.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(queries.map(q => q.id)))
    }
  }

  const handleBulkDelete = () => {
    if (selectedIds.size > 0 && onBulkDelete) {
      onBulkDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }

  const exportCSV = () => {
    const rows = sortedQueries.map((q) => ({
      Query: q.text,
      Type: q.type,
      Active: q.isActive ? 'Yes' : 'No',
      Presence: q.presence ? 'Yes' : 'No',
      'LLM Rank': q.llmRank ?? '',
      Score: q.score?.toFixed(1) ?? '',
      'Score Delta': q.deltas?.scoreDelta?.toFixed(1) ?? ''
    }))
    const header = Object.keys(rows[0] ?? {}).join(',')
    const csv = [header, ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'queries_export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (!sort || sort.key !== columnKey) {
      return <ArrowUpDown className="w-3 h-3 opacity-40" />
    }
    return sort.dir === 'asc' 
      ? <ChevronUp className="w-3 h-3" /> 
      : <ChevronDown className="w-3 h-3" />
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs"
          >
            <option value="none">No grouping</option>
            <option value="type">Group by Type</option>
            <option value="presence">Group by Presence</option>
          </select>

          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 rounded-md bg-red-100 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
            >
              <Trash2 className="w-3 h-3" />
              Delete ({selectedIds.size})
            </button>
          )}
        </div>

        <button
          onClick={onExport || exportCSV}
          className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Download className="w-3 h-3" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-left">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size === queries.length && queries.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-3 py-3">
                <button 
                  onClick={() => toggleSort('text')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase"
                >
                  Query <SortIcon columnKey="text" />
                </button>
              </th>
              <th className="px-3 py-3">
                <button 
                  onClick={() => toggleSort('type')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase"
                >
                  Type <SortIcon columnKey="type" />
                </button>
              </th>
              <th className="px-3 py-3 text-right">
                <button 
                  onClick={() => toggleSort('presence')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase"
                >
                  Presence <SortIcon columnKey="presence" />
                </button>
              </th>
              <th className="px-3 py-3 text-right">
                <button 
                  onClick={() => toggleSort('llmRank')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase"
                >
                  LLM Rank <SortIcon columnKey="llmRank" />
                </button>
              </th>
              <th className="px-3 py-3 text-right">
                <button 
                  onClick={() => toggleSort('score')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase"
                >
                  Score <SortIcon columnKey="score" />
                </button>
              </th>
              <th className="px-3 py-3 text-right">
                <button 
                  onClick={() => toggleSort('delta')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase"
                >
                  Δ <SortIcon columnKey="delta" />
                </button>
              </th>
              <th className="w-12 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {groupedQueries.map((group) => (
              <React.Fragment key={group.key}>
                {groupBy !== 'none' && (
                  <tr 
                    className="bg-gray-50/50 dark:bg-gray-800/50"
                  >
                    <td colSpan={8} className="px-3 py-2">
                      <button
                        onClick={() => toggleGroup(group.key)}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {expandedGroups.has(group.key) 
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />
                        }
                        {group.label} ({group.items.length})
                      </button>
                    </td>
                  </tr>
                )}
                {(groupBy === 'none' || expandedGroups.has(group.key)) && group.items.map((query) => (
                  <tr 
                    key={query.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!query.isActive ? 'opacity-50' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(query.id)}
                        onChange={() => toggleSelect(query.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="max-w-md">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {query.text}
                        </p>
                        {query.geo && (
                          <p className="text-xs text-gray-500 mt-0.5">{query.geo}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[query.type]}`}>
                        {query.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 ${query.presence ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`h-2 w-2 rounded-full ${query.presence ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {query.presence ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`font-medium ${query.llmRank && query.llmRank <= 3 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                        {query.llmRank ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {query.score !== undefined && query.breakdown ? (
                        <ScoreBreakdown score={query.score} breakdown={query.breakdown} compact />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DeltaBadge value={query.deltas?.scoreDelta} showZero />
                        {query.history && query.history.length > 1 && (
                          <Sparkline 
                            values={query.history} 
                            width={40} 
                            height={16}
                            strokeColor={
                              (query.deltas?.scoreDelta ?? 0) > 0 
                                ? '#22c55e' 
                                : (query.deltas?.scoreDelta ?? 0) < 0 
                                  ? '#ef4444' 
                                  : '#6b7280'
                            }
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="relative">
                        <button
                          onClick={() => setShowActions(showActions === query.id ? null : query.id)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <MoreHorizontal className="w-4 h-4 text-gray-500" />
                        </button>
                        {showActions === query.id && (
                          <div className="absolute right-0 z-10 mt-1 w-36 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                            {onEdit && (
                              <button
                                onClick={() => { onEdit(query); setShowActions(null) }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </button>
                            )}
                            {onToggleActive && (
                              <button
                                onClick={() => { onToggleActive(query.id, !query.isActive); setShowActions(null) }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                {query.isActive 
                                  ? <><ToggleLeft className="w-3.5 h-3.5" /> Deactivate</>
                                  : <><ToggleRight className="w-3.5 h-3.5" /> Activate</>
                                }
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={() => { onDelete(query.id); setShowActions(null) }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {queries.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No queries found. Generate a query panel to get started.
          </div>
        )}
      </div>
    </div>
  )
}
