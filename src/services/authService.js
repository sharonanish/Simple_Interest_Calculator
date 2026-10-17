import { apiRequest, clearAccessToken, clearUserScopedData, getAccessToken, setAccessToken } from './apiClient.js'

const USER_KEY = 'simpleInterest_user'
const LEGACY_AUTH_KEY = 'simpleInterest_auth'

function toFrontendUser(user, previousUser = null) {
  return {
    id: String(user.id),
    fullName: user.name || user.fullName || 'User',
    email: user.email || '',
    avatar: previousUser?.id === String(user.id)
      ? previousUser.avatar || getInitials(user.name || user.fullName || 'User')
      : getInitials(user.name || user.fullName || 'User'),
    createdAt: user.createdAt || user.created_at || null,
  }
}

function storeUser(user) {
  const previousUser = getCurrentUser()
  if (previousUser?.id && previousUser.id !== String(user.id)) clearUserScopedData()
  const safeUser = toFrontendUser(user, previousUser)
  localStorage.setItem(USER_KEY, JSON.stringify(safeUser))
  localStorage.removeItem(LEGACY_AUTH_KEY)
  return safeUser
}

export function getStorageKeys() {
  return { user: USER_KEY, token: 'simpleInterest_accessToken' }
}

export function getCurrentUser() {
  try {
    const storedUser = JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    if (!storedUser || typeof storedUser !== 'object') return null
    const safeUser = toFrontendUser(storedUser, storedUser)
    if (Object.hasOwn(storedUser, 'password') || Object.hasOwn(storedUser, 'password_hash')) {
      localStorage.setItem(USER_KEY, JSON.stringify(safeUser))
    }
    return safeUser
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function getAuthState() {
  const token = getAccessToken()
  const user = getCurrentUser()
  return { isAuthenticated: Boolean(token && user), user }
}

function announceAuthChange() {
  window.dispatchEvent(new CustomEvent('auth-changed'))
}

export function clearAuthState() {
  clearAccessToken()
  clearUserScopedData()
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(LEGACY_AUTH_KEY)
  announceAuthChange()
}

export async function restoreCurrentUser() {
  if (!getAccessToken()) return null
  const response = await apiRequest('/auth/me')
  return storeUser(response.user)
}

export async function signupUser({ fullName, email, password }) {
  const signupResponse = await apiRequest('/auth/signup', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ name: String(fullName || '').trim(), email, password }),
  })

  const loginResponse = await apiRequest('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  })

  setAccessToken(loginResponse.token)
  const user = storeUser(loginResponse.user || signupResponse.user)
  announceAuthChange()
  return { ok: true, user }
}

export async function loginUser({ email, password }) {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  })

  setAccessToken(response.token)
  const user = storeUser(response.user)
  announceAuthChange()
  return { ok: true, user }
}

export async function logoutUser() {
  try {
    if (getAccessToken()) await apiRequest('/auth/logout', { method: 'POST' })
  } catch {
    // Local sign-out still completes if the API is unavailable.
  } finally {
    clearAuthState()
  }
}

export async function updateUserProfile(nextUser) {
  const response = await apiRequest('/users/profile', {
    method: 'PUT',
    body: JSON.stringify({ name: String(nextUser.fullName || '').trim() }),
  })
  const currentUser = getCurrentUser()
  const updatedUser = {
    ...toFrontendUser(response.user, currentUser),
    avatar: String(nextUser.avatar || '').trim() || getInitials(response.user.name),
  }
  localStorage.setItem(USER_KEY, JSON.stringify(updatedUser))
  announceAuthChange()
  return updatedUser
}

export function getInitials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U'
}
