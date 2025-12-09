'use client'

/**
 * Competitor Comparison View Component
 * Side-by-side brand intelligence comparison
 */

import React, { useMemo } from 'react'
import { BrandIntelligence, BRAND_VOICE_COLORS } from './types'

interface CompetitorComparisonViewProps {
  competitors: BrandIntelligence[]
  yourProperty?: {
    name: string
    brandVoice?: string
    targetAudience?: string
    amenities?: string[]
  }
}

export function CompetitorComparisonView({ 
  competitors,
  yourProperty
}: CompetitorComparisonViewProps) {
  
  // Aggregate insights across all competitors
  const aggregatedInsights = useMemo(() => {
    const brandVoices = competitors.reduce((acc, c) => {
      if (c.brandVoice) {
        acc[c.brandVoice] = (acc[c.brandVoice] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const allThemes = competitors.flatMap(c => c.keyMessagingThemes)
    const themeCounts = allThemes.reduce((acc, theme) => {
      acc[theme] = (acc[theme] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const allLifestyles = competitors.flatMap(c => c.lifestyleFocus)
    const lifestyleCounts = allLifestyles.reduce((acc, ls) => {
      acc[ls] = (acc[ls] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const allAmenities = competitors.flatMap(c => c.highlightedAmenities)
    const amenityCounts = allAmenities.reduce((acc, amenity) => {
      acc[amenity] = (acc[amenity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const allUSPs = competitors.flatMap(c => c.uniqueSellingPoints)
    const uspCounts = allUSPs.reduce((acc, usp) => {
      acc[usp] = (acc[usp] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      brandVoices,
      themeCounts,
      lifestyleCounts,
      amenityCounts,
      uspCounts,
      avgSentiment: competitors.filter(c => c.sentimentScore !== null)
        .reduce((sum, c) => sum + (c.sentimentScore || 0), 0) / 
        competitors.filter(c => c.sentimentScore !== null).length || 0
    }
  }, [competitors])

  const sortedThemes = Object.entries(aggregatedInsights.themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const sortedAmenities = Object.entries(aggregatedInsights.amenityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const sortedUSPs = Object.entries(aggregatedInsights.uspCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Market Overview
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Brand Positioning Distribution */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Brand Positioning
            </h4>
            <div className="space-y-2">
              {Object.entries(aggregatedInsights.brandVoices)
                .sort((a, b) => b[1] - a[1])
                .map(([voice, count]) => {
                  const colors = BRAND_VOICE_COLORS[voice.toLowerCase()] || 
                    { bg: 'bg-gray-100', text: 'text-gray-700' }
                  const percent = (count / competitors.length) * 100
                  return (
                    <div key={voice} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`${colors.text} font-medium`}>{voice}</span>
                          <span className="text-gray-500">{count} ({percent.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${colors.bg} rounded-full`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Common Marketing Themes */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Common Marketing Themes
            </h4>
            <div className="flex flex-wrap gap-2">
              {sortedThemes.map(([theme, count]) => (
                <span 
                  key={theme}
                  className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded"
                  title={`Used by ${count} competitors`}
                >
                  {theme} ({count})
                </span>
              ))}
            </div>
          </div>

          {/* Lifestyle Focus */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Lifestyle Focus Areas
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(aggregatedInsights.lifestyleCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([lifestyle, count]) => (
                  <span 
                    key={lifestyle}
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                    title={`${count} competitors focus on this`}
                  >
                    {lifestyle} ({count})
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Differentiators Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Common Differentiators
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Unique Selling Points */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Most Common Selling Points
            </h4>
            <ul className="space-y-2">
              {sortedUSPs.map(([usp, count]) => (
                <li key={usp} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-gray-700">{usp}</span>
                  <span className="text-gray-400 text-xs">({count})</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Highlighted Amenities */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Top Highlighted Amenities
            </h4>
            <div className="flex flex-wrap gap-2">
              {sortedAmenities.map(([amenity, count]) => (
                <span 
                  key={amenity}
                  className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded"
                >
                  {amenity} ({count})
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Competitive Position Matrix */}
      {yourProperty && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Competitive Position
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Brand Alignment
              </h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Your positioning: <span className="font-medium text-gray-900">{yourProperty.brandVoice || 'Not set'}</span>
                </p>
                <p className="text-sm text-gray-600">
                  {yourProperty.brandVoice && aggregatedInsights.brandVoices[yourProperty.brandVoice]
                    ? `${aggregatedInsights.brandVoices[yourProperty.brandVoice]} of ${competitors.length} competitors share this positioning`
                    : 'Unique positioning in your market!'
                  }
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Audience Overlap
              </h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Your target: <span className="font-medium text-gray-900">{yourProperty.targetAudience || 'Not set'}</span>
                </p>
                <p className="text-sm text-gray-600">
                  {competitors.filter(c => 
                    c.targetAudience?.toLowerCase().includes(yourProperty.targetAudience?.toLowerCase() || '') ||
                    yourProperty.targetAudience?.toLowerCase().includes(c.targetAudience?.toLowerCase() || '')
                  ).length} competitors target similar audiences
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Competitor Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Competitor Details
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Competitor</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Brand Voice</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Target Audience</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Top USP</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((competitor) => {
                const voiceColors = competitor.brandVoice 
                  ? BRAND_VOICE_COLORS[competitor.brandVoice.toLowerCase()] 
                  : { bg: 'bg-gray-100', text: 'text-gray-600' }
                
                return (
                  <tr key={competitor.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{competitor.competitorName}</div>
                      {competitor.websiteUrl && (
                        <a 
                          href={competitor.websiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Website ↗
                        </a>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {competitor.brandVoice && (
                        <span className={`px-2 py-1 text-xs rounded ${voiceColors.bg} ${voiceColors.text}`}>
                          {competitor.brandVoice}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                      {competitor.targetAudience || '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                      {competitor.uniqueSellingPoints[0] || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {competitor.sentimentScore !== null ? (
                        <span className={competitor.sentimentScore >= 0.5 ? 'text-green-600' : competitor.sentimentScore >= 0 ? 'text-yellow-600' : 'text-red-600'}>
                          {competitor.sentimentScore >= 0.5 ? '😊' : competitor.sentimentScore >= 0 ? '😐' : '😟'}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

