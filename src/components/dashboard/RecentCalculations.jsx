import { useCalculationHistory } from '../../context/CalculationHistoryContext.jsx'

export function RecentCalculations() {
  const { history } = useCalculationHistory()
  const items = [...history].slice(0, 4).map((entry) => ({
    id: entry.id,
    date: new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    principal: `₹${Number(entry.principal || 0).toLocaleString('en-IN')}`,
    rate: `${entry.rate}%`,
    duration: `${entry.time} ${entry.timeUnit === 'months' ? 'Months' : 'Years'}`,
    interest: `₹${Number(entry.interest || 0).toLocaleString('en-IN')}`,
    total: `₹${Number(entry.totalAmount || 0).toLocaleString('en-IN')}`,
  }))

  return (
    <section className="panel recent-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">History</p>
          <h3>Recent calculations</h3>
        </div>
      </div>

      <div className="recent-list">
        {items.length === 0 ? (
          <div className="chart-empty-state" role="status" aria-live="polite">
            <div className="chart-empty-icon">↗</div>
            <p>No recent calculations yet.</p>
          </div>
        ) : (
          items.map((item) => (
            <article key={item.id} className="recent-item">
              <div className="recent-meta">
                <span>{item.date}</span>
              </div>
              <div className="recent-grid">
                <div><label>Principal</label><strong>{item.principal}</strong></div>
                <div><label>Rate</label><strong>{item.rate}</strong></div>
                <div><label>Duration</label><strong>{item.duration}</strong></div>
                <div><label>Interest</label><strong>{item.interest}</strong></div>
                <div><label>Total</label><strong className="total-value">{item.total}</strong></div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
