export function StatCard({ label, value, accent, hint }) {
  return (
    <article className="stat-card">
      <div className="stat-card__header">
        <span className="stat-label">{label}</span>
        <span className={`stat-accent ${accent}`}></span>
      </div>
      <strong className="stat-value">{value}</strong>
      <small className="stat-hint">{hint}</small>
    </article>
  )
}
