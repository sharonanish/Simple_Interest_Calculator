export function LoadingState({ title = 'Loading', message = 'Preparing your data…' }) {
  return (
    <div className="state-card" role="status" aria-live="polite">
      <div className="state-spinner" aria-hidden="true" />
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message = 'Please try again.' }) {
  return (
    <div className="state-card state-card-error" role="alert">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}

export function EmptyState({ title = 'No data yet', message = 'Nothing to show here yet.' }) {
  return (
    <div className="state-card state-card-empty" role="status" aria-live="polite">
      <div className="state-icon" aria-hidden="true">•</div>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}
