'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2,
  Search,
  Grid,
  List,
  Image as ImageIcon,
  Video,
  Sparkles,
  Heart,
  MoreVertical,
  Download,
  Trash2,
  Tag,
  Folder,
  Filter,
  Plus
} from 'lucide-react'
import { AssetGeneratorModal } from './AssetGeneratorModal'

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

interface AssetGalleryProps {
  propertyId: string
  onSelectAsset?: (asset: ContentAsset) => void
  selectionMode?: boolean
}

const ASSET_TYPE_FILTERS = [
  { id: 'all', label: 'All', icon: Grid },
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'video', label: 'Videos', icon: Video },
]

export function AssetGallery({ propertyId, onSelectAsset, selectionMode = false }: AssetGalleryProps) {
  const [assets, setAssets] = useState<ContentAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [aiOnlyFilter, setAiOnlyFilter] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showGenerator, setShowGenerator] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<ContentAsset | null>(null)
  const [showMenu, setShowMenu] = useState<string | null>(null)

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets')
    } finally {
      setLoading(false)
    }
  }, [propertyId, typeFilter, aiOnlyFilter])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const handleToggleFavorite = async (asset: ContentAsset) => {
    try {
      await fetch('/api/forgestudio/assets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          isFavorite: !asset.is_favorite
        })
      })
      fetchAssets()
    } catch (err) {
      console.error('Error toggling favorite:', err)
    }
  }

  const handleDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    try {
      await fetch(`/api/forgestudio/assets?assetId=${assetId}`, {
        method: 'DELETE'
      })
      fetchAssets()
    } catch (err) {
      console.error('Error deleting asset:', err)
    }
  }

  const filteredAssets = assets.filter(asset => {
    if (favoritesOnly && !asset.is_favorite) return false
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

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Type Filters */}
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {ASSET_TYPE_FILTERS.map((filter) => {
                const Icon = filter.icon
                return (
                  <button
                    key={filter.id}
                    onClick={() => setTypeFilter(filter.id)}
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

            {/* Toggle Filters */}
            <button
              onClick={() => setAiOnlyFilter(!aiOnlyFilter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                aiOnlyFilter
                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI Generated
            </button>

            <button
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                favoritesOnly
                  ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Heart className="w-4 h-4" />
              Favorites
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets..."
                className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm w-48"
              />
            </div>

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

            <button
              onClick={() => setShowGenerator(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-amber-500/25"
            >
              <Plus className="w-4 h-4" />
              Generate
            </button>
          </div>
        </div>
      </div>

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
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <ImageIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No assets found
          </h3>
          <p className="text-slate-500 mb-4">
            {searchQuery ? 'Try adjusting your search' : 'Upload or generate some assets'}
          </p>
          <button
            onClick={() => setShowGenerator(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </button>
        </div>
      )}

      {/* Assets Grid */}
      {!loading && !error && filteredAssets.length > 0 && (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'space-y-3'
        }>
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => selectionMode ? onSelectAsset?.(asset) : setSelectedAsset(asset)}
              className={`group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
                viewMode === 'list' ? 'flex items-center gap-4 p-3' : ''
              }`}
            >
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

                {/* Favorite Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleFavorite(asset); }}
                  className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${
                    asset.is_favorite
                      ? 'bg-pink-500 text-white'
                      : 'bg-black/30 text-white opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${asset.is_favorite ? 'fill-current' : ''}`} />
                </button>
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
                </div>
                {asset.tags.length > 0 && viewMode === 'grid' && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {asset.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Menu */}
              <div className={`relative ${viewMode === 'list' ? '' : 'absolute bottom-3 right-3'}`}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(showMenu === asset.id ? null : asset.id); }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </button>
                
                {showMenu === asset.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={(e) => { e.stopPropagation(); setShowMenu(null); }}
                    />
                    <div className="absolute right-0 bottom-full mb-1 z-20 w-36 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-lg py-1">
                      <a
                        href={asset.file_url}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" /> Download
                      </a>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(asset.id); setShowMenu(null); }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generator Modal */}
      {showGenerator && (
        <AssetGeneratorModal
          propertyId={propertyId}
          onClose={() => setShowGenerator(false)}
          onGenerated={() => {
            fetchAssets()
            setShowGenerator(false)
          }}
        />
      )}

      {/* Asset Preview Modal */}
      {selectedAsset && !selectionMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setSelectedAsset(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedAsset.asset_type === 'video' ? (
              <video
                src={selectedAsset.file_url}
                controls
                autoPlay
                className="w-full max-h-[80vh] rounded-xl"
              />
            ) : (
              <img
                src={selectedAsset.file_url}
                alt={selectedAsset.name}
                className="w-full max-h-[80vh] object-contain rounded-xl"
              />
            )}
            <div className="mt-4 text-white text-center">
              <h3 className="font-medium">{selectedAsset.name}</h3>
              {selectedAsset.description && (
                <p className="text-sm text-slate-300 mt-1">{selectedAsset.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

