import { useMemo } from 'react'

import { calculateSimpleInterest } from '../../utils/simpleInterest.js'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

export function WhatIfAnalysis({ initial }) {
  const initialValues = {
    principal: 0,
    rate: 0,
    time: 0,
    unit: 'years',
    ...initial,
  }

  const isValid = Number(initialValues.principal) > 0 && Number(initialValues.time) > 0 && Number(initialValues.rate) >= 0

  const points = useMemo(() => {
    if (!isValid) {
      return []
    }

    const totalSteps = Math.max(2, Math.min(6, Math.ceil(Number(initialValues.time))))
    return Array.from({ length: totalSteps + 1 }, (_, index) => {
      const elapsed = Number(initialValues.unit) === 'months' ? index / 12 : index
      const totalAmount = Number(initialValues.principal) + (Number(initialValues.principal) * Number(initialValues.rate) * elapsed) / 100
      return {
        step: index,
        label: initialValues.unit === 'months' ? `${index} mo` : `${index} yr`,
        principal: Number(initialValues.principal),
        interest: totalAmount - Number(initialValues.principal),
        totalAmount,
      }
    })
  }, [initialValues, isValid])

  if (!isValid) {
    return (
      <div className="chart-empty-state" role="status" aria-live="polite">
        <div className="chart-empty-icon">↗</div>
        <p>No projection yet</p>
        <small>Calculate an amount to see your projection.</small>
      </div>
    )
  }

  const maxValue = Math.max(...points.map((item) => item.totalAmount), 1)
  const baseline = calculateSimpleInterest({
    principal: Number(initialValues.principal),
    rate: Number(initialValues.rate),
    time: Number(initialValues.time),
    unit: initialValues.unit,
    mode: 'calculate-interest',
  })

  const size = 460
  const padding = 32
  const chartWidth = size - padding * 2
  const chartHeight = 180
  const maxY = Math.max(...points.map((point) => point.totalAmount), 1)

  const linePoints = points.map((point, index) => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * chartWidth
    const y = 180 - ((point.totalAmount - 0) / maxY) * chartHeight
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="what-if-panel">
      <h4 className="projection-title">Projected Amount Over Time</h4>
      <svg viewBox={`0 0 ${size} 220`} className="projection-svg" role="img" aria-label="Projected amount over time">
        {[0, 1, 2, 3].map((line) => (
          <line
            key={line}
            x1={padding}
            x2={size - padding}
            y1={22 + line * 42}
            y2={22 + line * 42}
            stroke="rgba(148, 163, 184, 0.2)"
            strokeDasharray="4 7"
          />
        ))}

        <polyline
          points={linePoints}
          fill="none"
          stroke="url(#projectionLine)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <defs>
          <linearGradient id="projectionLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--accent-primary)" />
            <stop offset="100%" stopColor="var(--accent-secondary)" />
          </linearGradient>
        </defs>

        {points.map((point, index) => {
          const x = padding + (index / Math.max(points.length - 1, 1)) * chartWidth
          const y = 180 - ((point.totalAmount - 0) / maxY) * chartHeight
          return (
            <g key={`point-${point.step}`}>
              <circle cx={x} cy={y} r="5" fill="var(--accent-primary)" stroke="var(--background-elevated)" strokeWidth="2" />
              <text x={x} y="206" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">{point.label}</text>
            </g>
          )
        })}
      </svg>

      <div className="what-if-summary">
        <div>
          <span>Current total</span>
          <strong>{formatCurrency(baseline.totalAmount)}</strong>
        </div>
        <div>
          <span>Interest at current rate</span>
          <strong>{formatCurrency(baseline.simpleInterest)}</strong>
        </div>
      </div>
    </div>
  )
}
