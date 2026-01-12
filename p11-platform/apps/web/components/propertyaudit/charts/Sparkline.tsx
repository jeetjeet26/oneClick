'use client'

interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  strokeColor?: string
  strokeWidth?: number
}

export function Sparkline({
  values,
  width = 60,
  height = 20,
  strokeColor = '#6366f1',
  strokeWidth = 1.5
}: SparklineProps) {
  if (values.length < 2) {
    return null
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* End dot */}
      <circle
        cx={(values.length - 1) / (values.length - 1) * width}
        cy={height - ((values[values.length - 1] - min) / range) * height}
        r={2}
        fill={strokeColor}
      />
    </svg>
  )
}









