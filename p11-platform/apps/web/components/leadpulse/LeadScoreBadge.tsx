'use client'

import { Flame, Sun, CloudSnow, XCircle, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react'

interface LeadScoreBadgeProps {
  score: number | null
  bucket: 'hot' | 'warm' | 'cold' | 'unqualified' | null
  size?: 'sm' | 'md' | 'lg'
  showScore?: boolean
  showLabel?: boolean
}

const BUCKET_CONFIG = {
  hot: {
    label: 'Hot',
    icon: Flame,
    bgColor: 'bg-gradient-to-r from-orange-500 to-red-500',
    textColor: 'text-white',
    borderColor: 'border-orange-400',
    lightBg: 'bg-orange-50',
    lightText: 'text-orange-700',
    ringColor: 'ring-orange-500/30',
  },
  warm: {
    label: 'Warm',
    icon: Sun,
    bgColor: 'bg-gradient-to-r from-amber-400 to-yellow-500',
    textColor: 'text-white',
    borderColor: 'border-amber-400',
    lightBg: 'bg-amber-50',
    lightText: 'text-amber-700',
    ringColor: 'ring-amber-500/30',
  },
  cold: {
    label: 'Cold',
    icon: CloudSnow,
    bgColor: 'bg-gradient-to-r from-blue-400 to-cyan-500',
    textColor: 'text-white',
    borderColor: 'border-blue-400',
    lightBg: 'bg-blue-50',
    lightText: 'text-blue-700',
    ringColor: 'ring-blue-500/30',
  },
  unqualified: {
    label: 'Unqualified',
    icon: XCircle,
    bgColor: 'bg-gradient-to-r from-gray-400 to-gray-500',
    textColor: 'text-white',
    borderColor: 'border-gray-400',
    lightBg: 'bg-gray-50',
    lightText: 'text-gray-600',
    ringColor: 'ring-gray-500/30',
  },
}

const SIZE_CONFIG = {
  sm: {
    padding: 'px-2 py-0.5',
    text: 'text-xs',
    icon: 'w-3 h-3',
    score: 'text-[10px]',
  },
  md: {
    padding: 'px-2.5 py-1',
    text: 'text-sm',
    icon: 'w-4 h-4',
    score: 'text-xs',
  },
  lg: {
    padding: 'px-3 py-1.5',
    text: 'text-base',
    icon: 'w-5 h-5',
    score: 'text-sm',
  },
}

export function LeadScoreBadge({
  score,
  bucket,
  size = 'md',
  showScore = true,
  showLabel = true,
}: LeadScoreBadgeProps) {
  if (!bucket) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-500 ${SIZE_CONFIG[size].padding} ${SIZE_CONFIG[size].text}`}>
        <HelpCircle className={SIZE_CONFIG[size].icon} />
        <span>Unscored</span>
      </span>
    )
  }

  const config = BUCKET_CONFIG[bucket]
  const Icon = config.icon
  const sizeConfig = SIZE_CONFIG[size]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${config.bgColor} ${config.textColor} ${sizeConfig.padding} ${sizeConfig.text} font-medium shadow-sm ring-2 ${config.ringColor}`}
    >
      <Icon className={sizeConfig.icon} />
      {showLabel && <span>{config.label}</span>}
      {showScore && score !== null && (
        <span className={`${sizeConfig.score} opacity-90 font-bold`}>
          {score}
        </span>
      )}
    </span>
  )
}

// Compact version for tables
export function LeadScoreCompact({
  score,
  bucket,
  trend,
}: {
  score: number | null
  bucket: 'hot' | 'warm' | 'cold' | 'unqualified' | null
  trend?: 'up' | 'down' | null
}) {
  if (!bucket || score === null) {
    return (
      <span className="text-gray-400 text-sm">--</span>
    )
  }

  const config = BUCKET_CONFIG[bucket]
  const Icon = config.icon

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${config.lightBg}`}>
        <Icon className={`w-4 h-4 ${config.lightText}`} />
      </div>
      <div className="flex flex-col">
        <span className={`text-sm font-semibold ${config.lightText}`}>{score}</span>
        {trend && (
          <span className="text-[10px] flex items-center gap-0.5">
            {trend === 'up' ? (
              <>
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-green-600">↑</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3 h-3 text-red-500" />
                <span className="text-red-600">↓</span>
              </>
            )}
          </span>
        )}
      </div>
    </div>
  )
}

// Score ring visualization
export function LeadScoreRing({
  score,
  bucket,
  size = 60,
}: {
  score: number | null
  bucket: 'hot' | 'warm' | 'cold' | 'unqualified' | null
  size?: number
}) {
  if (!bucket || score === null) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-gray-100 text-gray-400"
        style={{ width: size, height: size }}
      >
        <span className="text-lg font-bold">?</span>
      </div>
    )
  }

  const config = BUCKET_CONFIG[bucket]
  const Icon = config.icon
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const strokeWidth = 4

  // Determine gradient colors based on bucket
  const gradientId = `score-gradient-${bucket}`
  const gradientColors = {
    hot: ['#f97316', '#ef4444'],
    warm: ['#fbbf24', '#f59e0b'],
    cold: ['#60a5fa', '#06b6d4'],
    unqualified: ['#9ca3af', '#6b7280'],
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientColors[bucket][0]} />
            <stop offset="100%" stopColor={gradientColors[bucket][1]} />
          </linearGradient>
        </defs>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Icon className={`w-4 h-4 ${config.lightText}`} />
        <span className={`text-sm font-bold ${config.lightText}`}>{score}</span>
      </div>
    </div>
  )
}

export default LeadScoreBadge

















