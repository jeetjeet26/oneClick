'use client'

import { useState, useCallback, useRef } from 'react'
import { usePropertyContext } from '../layout/PropertyContext'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

type UploadResult = {
  filename: string
  chunks: number
  characters: number
}

export function DocumentUploader({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const { currentProperty } = usePropertyContext()
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (file: File) => {
    setStatus('uploading')
    setMessage(`Processing ${file.name}...`)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('propertyId', currentProperty.id)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setStatus('success')
      setMessage(`Successfully uploaded "${data.title}"`)
      setResult({
        filename: data.filename,
        chunks: data.chunks,
        characters: data.characters,
      })
      
      onUploadComplete?.()
      
      // Reset after 5 seconds
      setTimeout(() => {
        setStatus('idle')
        setMessage(null)
        setResult(null)
      }, 5000)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Upload failed')
    }
  }, [currentProperty.id, onUploadComplete])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleUpload(file)
    }
  }, [handleUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [handleUpload])

  const handleClick = () => {
    if (status !== 'uploading') {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Upload size={18} className="text-indigo-500" />
        Upload Documents
      </h3>

      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-50' 
            : status === 'success'
            ? 'border-emerald-300 bg-emerald-50'
            : status === 'error'
            ? 'border-red-300 bg-red-50'
            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
          }
          ${status === 'uploading' ? 'pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          onChange={handleFileSelect}
          className="hidden"
        />

        {status === 'uploading' ? (
          <div className="py-4">
            <Loader2 size={32} className="mx-auto text-indigo-500 animate-spin mb-3" />
            <p className="text-sm text-slate-600">{message}</p>
          </div>
        ) : status === 'success' ? (
          <div className="py-4">
            <CheckCircle size={32} className="mx-auto text-emerald-500 mb-3" />
            <p className="text-sm font-medium text-emerald-700">{message}</p>
            {result && (
              <p className="text-xs text-emerald-600 mt-1">
                {result.chunks} chunks • {result.characters.toLocaleString()} characters
              </p>
            )}
          </div>
        ) : status === 'error' ? (
          <div className="py-4">
            <AlertCircle size={32} className="mx-auto text-red-500 mb-3" />
            <p className="text-sm font-medium text-red-700">{message}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setStatus('idle')
                setMessage(null)
              }}
              className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="py-4">
            <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <FileText size={24} className="text-indigo-500" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">
              {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-slate-500">
              PDF, TXT, or MD files up to 10MB
            </p>
          </div>
        )}
      </div>

      {/* Help Text */}
      <p className="text-xs text-slate-500 mt-3">
        Documents are processed and stored in the knowledge base for AI-powered responses.
      </p>
    </div>
  )
}
