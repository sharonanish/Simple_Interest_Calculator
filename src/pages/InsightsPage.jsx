import { useMemo } from 'react'

import { ProjectionChart } from '../components/dashboard/ProjectionChart.jsx'
import { useCalculationHistory } from '../context/CalculationHistoryContext.jsx'

export function InsightsPage() {
  const { history } = useCalculationHistory()

  const data = useMemo(() => {

    if (!history || history.length === 0) {
      return []
    }

    return [...history]
      .slice(0, 6)
      .reverse()
      .map((item, index) => ({
        label: index === 0 ? 'Now' : `P${index}`,
        principal: Number(item.principal || 0),
        interest: Number(item.interest || 0),
        total: Number(item.totalAmount || 0),
        rate: Number(item.rate || 0),
        year: index + 1,
      }))
  }, [history])

  const totalPrincipal = data.reduce((sum, item) => sum + item.principal, 0)
  const totalInterest = data.reduce((sum, item) => sum + item.interest, 0)
  const averageRate = data.length ? (data.reduce((sum, item) => sum + item.rate, 0) / data.length).toFixed(1) : '0.0'
  const averageDuration = data.length ? Math.round(data.reduce((sum, item) => sum + Number(item.total / Math.max(item.principal, 1) || 0), 0) / data.length * 12) : 0
  const highest = data.length ? data.reduce((max, item) => (item.interest > max.interest ? item : max), data[0]) : null
  const lowest = data.length ? data.reduce((min, item) => (item.interest < min.interest ? item : min), data[0]) : null

  if (!data.length) {
    return (
      <div className="empty-state-panel large-empty" id="insights-section">
        <h3>No insights yet.</h3>
        <p>Run a calculation to generate your simple-interest insights.</p>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="stats-grid insights-grid" id="insights-section">
        <article className="stat-card">
          <div className="stat-card__header"><span className="stat-label">Total principal analyzed</span><span className="stat-accent primary"></span></div>
          <strong className="stat-value">₹{totalPrincipal.toLocaleString('en-IN')}</strong>
          <small className="stat-hint">Across all saved calculations</small>
        </article>
        <article className="stat-card">
          <div className="stat-card__header"><span className="stat-label">Total interest generated</span><span className="stat-accent success"></span></div>
          <strong className="stat-value">₹{totalInterest.toLocaleString('en-IN')}</strong>
          <small className="stat-hint">Projected growth value</small>
        </article>
        <article className="stat-card">
          <div className="stat-card__header"><span className="stat-label">Average interest rate</span><span className="stat-accent secondary"></span></div>
          <strong className="stat-value">{averageRate}%</strong>
          <small className="stat-hint">Simple-interest benchmark</small>
        </article>
        <article className="stat-card">
          <div className="stat-card__header"><span className="stat-label">Average duration</span><span className="stat-accent warning"></span></div>
          <strong className="stat-value">{averageDuration || 0} mo</strong>
          <small className="stat-hint">Typical time horizon</small>
        </article>
      </section>

      <section className="insights-layout">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Analytics</p>
              <h3>Portfolio projection</h3>
            </div>
          </div>
          <ProjectionChart data={data} emptyMessage="Save a calculation to see your portfolio projection." />
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Highlights</p>
              <h3>Scenario outlook</h3>
            </div>
          </div>
          <div className="insight-list">
            <div className="insight-row">
              <span>Highest interest</span>
              <strong>{highest ? `${highest.label}: ₹${highest.interest.toLocaleString('en-IN')}` : 'No data yet'}</strong>
            </div>
            <div className="insight-row">
              <span>Lowest interest</span>
              <strong>{lowest ? `${lowest.label}: ₹${lowest.interest.toLocaleString('en-IN')}` : 'No data yet'}</strong>
            </div>
            <div className="insight-row">
              <span>Average rate</span>
              <strong>{averageRate}%</strong>
            </div>
            <div className="insight-row">
              <span>Average duration</span>
              <strong>{averageDuration || 0} months</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
