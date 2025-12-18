'use client'

import { useState } from 'react'
import { Shield, Target, TrendingUp, PlusCircle } from 'lucide-react'

interface QueryPosition {
  queryId: string
  queryText: string
  yourRank: number | null
  competitorStrength: 'high' | 'low'
  presence: boolean
}

interface PositioningMatrixProps {
  queries: Array<{
    id: string
    text: string
    type: string
    presence?: boolean
    llmRank?: number | null
  }>
  competitors: Array<{
    name: string
    mentionCount: number
  }>
}

type Quadrant = 'dominate' | 'defend' | 'expand' | 'improve'

export function PositioningMatrix({ queries, competitors }: PositioningMatrixProps) {
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant | null>(null)

  // Calculate competitive strength (simplified - based on mention count)
  const avgCompetitorMentions = competitors.length > 0
    ? competitors.reduce((sum, c) => sum + c.mentionCount, 0) / competitors.length
    : 0

  // Categorize queries into quadrants
  const quadrants = categorizeQueries(queries, avgCompetitorMentions)

  const quadrantConfig = {
    dominate: {
      label: 'DOMINATE',
      subtitle: 'You: #1, Comp: Low',
      color: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
      icon: Target,
      iconColor: 'text-green-600',
      description: 'Maintain leadership',
    },
    defend: {
      label: 'DEFEND',
      subtitle: 'You: #1-3, Comp: High',
      color: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
      icon: Shield,
      iconColor: 'text-blue-600',
      description: 'Protect position',
    },
    expand: {
      label: 'EXPAND',
      subtitle: 'No presence, Comp: Low',
      color: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800',
      icon: PlusCircle,
      iconColor: 'text-purple-600',
      description: 'Easy opportunities',
    },
    improve: {
      label: 'IMPROVE',
      subtitle: 'You: #4+, Comp: High',
      color: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',
      icon: TrendingUp,
      iconColor: 'text-amber-600',
      description: 'Critical gaps',
    },
  }

  return (
    <div className="space-y-6">
      {/* Matrix Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-6">
          Competitive Positioning Matrix
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Top Left: Defend */}
          <QuadrantCard
            quadrant="defend"
            config={quadrantConfig.defend}
            count={quadrants.defend.length}
            isSelected={selectedQuadrant === 'defend'}
            onClick={() => setSelectedQuadrant(selectedQuadrant === 'defend' ? null : 'defend')}
          />

          {/* Top Right: Dominate */}
          <QuadrantCard
            quadrant="dominate"
            config={quadrantConfig.dominate}
            count={quadrants.dominate.length}
            isSelected={selectedQuadrant === 'dominate'}
            onClick={() => setSelectedQuadrant(selectedQuadrant === 'dominate' ? null : 'dominate')}
          />

          {/* Bottom Left: Improve */}
          <QuadrantCard
            quadrant="improve"
            config={quadrantConfig.improve}
            count={quadrants.improve.length}
            isSelected={selectedQuadrant === 'improve'}
            onClick={() => setSelectedQuadrant(selectedQuadrant === 'improve' ? null : 'improve')}
          />

          {/* Bottom Right: Expand */}
          <QuadrantCard
            quadrant="expand"
            config={quadrantConfig.expand}
            count={quadrants.expand.length}
            isSelected={selectedQuadrant === 'expand'}
            onClick={() => setSelectedQuadrant(selectedQuadrant === 'expand' ? null : 'expand')}
          />
        </div>

        {/* Axis Labels */}
        <div className="flex justify-between text-xs text-gray-500 px-2">
          <span>← Low Competitor Strength</span>
          <span>High Competitor Strength →</span>
        </div>
      </div>

      {/* Selected Quadrant Details */}
      {selectedQuadrant && quadrants[selectedQuadrant].length > 0 && (
        <div className={`rounded-xl border p-6 ${quadrantConfig[selectedQuadrant].color}`}>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            {quadrantConfig[selectedQuadrant].label} Queries ({quadrants[selectedQuadrant].length})
          </h4>
          <div className="space-y-2">
            {quadrants[selectedQuadrant].slice(0, 10).map(query => (
              <div
                key={query.queryId}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {query.queryText}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>
                        Your Rank: {query.yourRank ? `#${query.yourRank}` : 'Absent'}
                      </span>
                      <span>•</span>
                      <span>
                        Comp Strength: {query.competitorStrength === 'high' ? 'High' : 'Low'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Strategic Insight */}
          <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Strategy:</strong> {getQuadrantStrategy(selectedQuadrant)}
            </p>
          </div>
        </div>
      )}

      {/* Overall Insight */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <strong>Strategic Focus:</strong> {generateMatrixInsight(quadrants)}
      </div>
    </div>
  )
}

function QuadrantCard({ 
  quadrant, 
  config, 
  count, 
  isSelected, 
  onClick 
}: { 
  quadrant: Quadrant
  config: any
  count: number
  isSelected: boolean
  onClick: () => void
}) {
  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-lg border-2 transition-all ${
        isSelected 
          ? config.color + ' ring-2 ring-indigo-500' 
          : config.color + ' hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <Icon className={`w-5 h-5 ${config.iconColor}`} />
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {count}
        </span>
      </div>
      <div className="font-semibold text-gray-900 dark:text-white mb-1">
        {config.label}
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
        {config.subtitle}
      </div>
      <div className="text-xs text-gray-500">
        {config.description}
      </div>
    </button>
  )
}

function categorizeQueries(
  queries: PositioningMatrixProps['queries'],
  avgCompetitorMentions: number
): Record<Quadrant, QueryPosition[]> {
  const result: Record<Quadrant, QueryPosition[]> = {
    dominate: [],
    defend: [],
    expand: [],
    improve: [],
  }

  queries.forEach(q => {
    // Determine competitor strength (simplified - in reality would need per-query competitor data)
    const competitorStrength: 'high' | 'low' = avgCompetitorMentions > 10 ? 'high' : 'low'

    const position: QueryPosition = {
      queryId: q.id,
      queryText: q.text,
      yourRank: q.llmRank || null,
      competitorStrength,
      presence: q.presence || false,
    }

    // Categorize into quadrant
    if (!position.presence) {
      // No presence
      if (competitorStrength === 'low') {
        result.expand.push(position)
      } else {
        result.improve.push(position)
      }
    } else if (position.yourRank === 1) {
      // Rank #1
      if (competitorStrength === 'low') {
        result.dominate.push(position)
      } else {
        result.defend.push(position)
      }
    } else if (position.yourRank && position.yourRank <= 3) {
      // Rank #2-3
      if (competitorStrength === 'high') {
        result.defend.push(position)
      } else {
        result.dominate.push(position)
      }
    } else {
      // Rank #4+ or absent with presence
      result.improve.push(position)
    }
  })

  return result
}

function getQuadrantStrategy(quadrant: Quadrant): string {
  switch (quadrant) {
    case 'dominate':
      return 'These are your strongest positions. Maintain content freshness and monitor for competitor movements.'
    case 'defend':
      return 'You lead here but competitors are strong. Increase content depth, build citations, and monitor closely.'
    case 'expand':
      return 'Low-hanging fruit! Create targeted content for these queries - minimal competition makes them easy wins.'
    case 'improve':
      return 'Critical gaps where competitors dominate. Prioritize these for content optimization and citation building.'
  }
}

function generateMatrixInsight(quadrants: Record<Quadrant, QueryPosition[]>): string {
  const total = Object.values(quadrants).reduce((sum, arr) => sum + arr.length, 0)
  
  if (quadrants.dominate.length / total > 0.5) {
    return `You dominate ${quadrants.dominate.length} queries (${Math.round(quadrants.dominate.length / total * 100)}%). Focus on defending positions and expanding into new areas.`
  }

  if (quadrants.improve.length > 5) {
    return `${quadrants.improve.length} queries need improvement where competitors are strong. This is your top priority for optimization.`
  }

  if (quadrants.expand.length > 3) {
    return `${quadrants.expand.length} expansion opportunities with low competition. Easy wins available!`
  }

  return `Balanced positioning across quadrants. Focus on IMPROVE and EXPAND quadrants for growth.`
}
