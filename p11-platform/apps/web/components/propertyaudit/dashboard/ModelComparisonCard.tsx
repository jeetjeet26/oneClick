'use client'

import { Sparkles, Globe, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

interface SurfaceScore {
  overallScore: number
  visibilityPct: number
  avgLlmRank: number | null
}

interface ModelComparisonCardProps {
  openai: SurfaceScore | null
  claude: SurfaceScore | null
  onViewDetails?: () => void
}

export function ModelComparisonCard({ openai, claude, onViewDetails }: ModelComparisonCardProps) {
  if (!openai && !claude) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-sm text-gray-500">
          Run audits on both OpenAI and Claude to see model comparison
        </p>
      </div>
    )
  }

  const scoreDiff = openai && claude ? claude.overallScore - openai.overallScore : 0
  const betterModel = scoreDiff > 0 ? 'claude' : scoreDiff < 0 ? 'openai' : null
  const showImbalanceWarning = Math.abs(scoreDiff) > 10

  // Analyze strengths/weaknesses
  const openaiStrengths = analyzeStrengths(openai, 'openai')
  const claudeStrengths = analyzeStrengths(claude, 'claude')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        Model Performance Comparison
      </h3>

      <div className="grid grid-cols-2 gap-6">
        {/* OpenAI */}
        <div className={`space-y-3 ${betterModel === 'openai' ? 'bg-green-50 dark:bg-green-900/10 -m-3 p-3 rounded-lg' : ''}`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-500" />
            <span className="font-medium text-gray-900 dark:text-white">OpenAI</span>
            {betterModel === 'openai' && (
              <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
            )}
            {betterModel === 'claude' && showImbalanceWarning && (
              <AlertCircle className="w-4 h-4 text-amber-500 ml-auto" />
            )}
          </div>

          {openai ? (
            <>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {Math.round(openai.overallScore)}
                </div>
                <div className="text-xs text-gray-500">Score</div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Visibility</span>
                  <span className="font-medium">{Math.round(openai.visibilityPct)}%</span>
                </div>
                {openai.avgLlmRank && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Rank</span>
                    <span className="font-medium">{openai.avgLlmRank.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {openaiStrengths && (
                <div className="text-xs">
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {openaiStrengths.type}:
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {openaiStrengths.message}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-gray-500">No data yet</div>
          )}
        </div>

        {/* Claude */}
        <div className={`space-y-3 ${betterModel === 'claude' ? 'bg-purple-50 dark:bg-purple-900/10 -m-3 p-3 rounded-lg' : ''}`}>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-gray-900 dark:text-white">Claude</span>
            {betterModel === 'claude' && (
              <CheckCircle2 className="w-4 h-4 text-purple-500 ml-auto" />
            )}
            {betterModel === 'openai' && showImbalanceWarning && (
              <AlertCircle className="w-4 h-4 text-amber-500 ml-auto" />
            )}
          </div>

          {claude ? (
            <>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {Math.round(claude.overallScore)}
                </div>
                <div className="text-xs text-gray-500">Score</div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Visibility</span>
                  <span className="font-medium">{Math.round(claude.visibilityPct)}%</span>
                </div>
                {claude.avgLlmRank && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Rank</span>
                    <span className="font-medium">{claude.avgLlmRank.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {claudeStrengths && (
                <div className="text-xs">
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {claudeStrengths.type}:
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {claudeStrengths.message}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-gray-500">No data yet</div>
          )}
        </div>
      </div>

      {/* Recommendation */}
      {openai && claude && showImbalanceWarning && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-gray-700 dark:text-gray-300">
                {betterModel === 'claude' 
                  ? `Claude outperforming OpenAI by ${Math.abs(scoreDiff).toFixed(0)} points. Consider optimizing content for OpenAI's algorithm.`
                  : `OpenAI outperforming Claude by ${Math.abs(scoreDiff).toFixed(0)} points. Consider optimizing content for Claude's algorithm.`
                }
              </span>
              {onViewDetails && (
                <button
                  onClick={onViewDetails}
                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium mt-2"
                >
                  Balance Optimization
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function analyzeStrengths(
  score: SurfaceScore | null,
  model: 'openai' | 'claude'
): { type: 'Strengths' | 'Needs Work'; message: string } | null {
  if (!score) return null

  if (score.visibilityPct === 100 && score.overallScore >= 80) {
    return {
      type: 'Strengths',
      message: 'Excellent across all query types'
    }
  }

  if (score.visibilityPct < 70) {
    return {
      type: 'Needs Work',
      message: 'Low visibility - add specific queries'
    }
  }

  if (score.avgLlmRank && score.avgLlmRank > 2) {
    return {
      type: 'Needs Work',
      message: 'Rankings need improvement'
    }
  }

  return {
    type: 'Strengths',
    message: 'Solid performance overall'
  }
}
