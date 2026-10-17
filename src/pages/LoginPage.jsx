import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext.jsx'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.email.trim()) nextErrors.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Enter a valid email.'

    if (!form.password) nextErrors.password = 'Password is required.'

    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    try {
      await login(form)
      navigate('/calculator')
    } catch (error) {
      setErrors({ form: error.message || 'Unable to log in. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel auth-panel-lg">
        <div className="auth-copy">
          <p className="eyebrow">Welcome back</p>
          <h1>Simple Interest Calculator</h1>
          <p>Track predictions, compare scenarios, and plan clearer financial decisions.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h2>Log In</h2>

          <div className="field-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="field-group">
            <label htmlFor="login-password">Password</label>
            <div className="password-field">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
              />
              <button type="button" className="toggle-visibility" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="auth-meta">
            <label className="checkbox-row">
              <input type="checkbox" defaultChecked />
              <span>Remember me</span>
            </label>
          </div>

          {errors.form && <div className="form-alert">{errors.form}</div>}

          <button type="submit" className="primary-button auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>

          <p className="auth-switch">
            Don&apos;t have an account?
            <Link to="/signup">Sign Up</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
