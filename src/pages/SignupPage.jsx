import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext.jsx'

export function SignupPage() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  const passwordStrength = (() => {
    const value = form.password || ''
    if (!value) return { label: 'No password', level: 0 }
    if (value.length < 6) return { label: 'Weak', level: 1 }
    if (value.length < 10 || !/[A-Z]/.test(value) || !/\d/.test(value)) return { label: 'Moderate', level: 2 }
    return { label: 'Strong', level: 3 }
  })()

  const validate = () => {
    const nextErrors = {}

    if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.'
    if (!form.email.trim()) nextErrors.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Enter a valid email.'
    if (!form.password) nextErrors.password = 'Password is required.'
    else if (form.password.length < 8) nextErrors.password = 'Password must contain at least 8 characters.'
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.'
    else if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.'

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
      await signup(form)
      navigate('/calculator')
    } catch (error) {
      setErrors({ form: error.message || 'Unable to create your account. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Create account</p>
          <h1>Welcome to Simple Interest Calculator</h1>
          <p>Build smarter projection models with a secure, personalized workspace designed for financial planning.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h2>Sign Up</h2>

          <div className="field-group">
            <label htmlFor="signup-name">Full Name</label>
            <input
              id="signup-name"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Jane Smith"
            />
            {errors.fullName && <span className="field-error">{errors.fullName}</span>}
          </div>

          <div className="field-group">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="field-group">
            <label htmlFor="signup-password">Password</label>
            <div className="password-field">
              <input
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="Create a password"
              />
              <button type="button" className="toggle-visibility" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
            <div className="password-meter" aria-live="polite">
              <span className={`meter meter-${passwordStrength.level}`}></span>
              <small>{passwordStrength.label}</small>
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="signup-confirm">Confirm Password</label>
            <div className="password-field">
              <input
                id="signup-confirm"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
              />
              <button type="button" className="toggle-visibility" onClick={() => setShowConfirm((value) => !value)}>
                {showConfirm ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
          </div>

          {errors.form && <div className="form-alert" role="alert">{errors.form}</div>}

          <button type="submit" className="primary-button auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </button>

          <p className="auth-switch">
            Already have an account?
            <Link to="/login">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
