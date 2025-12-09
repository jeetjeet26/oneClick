'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2, ChevronDown } from 'lucide-react'
import { downloadCSV, downloadPDF, type ExportData } from '@/utils/export'

type ExportButtonProps = {
  getData: () => ExportData | null
  disabled?: boolean
  className?: string
}

export function ExportButton({ getData, disabled = false, className = '' }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExport = async (format: 'csv' | 'pdf') => {
    const data = getData()
    if (!data) {
      console.error('No data to export')
      return
    }

    setExporting(format)
    
    // Small delay for UX (shows loading state)
    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      if (format === 'csv') {
        downloadCSV(data)
      } else {
        downloadPDF(data)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(null)
      setIsOpen(false)
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || exporting !== null}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all
          ${disabled || exporting !== null
            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }
        `}
      >
        {exporting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        <span className="hidden sm:inline">Export</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Export Format</p>
          </div>
          
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              {exporting === 'csv' ? (
                <Loader2 size={16} className="text-emerald-600 animate-spin" />
              ) : (
                <FileSpreadsheet size={16} className="text-emerald-600" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">CSV Spreadsheet</p>
              <p className="text-xs text-slate-500">Open in Excel, Sheets</p>
            </div>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
              {exporting === 'pdf' ? (
                <Loader2 size={16} className="text-red-600 animate-spin" />
              ) : (
                <FileText size={16} className="text-red-600" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">PDF Report</p>
              <p className="text-xs text-slate-500">Formatted document</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

