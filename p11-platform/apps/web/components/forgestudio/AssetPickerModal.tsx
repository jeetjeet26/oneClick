'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Loader2,
  Search,
  Image as ImageIcon,
  Video,
  Sparkles,
  Check,
  Grid,
  List,
  Filter
} from 'lucide-react'

interface ContentAsset {
  id: string
  name: string
  description: string | null
  asset_type: 'image' | 'video' | 'gif' | 'audio'
  file_url: string
  thumbnail_url: string | null
  file_size_bytes: number | null
  width: number | null
  height: number | null
  duration_seconds: number | null
  format: string | null
  is_ai_generated: boolean
  generation_provider: string | null
  generation_prompt: string | null
  tags: string[]
  folder: string | null
  is_favorite: boolean
  usage_count: number
  created_at: string
}

interface AssetPickerModalProps {
  propertyId: string
  onClose: () => void
  onSelect: (asset: ContentAsset) => void
  filterType?: 'image' | 'video' | 'all'
  title?: string
  selectedAssetId?: string
}

const ASSET_TYPE_FILTERS = [
  { id: 'all', label: 'All', icon: Grid },
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'video', label: 'Videos', icon: Video },
]

export function AssetPickerModal({
  propertyId,
  onClose,
  onSelect,
  filterType = 'all',
  title = 'Select Asset',
  selectedAssetId
}: AssetPickerModalProps) {
  const [assets, setAssets] = useState<ContentAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState(filterType)
  const [aiOnlyFilter, setAiOnlyFilter] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedAsset, setSelectedAsset] = useState<ContentAsset | null>(null)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ propertyId })
      if (typeFilter !== 'all') {
        params.append('assetType', typeFilter)
      }
      if (aiOnlyFilter) {
        params.append('aiGenerated', 'true')
      }

      const res = await fetch(`/api/forgestudio/assets?${params}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch assets')
      }

      setAssets(data.assets || [])
      
      // Pre-select asset if provided
      if (selectedAssetId) {
        const preSelected = (data.assets || []).find((a: ContentAsset) => a.id === selectedAssetId)
        if (preSelected) setSelectedAsset(preSelected)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets')
    } finally {
      setLoading(false)
    }
  }, [propertyId, typeFilter, aiOnlyFilter, selectedAssetId])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const filteredAssets = assets.filter(asset => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        asset.name.toLowerCase().includes(query) ||
        asset.description?.toLowerCase().includes(query) ||
        asset.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }
    return true
  })

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleConfirm = () => {
    if (selectedAsset) {
      onSelect(selectedAsset)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] mx-4 flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-violet-500" />
              {title}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Choose an asset from your library to attach to this post
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
          {/* Type Filters */}
          <div className="flex gap-1">
            {ASSET_TYPE_FILTERS.map((filter) => {
              const Icon = filter.icon
              return (
                <button
                  key={filter.id}
                  onClick={() => setTypeFilter(filter.id as 'all' | 'image' | 'video')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    typeFilter === filter.id
                      ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {filter.label}
                </button>
              )
            })}
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

          {/* AI Filter */}
          <button
            onClick={() => setAiOnlyFilter(!aiOnlyFilter)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              aiOnlyFilter
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI Only
          </button>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm w-48 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* View Mode */}
          <div className="flex items-center border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-600' : 'text-slate-400'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-600' : 'text-slate-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredAssets.length === 0 && (
            <div className="text-center py-12">
              <ImageIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No assets found
              </h3>
              <p className="text-slate-500">
                {searchQuery ? 'Try adjusting your search' : 'Generate some assets first in the Assets tab'}
              </p>
            </div>
          )}

          {/* Assets Grid */}
          {!loading && !error && filteredAssets.length > 0 && (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                : 'space-y-3'
            }>
              {filteredAssets.map((asset) => {
                const isSelected = selectedAsset?.id === asset.id
                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`group relative bg-white dark:bg-slate-800 rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'border-violet-500 ring-2 ring-violet-500/20 shadow-lg'
                        : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-md'
                    } ${viewMode === 'list' ? 'flex items-center gap-4 p-3' : ''}`}
                  >
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}

                    {/* Thumbnail */}
                    <div className={`relative bg-slate-100 dark:bg-slate-700 ${
                      viewMode === 'grid' ? 'aspect-square' : 'w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden'
                    }`}>
                      {asset.asset_type === 'video' ? (
                        <video
                          src={asset.file_url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={asset.thumbnail_url || asset.file_url}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Type Badge */}
                      {viewMode === 'grid' && (
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          {asset.asset_type === 'video' && (
                            <span className="px-2 py-0.5 bg-black/50 text-white text-xs rounded-full flex items-center gap-1">
                              <Video className="w-3 h-3" />
                            </span>
                          )}
                          {asset.is_ai_generated && (
                            <span className="px-2 py-0.5 bg-violet-500/80 text-white text-xs rounded-full flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className={viewMode === 'grid' ? 'p-3' : 'flex-1 min-w-0'}>
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm truncate">
                        {asset.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        {asset.width && asset.height && (
                          <span>{asset.width}×{asset.height}</span>
                        )}
                        {asset.file_size_bytes && (
                          <span>{formatFileSize(asset.file_size_bytes)}</span>
                        )}
                        {asset.duration_seconds && (
                          <span>{Math.round(asset.duration_seconds)}s</span>
                        )}
                        {viewMode === 'list' && asset.is_ai_generated && (
                          <span className="flex items-center gap-1 text-violet-500">
                            <Sparkles className="w-3 h-3" /> AI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="text-sm text-slate-500">
            {selectedAsset ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Selected: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedAsset.name}</span>
              </span>
            ) : (
              'Click an asset to select it'
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedAsset}
              className="px-5 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
            >
              Attach to Post
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

