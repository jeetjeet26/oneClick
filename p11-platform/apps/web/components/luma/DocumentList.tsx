'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePropertyContext } from '../layout/PropertyContext'
import { FileText, Trash2, RefreshCw, ChevronRight, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type Document = {
  id: string
  title: string
  source: string
  chunks: number
  created_at: string
  preview: string
}

export function DocumentList({ refreshTrigger }: { refreshTrigger?: number }) {
  const { currentProperty } = usePropertyContext()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    if (!currentProperty?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/documents?propertyId=${currentProperty.id}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch documents')
      }
      
      setDocuments(data.documents || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [currentProperty?.id])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments, refreshTrigger])

  const handleDelete = async (source: string) => {
    if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      return
    }

    setDeletingId(source)
    
    try {
      const response = await fetch(
        `/api/documents?source=${encodeURIComponent(source)}&propertyId=${currentProperty.id}`,
        { method: 'DELETE' }
      )
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Delete failed')
      }
      
      // Remove from local state
      setDocuments(prev => prev.filter(d => d.source !== source))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete document')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Knowledge Base</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="h-8 w-8 bg-slate-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Knowledge Base</h3>
          <button
            onClick={fetchDocuments}
            className="text-slate-500 hover:text-slate-700 p-1"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="text-center py-6">
          <AlertCircle size={32} className="mx-auto text-red-400 mb-2" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">
          Knowledge Base
          {documents.length > 0 && (
            <span className="ml-2 text-xs font-normal text-slate-500">
              ({documents.length} document{documents.length !== 1 ? 's' : ''})
            </span>
          )}
        </h3>
        <button
          onClick={fetchDocuments}
          className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 px-4">
          <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <FileText size={24} className="text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 mb-1">No documents yet</p>
          <p className="text-xs text-slate-400">
            Upload PDFs or text files to build your knowledge base
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div
              key={doc.source}
              className="group border border-slate-100 rounded-lg hover:border-slate-200 transition-colors"
            >
              <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpandedId(expandedId === doc.source ? null : doc.source)}
              >
                <div className="h-9 w-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {doc.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {doc.chunks} chunks • {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                  </p>
                </div>
                <ChevronRight 
                  size={16} 
                  className={`text-slate-400 transition-transform ${
                    expandedId === doc.source ? 'rotate-90' : ''
                  }`} 
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(doc.source)
                  }}
                  disabled={deletingId === doc.source}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all disabled:opacity-50"
                  title="Delete document"
                >
                  {deletingId === doc.source ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
              
              {expandedId === doc.source && (
                <div className="px-3 pb-3">
                  <div className="bg-slate-50 rounded-md p-3 text-xs text-slate-600">
                    <p className="font-medium text-slate-700 mb-1">Preview:</p>
                    <p className="line-clamp-4">{doc.preview}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

