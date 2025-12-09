'use client'

import { useState } from 'react'
import { 
  X, Upload, Loader2, FileText, Globe, Check, AlertCircle,
  ChevronRight
} from 'lucide-react'
import { PlatformIcon } from './PlatformIcon'

interface ImportReviewsModalProps {
  propertyId: string
  onClose: () => void
  onImported: () => void
}

type ImportMethod = 'manual' | 'csv' | 'google' | 'yelp'
type ImportStep = 'select' | 'configure' | 'importing' | 'complete'

interface ManualReview {
  platform: string
  reviewerName: string
  rating: number
  reviewText: string
  reviewDate: string
}

const PLATFORMS = [
  { id: 'google', name: 'Google', icon: Globe, color: 'text-blue-500' },
  { id: 'yelp', name: 'Yelp', icon: Globe, color: 'text-red-500' },
  { id: 'apartments_com', name: 'Apartments.com', icon: Globe, color: 'text-green-500' },
  { id: 'facebook', name: 'Facebook', icon: Globe, color: 'text-blue-600' },
]

export function ImportReviewsModal({ propertyId, onClose, onImported }: ImportReviewsModalProps) {
  const [step, setStep] = useState<ImportStep>('select')
  const [method, setMethod] = useState<ImportMethod | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)
  
  // Manual entry
  const [manualReview, setManualReview] = useState<ManualReview>({
    platform: 'google',
    reviewerName: '',
    rating: 5,
    reviewText: '',
    reviewDate: new Date().toISOString().split('T')[0]
  })
  
  // CSV upload
  const [csvFile, setCsvFile] = useState<File | null>(null)
  
  // Google connection
  const [googlePlaceId, setGooglePlaceId] = useState('')
  const [googleConnected, setGoogleConnected] = useState(false)

  const handleMethodSelect = (selectedMethod: ImportMethod) => {
    setMethod(selectedMethod)
    setStep('configure')
  }

  const handleManualSubmit = async () => {
    if (!manualReview.reviewText.trim()) {
      setError('Review text is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/reviewflow/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          platform: manualReview.platform,
          reviewerName: manualReview.reviewerName || null,
          rating: manualReview.rating,
          reviewText: manualReview.reviewText,
          reviewDate: manualReview.reviewDate
        })
      })

      if (!res.ok) {
        throw new Error('Failed to import review')
      }

      // Auto-analyze the review
      const data = await res.json()
      await fetch('/api/reviewflow/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: data.review.id })
      })

      setImportedCount(1)
      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCsvUpload = async () => {
    if (!csvFile) {
      setError('Please select a CSV file')
      return
    }

    setLoading(true)
    setStep('importing')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('propertyId', propertyId)

      const res = await fetch('/api/reviewflow/import', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'CSV import failed')
      }

      const data = await res.json()
      setImportedCount(data.imported || 0)
      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setStep('configure')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleConnect = async () => {
    if (!googlePlaceId.trim()) {
      setError('Google Place ID is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Save the connection
      const res = await fetch('/api/reviewflow/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          platform: 'google',
          placeId: googlePlaceId
        })
      })

      if (!res.ok) {
        throw new Error('Failed to connect Google')
      }

      setGoogleConnected(true)

      // Trigger initial sync
      setStep('importing')
      const syncRes = await fetch('/api/reviewflow/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          platform: 'google'
        })
      })

      if (syncRes.ok) {
        const syncData = await syncRes.json()
        setImportedCount(syncData.imported || 0)
      }

      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (step) {
      case 'select':
        return (
          <div className="space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              Choose how you want to import reviews into ReviewFlow:
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleMethodSelect('manual')}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-rose-300 dark:hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all text-left group"
              >
                <FileText className="w-8 h-8 text-rose-500 mb-3" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Manual Entry</h3>
                <p className="text-sm text-slate-500 mt-1">Add reviews one at a time</p>
              </button>
              
              <button
                onClick={() => handleMethodSelect('csv')}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-rose-300 dark:hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all text-left group"
              >
                <Upload className="w-8 h-8 text-rose-500 mb-3" />
                <h3 className="font-semibold text-slate-900 dark:text-white">CSV Upload</h3>
                <p className="text-sm text-slate-500 mt-1">Bulk import from spreadsheet</p>
              </button>
              
              <button
                onClick={() => handleMethodSelect('google')}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-rose-300 dark:hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all text-left group"
              >
                <Globe className="w-8 h-8 text-blue-500 mb-3" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Google Business</h3>
                <p className="text-sm text-slate-500 mt-1">Connect & sync automatically</p>
              </button>
              
              <button
                onClick={() => handleMethodSelect('yelp')}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-rose-300 dark:hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all text-left group opacity-50 cursor-not-allowed"
                disabled
              >
                <Globe className="w-8 h-8 text-red-500 mb-3" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Yelp</h3>
                <p className="text-sm text-slate-500 mt-1">Coming soon</p>
              </button>
            </div>
          </div>
        )

      case 'configure':
        if (method === 'manual') {
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setStep('select')} className="text-slate-400 hover:text-slate-600">
                  Import
                </button>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="text-slate-900 dark:text-white font-medium">Manual Entry</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Platform
                </label>
                <div className="flex gap-2">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => setManualReview({ ...manualReview, platform: platform.id })}
                      className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                        manualReview.platform === platform.id
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10'
                          : 'border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <PlatformIcon platform={platform.id} size={16} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Reviewer Name (optional)
                  </label>
                  <input
                    type="text"
                    value={manualReview.reviewerName}
                    onChange={(e) => setManualReview({ ...manualReview, reviewerName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                    placeholder="John D."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Rating
                  </label>
                  <select
                    value={manualReview.rating}
                    onChange={(e) => setManualReview({ ...manualReview, rating: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>{r} Stars</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Review Date
                </label>
                <input
                  type="date"
                  value={manualReview.reviewDate}
                  onChange={(e) => setManualReview({ ...manualReview, reviewDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Review Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={manualReview.reviewText}
                  onChange={(e) => setManualReview({ ...manualReview, reviewText: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 resize-none"
                  placeholder="Paste the review content here..."
                />
              </div>

              <button
                onClick={handleManualSubmit}
                disabled={loading || !manualReview.reviewText.trim()}
                className="w-full py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                ) : (
                  <>Import Review</>
                )}
              </button>
            </div>
          )
        }

        if (method === 'csv') {
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setStep('select')} className="text-slate-400 hover:text-slate-600">
                  Import
                </button>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="text-slate-900 dark:text-white font-medium">CSV Upload</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <h4 className="font-medium text-slate-900 dark:text-white mb-2">CSV Format Requirements</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Your CSV file should have the following columns:
                </p>
                <code className="block bg-white dark:bg-slate-900 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-300">
                  platform, reviewer_name, rating, review_text, review_date
                </code>
              </div>

              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
                {csvFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-rose-500" />
                    <div className="text-left">
                      <p className="font-medium text-slate-900 dark:text-white">{csvFile.name}</p>
                      <p className="text-sm text-slate-500">{(csvFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={() => setCsvFile(null)}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 dark:text-slate-400 mb-2">
                      Drag & drop your CSV file here, or
                    </p>
                    <label className="inline-block px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      />
                      Browse Files
                    </label>
                  </>
                )}
              </div>

              <button
                onClick={handleCsvUpload}
                disabled={loading || !csvFile}
                className="w-full py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                ) : (
                  <>Upload & Import</>
                )}
              </button>
            </div>
          )
        }

        if (method === 'google') {
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setStep('select')} className="text-slate-400 hover:text-slate-600">
                  Import
                </button>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="text-slate-900 dark:text-white font-medium">Google Business</span>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Connect Google Business Profile
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Enter your Google Place ID to automatically sync reviews. You can find this in your Google Business Profile settings or by searching your business on Google Maps.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Google Place ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={googlePlaceId}
                  onChange={(e) => setGooglePlaceId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                  placeholder="ChIJ..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  Looks like: ChIJN1t_tDeuEmsRUsoyG83frY4
                </p>
              </div>

              {googleConnected && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg">
                  <Check className="w-5 h-5" />
                  Google Business connected successfully!
                </div>
              )}

              <button
                onClick={handleGoogleConnect}
                disabled={loading || !googlePlaceId.trim()}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                ) : (
                  <>Connect & Sync Reviews</>
                )}
              </button>
            </div>
          )
        }

        return null

      case 'importing':
        return (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 animate-spin text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Importing Reviews...
            </h3>
            <p className="text-slate-500">
              This may take a moment. Please don&apos;t close this window.
            </p>
          </div>
        )

      case 'complete':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Import Complete!
            </h3>
            <p className="text-slate-500 mb-6">
              Successfully imported {importedCount} review{importedCount !== 1 ? 's' : ''}.
            </p>
            <button
              onClick={() => {
                onImported()
                onClose()
              }}
              className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
            >
              View Reviews
            </button>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Import Reviews
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          
          {renderStepContent()}
        </div>
      </div>
    </div>
  )
}

