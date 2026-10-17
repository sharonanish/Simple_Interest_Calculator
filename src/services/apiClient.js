const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')
const TOKEN_KEY = 'simpleInterest_accessToken'

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function clearUserScopedData() {
  for (const key of [
    'simpleInterest_history',
    'simpleInterest_reports',
    'simpleInterest_currentCalculation',
    'simpleInterest_lastCalculation',
  ]) {
    localStorage.removeItem(key)
  }
}

function handleUnauthorized() {
  clearAccessToken()
  localStorage.removeItem('simpleInterest_user')
  localStorage.removeItem('simpleInterest_auth')
  clearUserScopedData()
  window.dispatchEvent(new CustomEvent('auth-changed'))
}

export async function apiRequest(path, { auth = true, ...options } = {}) {
  const headers = new Headers(options.headers || {})
  if (
  options.body !== undefined &&
  !(options.body instanceof FormData) &&
  !headers.has('content-type')
) {
  headers.set('content-type', 'application/json')
}

  if (auth) {
    const token = getAccessToken()
    if (token) headers.set('authorization', `Bearer ${token}`)
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection and try again.')
  }

  let body = {}
  try {
    body = await response.json()
  } catch {
    body = {}
  }

  if (!response.ok) {
    if (response.status === 401 && auth) handleUnauthorized()
    throw new ApiError(body.message || 'The request could not be completed.', response.status)
  }

  return body
}

export function getApiBaseUrl() {
  return API_BASE_URL
}