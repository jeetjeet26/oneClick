'use client'

import { useState, useEffect } from 'react'
import { 
  Sparkles, 
  RefreshCw, 
  Loader2, 
  Palette,
  Type,
  Users,
  MessageSquare,
  TrendingUp,
  Eye
} from 'lucide-react'

interface BrandInsights {
  brandVoice: string | null
  brandPersonality: string[] | null
  colorsMentioned: string[] | null
  targetAudience: string | null
  keyMessages: string[] | null
  amenitiesHighlighted: string[] | null
  toneAnalysis: string | null
  confidence: number
  analyzedAt: string
  documentCount: number
}

interface PropertyBrandInsightsCardProps {
  propertyId: string
  propertyName: string
}

const BRAND_VOICE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  luxury: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  modern: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  community: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  value: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  authentic: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  innovative: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  professional: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
}

export function PropertyBrandInsightsCard({ propertyId, propertyName }: PropertyBrandInsightsCardProps) {
  const [insights, setInsights] = useState<BrandInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    fetchInsights()
  }, [propertyId])

  async function fetchInsights() {
    setLoading(true)
    try {
      // Check if insights already exist in property settings
      const res = await fetch(`/api/properties/${propertyId}`)
      const data = await res.json()
      
      if (data.property?.settings?.brand_insights) {
        setInsights(data.property.settings.brand_insights)
      } else {
        // No insights yet - analyze now
        await analyzeDocuments()
      }
    } catch (err) {
      console.error('Failed to fetch insights:', err)
    } finally {
      setLoading(false)
    }
  }

  async function analyzeDocuments() {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/brandforge/analyze-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId })
      })

      if (res.ok) {
        const data = await res.json()
        setInsights(data.insights)
      }
    } catch (err) {
      console.error('Failed to analyze documents:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    )
  }

  if (!insights) {
    return null
  }

  const voiceColors = insights.brandVoice 
    ? BRAND_VOICE_COLORS[insights.brandVoice.toLowerCase()] || BRAND_VOICE_COLORS.professional
    : BRAND_VOICE_COLORS.professional

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Brand Insights
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Extracted from {insights.documentCount} knowledge base documents
          </p>
        </div>
        
        {/* Confidence Badge */}
        <div className="flex items-center gap-1 px-3 py-1 bg-gray-50 rounded-full">
          <span className="text-xs text-gray-500">Confidence:</span>
          <span className={`text-xs font-medium ${
            insights.confidence >= 80 ? 'text-green-600' :
            insights.confidence >= 60 ? 'text-amber-600' :
            'text-gray-600'
          }`}>
            {insights.confidence}%
          </span>
        </div>
      </div>

      {/* Brand Voice & Personality */}
      <div className="flex flex-wrap gap-2 mb-4">
        {insights.brandVoice && (
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${voiceColors.bg} ${voiceColors.text} ${voiceColors.border} border`}>
            {insights.brandVoice}
          </span>
        )}
        {insights.brandPersonality?.map((trait, idx) => (
          <span key={idx} className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full">
            {trait}
          </span>
        ))}
        {insights.toneAnalysis && (
          <span className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full">
            {insights.toneAnalysis} tone
          </span>
        )}
      </div>

      {/* Target Audience */}
      {insights.targetAudience && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-medium text-blue-900 uppercase tracking-wide mb-1">
                Target Audience
              </h4>
              <p className="text-sm text-blue-800">{insights.targetAudience}</p>
            </div>
          </div>
        </div>
      )}

      {/* Key Messages */}
      {insights.keyMessages && insights.keyMessages.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            Key Messages
          </h4>
          <ul className="space-y-1">
            {insights.keyMessages.slice(0, 5).map((message, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-indigo-500 mt-0.5">•</span>
                {message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Colors Mentioned */}
      {insights.colorsMentioned && insights.colorsMentioned.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Palette className="w-3.5 h-3.5" />
            Brand Colors
          </h4>
          <div className="flex flex-wrap gap-2">
            {insights.colorsMentioned.filter(color => color != null).map((color, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {color.startsWith('#') ? (
                  <div
                    className="w-8 h-8 rounded border-2 border-gray-200 shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ) : (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    {color}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amenities Highlighted */}
      {insights.amenitiesHighlighted && insights.amenitiesHighlighted.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Top Amenities
          </h4>
          <div className="flex flex-wrap gap-2">
            {insights.amenitiesHighlighted.slice(0, 6).map((amenity, idx) => (
              <span 
                key={idx} 
                className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded border border-green-100"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{insights.documentCount} documents analyzed</span>
          <span>Updated {formatDate(insights.analyzedAt)}</span>
        </div>
        
        <button
          onClick={analyzeDocuments}
          disabled={analyzing}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  )
}













