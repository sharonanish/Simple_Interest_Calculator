import { useCalculationHistory } from '../../context/CalculationHistoryContext.jsx'

export function ChartPanel() {
  const { history } = useCalculationHistory()

  const chartData = history.length ? history.slice(0, 9).map((entry) => ({
    value: Number(entry.totalAmount || 0),
    label: `${entry.time} ${entry.timeUnit === 'months' ? 'mo' : 'yr'}`,
  })) : []

  const maxValue = Math.max(...chartData.map((item) => item.value), 1)

  return (
    <section className="panel chart-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Portfolio projection</p>
          <h3>Growth overview</h3>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="chart-empty-state" role="status" aria-live="polite">
          <div className="chart-empty-icon">↗</div>
          <p>Save a calculation to see your portfolio projection.</p>
        </div>
      ) : (
        <>
          <div className="chart-wrapper" aria-label="Simple interest growth chart">
            <div className="chart-grid" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="chart-bars">
              {chartData.map((item, index) => (
                <div key={`${item.label}-${index}`} className="chart-bar-group">
                  <div
                    className="chart-bar"
                    style={{ height: `${Math.max((item.value / maxValue) * 100, 12)}%` }}
                    aria-label={`${item.label}, value ${item.value}`}
                    title={`${item.label}: ₹${Number(item.value).toLocaleString('en-IN')}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="chart-legend">
            <span className="legend-item">
              <i className="legend-swatch primary"></i>
              Total amount
            </span>
          </div>
        </>
      )}
    </section>
  )
}
