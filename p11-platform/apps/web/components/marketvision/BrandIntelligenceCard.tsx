'use client'

/**
 * Brand Intelligence Card Component
 * Displays brand intelligence for a single competitor
 */

import React from 'react'
import { 
  BrandIntelligence, 
  BRAND_VOICE_COLORS, 
  LIFESTYLE_ICONS,
  getSentimentColor,
  getConfidenceColor
} from './types'

interface BrandIntelligenceCardProps {
  intelligence: BrandIntelligence
  onViewDetails?: (competitorId: string) => void
  compact?: boolean
}

export function BrandIntelligenceCard({ 
  intelligence, 
  onViewDetails,
  compact = false 
}: BrandIntelligenceCardProps) {
  const voiceColors = intelligence.brandVoice 
    ? BRAND_VOICE_COLORS[intelligence.brandVoice.toLowerCase()] 
    : { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {intelligence.competitorName || 'Unknown Competitor'}
          </h3>
          {intelligence.websiteUrl && (
            <a 
              href={intelligence.websiteUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              {intelligence.websiteUrl.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
          )}
        </div>
        
        {/* Confidence Badge */}
        {intelligence.confidenceScore !== null && (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full">
            <span className="text-xs text-gray-500">Confidence:</span>
            <span className={`text-xs font-medium ${getConfidenceColor(intelligence.confidenceScore)}`}>
              {Math.round(intelligence.confidenceScore * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Brand Voice & Personality */}
      <div className="flex flex-wrap gap-2 mb-4">
        {intelligence.brandVoice && (
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${voiceColors.bg} ${voiceColors.text} ${voiceColors.border} border`}>
            {intelligence.brandVoice}
          </span>
        )}
        {intelligence.brandPersonality && (
          <span className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full">
            {intelligence.brandPersonality}
          </span>
        )}
        {intelligence.websiteTone && intelligence.websiteTone !== intelligence.brandVoice && (
          <span className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full">
            {intelligence.websiteTone} tone
          </span>
        )}
      </div>

      {/* Positioning Statement */}
      {intelligence.positioningStatement && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-sm text-blue-800 italic">
            "{intelligence.positioningStatement}"
          </p>
        </div>
      )}

      {/* Target Audience */}
      {intelligence.targetAudience && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Target Audience
          </h4>
          <p className="text-sm text-gray-700">{intelligence.targetAudience}</p>
        </div>
      )}

      {!compact && (
        <>
          {/* Unique Selling Points */}
          {intelligence.uniqueSellingPoints.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Key Differentiators
              </h4>
              <ul className="space-y-1">
                {intelligence.uniqueSellingPoints.slice(0, 5).map((usp, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {usp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lifestyle Focus */}
          {intelligence.lifestyleFocus.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Lifestyle Focus
              </h4>
              <div className="flex flex-wrap gap-2">
                {intelligence.lifestyleFocus.map((focus, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                  >
                    <span>{LIFESTYLE_ICONS[focus.toLowerCase()] || '🏠'}</span>
                    {focus}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Active Specials */}
          {intelligence.activeSpecials.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Active Specials & Promotions
              </h4>
              <div className="space-y-2">
                {intelligence.activeSpecials.slice(0, 3).map((special, idx) => (
                  <div 
                    key={idx} 
                    className="p-2 bg-amber-50 border border-amber-100 rounded text-sm text-amber-800"
                  >
                    🏷️ {special}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Urgency Tactics */}
          {intelligence.urgencyTactics.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Urgency Messaging
              </h4>
              <div className="flex flex-wrap gap-2">
                {intelligence.urgencyTactics.map((tactic, idx) => (
                  <span 
                    key={idx} 
                    className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded border border-red-100"
                  >
                    {tactic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Messaging Themes */}
          {intelligence.keyMessagingThemes.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Marketing Themes
              </h4>
              <div className="flex flex-wrap gap-2">
                {intelligence.keyMessagingThemes.map((theme, idx) => (
                  <span 
                    key={idx} 
                    className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{intelligence.pagesAnalyzed} pages analyzed</span>
          <span>Updated {formatDate(intelligence.lastAnalyzedAt)}</span>
          {intelligence.sentimentScore !== null && (
            <span className={`font-medium ${getSentimentColor(intelligence.sentimentScore)}`}>
              {intelligence.sentimentScore >= 0.5 ? '😊' : intelligence.sentimentScore >= 0 ? '😐' : '😟'} 
              Sentiment: {intelligence.sentimentScore.toFixed(2)}
            </span>
          )}
        </div>
        
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(intelligence.competitorId)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Details →
          </button>
        )}
      </div>
    </div>
  )
}

