import { useMemo, useState } from 'react'

export function ProjectionChart({ data, emptyMessage = 'Calculate an amount to see your projection.' }) {
  const [activeIndex, setActiveIndex] = useState(null)

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    const values = data.map((point) => point.total)
    const maxValue = Math.max(...values, 1)
    const minValue = Math.min(...values, 0)
    const range = maxValue - minValue || 1

    return data.map((point, index) => {
      const x = 40 + (index / Math.max(data.length - 1, 1)) * 560
      const y = 220 - ((point.total - minValue) / range) * 170

      return { ...point, x, y }
    })
  }, [data])

  if (!chartData.length) {
    return (
      <div className="chart-empty-state" role="status" aria-live="polite">
        <div className="chart-empty-icon">↗</div>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  const activePoint = activeIndex === null ? chartData[chartData.length - 1] : chartData[activeIndex]

  return (
    <div className="projection-chart-wrapper">
      <svg className="projection-chart" viewBox="0 0 600 260" preserveAspectRatio="none" role="img" aria-label="Projected amount over time">
        <defs>
          <linearGradient id="projection-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--accent-primary)" />
            <stop offset="100%" stopColor="var(--accent-secondary)" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((line) => (
          <line
            key={line}
            x1="40"
            x2="600"
            y1={40 + line * 45}
            y2={40 + line * 45}
            stroke="rgba(148, 163, 184, 0.2)"
            strokeDasharray="4 6"
          />
        ))}

        <polyline
          fill="none"
          stroke="url(#projection-line)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={chartData.map((point) => `${point.x},${point.y}`).join(' ')}
        />

        {chartData.map((point, index) => (
          <g key={`${point.year}-${point.total}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={activeIndex === index ? 6 : 5}
              fill="var(--accent-primary)"
              stroke="var(--background-elevated)"
              strokeWidth="2"
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          </g>
        ))}

        {chartData.map((point) => (
          <text
            key={`label-${point.year}`}
            x={point.x}
            y="245"
            textAnchor="middle"
            fill="var(--text-secondary)"
            fontSize="11"
          >
            {point.year}
          </text>
        ))}
      </svg>

      <div className="chart-tooltip" aria-live="polite">
        <strong>Year {activePoint.year}</strong>
        <span>Principal: ₹{Number(activePoint.principal).toLocaleString('en-IN')}</span>
        <span>Interest: ₹{Number(activePoint.interest).toLocaleString('en-IN')}</span>
        <span>Total: ₹{Number(activePoint.total).toLocaleString('en-IN')}</span>
      </div>
    </div>
  )
}
