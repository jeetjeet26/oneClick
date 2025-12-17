'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DeltaBadgeProps {
  value: number | null | undefined
  type?: 'score' | 'rank' | 'percent'
  showZero?: boolean
  size?: 'sm' | 'md'
}

export function DeltaBadge({ 
  value, 
  type = 'score', 
  showZero = false,
  size = 'sm' 
}: DeltaBadgeProps) {
  if (value === null || value === undefined) {
    return showZero ? (
      <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
        <Minus className="w-3 h-3" />
        <span>0</span>
      </span>
    ) : null
  }

  if (value === 0 && !showZero) {
    return null
  }

  const isPositive = type === 'rank' ? value < 0 : value > 0
  const isNegative = type === 'rank' ? value > 0 : value < 0
  const displayValue = Math.abs(value)

  const formatValue = () => {
    if (type === 'percent') {
      return `${displayValue.toFixed(1)}%`
    }
    if (type === 'rank') {
      return displayValue.toString()
    }
    return displayValue.toFixed(1)
  }

  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  if (isPositive) {
    return (
      <span className={`inline-flex items-center gap-0.5 ${sizeClasses} rounded-full bg-green-100 text-green-700 font-medium`}>
        <TrendingUp className={iconSize} />
        <span>+{formatValue()}</span>
      </span>
    )
  }

  if (isNegative) {
    return (
      <span className={`inline-flex items-center gap-0.5 ${sizeClasses} rounded-full bg-red-100 text-red-700 font-medium`}>
        <TrendingDown className={iconSize} />
        <span>-{formatValue()}</span>
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${sizeClasses} rounded-full bg-gray-100 text-gray-600 font-medium`}>
      <Minus className={iconSize} />
      <span>{formatValue()}</span>
    </span>
  )
}
