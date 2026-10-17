import { Link } from 'react-router-dom'

export function AuthLandingPage() {
  return (
    <div className="auth-shell">
      <div className="auth-panel auth-landing-panel">
        <div className="auth-copy">
          <p className="eyebrow">Welcome</p>
          <h1>Simple Interest Calculator</h1>
          <p>
            Plan smarter with a clean, futuristic workspace for performing quick simple-interest calculations,
            analyzing financial scenarios, and reviewing your personal history.
          </p>
        </div>

        <div className="auth-actions">
          <Link to="/signup" className="primary-button auth-link">
            Sign Up
          </Link>
          <Link to="/login" className="secondary-button auth-link">
            Log In
          </Link>
        </div>
      </div>
    </div>
  )
}
