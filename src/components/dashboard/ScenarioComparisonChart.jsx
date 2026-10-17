import { buildProjectionSeries } from '../../services/calculationService.js'
import { ProjectionChart } from './ProjectionChart.jsx'

function formatDateLabel(value) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

function scenarioSummary(entry, label) {
  const timeUnit = entry.timeUnit || entry.unit || 'years'
  const totalInterest = Number(entry.interest ?? entry.simpleInterest ?? 0)
  const totalAmount = Number(entry.totalAmount ?? (Number(entry.principal || 0) + totalInterest))

  return {
    label,
    principal: Number(entry.principal || 0),
    rate: Number(entry.rate || 0),
    time: Number(entry.time || 0),
    interest: totalInterest,
    totalAmount,
    date: entry.date,
    timeUnit,
  }
}

export function ScenarioComparisonChart({ previous, current }) {
  if (!current) {
    return (
      <div className="chart-empty-state" role="status" aria-live="polite">
        <div className="chart-empty-icon">↗</div>
        <p>No current calculation available.</p>
      </div>
    )
  }

  if (!previous) {
    return (
      <div className="chart-empty-state" role="status" aria-live="polite">
        <div className="chart-empty-icon">↗</div>
        <p>Make another calculation to compare it with a previous scenario.</p>
      </div>
    )
  }

  const oldScenario = scenarioSummary(previous, 'Old Scenario')
  const currentScenario = scenarioSummary(current, 'Current Scenario')
  const oldProjection = buildProjectionSeries({
    principal: oldScenario.principal,
    rate: oldScenario.rate,
    time: oldScenario.time,
    unit: oldScenario.timeUnit,
    mode: 'calculate-interest',
  })
  const currentProjection = buildProjectionSeries({
    principal: currentScenario.principal,
    rate: currentScenario.rate,
    time: currentScenario.time,
    unit: currentScenario.timeUnit,
    mode: 'calculate-interest',
  })

  return (
    <div className="comparison-layout" aria-label="Scenario comparison charts">
      <div className="scenario-summary-grid">
        <div className="scenario-summary">
          <div className="panel-header compact-header">
            <div>
              <p className="eyebrow">OLD SCENARIO</p>
              <h3>Historical value</h3>
            </div>
          </div>
          <div className="scenario-summary-list">
            <div><span>Principal</span><strong>₹{Number(oldScenario.principal).toLocaleString('en-IN')}</strong></div>
            <div><span>Interest Rate</span><strong>{oldScenario.rate}%</strong></div>
            <div><span>Time</span><strong>{oldScenario.time} {oldScenario.timeUnit === 'months' ? 'Months' : 'Years'}</strong></div>
            <div><span>Simple Interest</span><strong>₹{Number(oldScenario.interest).toLocaleString('en-IN')}</strong></div>
            <div><span>Total Amount</span><strong>₹{Number(oldScenario.totalAmount).toLocaleString('en-IN')}</strong></div>
            <div><span>Date</span><strong>{formatDateLabel(oldScenario.date)}</strong></div>
          </div>
        </div>

        <div className="scenario-summary">
          <div className="panel-header compact-header">
            <div>
              <p className="eyebrow">CURRENT SCENARIO</p>
              <h3>Live value</h3>
            </div>
          </div>
          <div className="scenario-summary-list">
            <div><span>Principal</span><strong>₹{Number(currentScenario.principal).toLocaleString('en-IN')}</strong></div>
            <div><span>Interest Rate</span><strong>{currentScenario.rate}%</strong></div>
            <div><span>Time</span><strong>{currentScenario.time} {currentScenario.timeUnit === 'months' ? 'Months' : 'Years'}</strong></div>
            <div><span>Simple Interest</span><strong>₹{Number(currentScenario.interest).toLocaleString('en-IN')}</strong></div>
            <div><span>Total Amount</span><strong>₹{Number(currentScenario.totalAmount).toLocaleString('en-IN')}</strong></div>
            <div><span>Date</span><strong>{formatDateLabel(currentScenario.date)}</strong></div>
          </div>
        </div>
      </div>

      <div className="scenario-graphs">
        <div className="comparison-graph-card">
          <h4>Old Scenario Projection</h4>
          <ProjectionChart data={oldProjection} emptyMessage="No historical projection available." />
        </div>
        <div className="comparison-graph-card">
          <h4>Current Scenario Projection</h4>
          <ProjectionChart data={currentProjection} emptyMessage="No current projection available." />
        </div>
      </div>
    </div>
  )
}
