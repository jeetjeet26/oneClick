'use client'

import { useState } from 'react'
import { X, Sparkles, Loader2, Check, AlertCircle, Eye, Save } from 'lucide-react'

type ExtractedUnit = {
  unitType: string
  bedrooms: number
  bathrooms: number
  sqftMin: number | null
  sqftMax: number | null
  rentMin: number | null
  rentMax: number | null
  availableCount: number
  moveInSpecials: string | null
}

type Props = {
  propertyId: string
  onClose: () => void
  onSuccess: () => void
}

export function ManualPricingModal({ propertyId, onClose, onSuccess }: Props) {
  const [content, setContent] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedUnits, setExtractedUnits] = useState<ExtractedUnit[]>([])
  const [extractionResult, setExtractionResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'paste' | 'preview' | 'saved'>('paste')

  const handleExtract = async () => {
    if (!content.trim()) {
      setError('Please paste some content first')
      return
    }

    setIsExtracting(true)
    setError(null)

    try {
      const response = await fetch('/api/properties/extract-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          content: content.trim(),
          action: 'preview'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Extraction failed')
      }

      setExtractedUnits(result.units || [])
      setExtractionResult(result)
      setStep('preview')

    } catch (err: any) {
      setError(err.message || 'Failed to extract pricing data')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleSave = async () => {
    setIsExtracting(true)
    setError(null)

    try {
      const response = await fetch('/api/properties/extract-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          content: content.trim(),
          action: 'save'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Save failed')
      }

      setStep('saved')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)

    } catch (err: any) {
      setError(err.message || 'Failed to save units')
    } finally {
      setIsExtracting(false)
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Extract Pricing from Text</h3>
              <p className="text-sm text-slate-500">
                {step === 'paste' && 'Paste content from your property website'}
                {step === 'preview' && 'Review extracted floor plans'}
                {step === 'saved' && 'Floor plans saved!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Paste Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste pricing/floor plan content from your website here...

Example:
Studio - 450 sq ft - $1,200/month - 3 available
1 Bed/1 Bath - 650 sq ft - $1,500-$1,600/month - 5 available
2 Bed/2 Bath - 950 sq ft - $2,100/month - 2 available

Special: First month free on select units!"
                  className="w-full h-64 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {content.length} characters
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Tips:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Copy the pricing table/section from your property website</li>
                  <li>• Include unit names, bed/bath counts, square footage, and rent</li>
                  <li>• AI will extract and structure the data automatically</li>
                  <li>• Works best with clear, formatted pricing information</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Extraction quality badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    extractionResult?.rawDataQuality === 'high' ? 'bg-emerald-100 text-emerald-700' :
                    extractionResult?.rawDataQuality === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {extractionResult?.rawDataQuality?.toUpperCase()} QUALITY
                  </span>
                  <span className="text-sm text-slate-600">
                    {Math.round((extractionResult?.confidence || 0) * 100)}% confidence
                  </span>
                </div>
                <span className="text-sm text-slate-600">
                  {extractedUnits.length} unit{extractedUnits.length !== 1 ? 's' : ''} found
                </span>
              </div>

              {extractionResult?.notes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">{extractionResult.notes}</p>
                </div>
              )}

              {/* Extracted units */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {extractedUnits.map((unit, idx) => (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-slate-900">{unit.unitType}</h4>
                        <p className="text-sm text-slate-500">
                          {unit.bedrooms} bed • {unit.bathrooms} bath
                        </p>
                      </div>
                      {unit.availableCount > 0 && (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                          {unit.availableCount} available
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Rent:</span>{' '}
                        <span className="font-medium text-slate-900">
                          {formatCurrency(unit.rentMin)}
                          {unit.rentMax && unit.rentMax !== unit.rentMin && ` - ${formatCurrency(unit.rentMax)}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Size:</span>{' '}
                        <span className="font-medium text-slate-900">
                          {unit.sqftMin || 'N/A'}
                          {unit.sqftMax && unit.sqftMax !== unit.sqftMin && ` - ${unit.sqftMax}`}
                          {unit.sqftMin && ' sq ft'}
                        </span>
                      </div>
                    </div>

                    {unit.moveInSpecials && (
                      <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-700">
                        🎉 {unit.moveInSpecials}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'saved' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Floor Plans Saved!</h3>
              <p className="text-sm text-slate-600">
                {extractedUnits.length} unit{extractedUnits.length !== 1 ? 's' : ''} added to your property
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'saved' && (
          <div className="p-6 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <button
              onClick={step === 'preview' ? () => setStep('paste') : onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              disabled={isExtracting}
            >
              {step === 'preview' ? 'Back' : 'Cancel'}
            </button>

            <div className="flex items-center gap-3">
              {step === 'paste' && (
                <button
                  onClick={handleExtract}
                  disabled={isExtracting || !content.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Extract & Preview
                    </>
                  )}
                </button>
              )}

              {step === 'preview' && (
                <button
                  onClick={handleSave}
                  disabled={isExtracting || extractedUnits.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save {extractedUnits.length} Unit{extractedUnits.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

