import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { getAccessToken } from '../services/apiClient.js'
import {
  getAuthState,
  loginUser,
  logoutUser,
  restoreCurrentUser,
  signupUser,
} from '../services/authService.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => ({
    ...getAuthState(),
    isLoading: Boolean(getAccessToken()),
    error: '',
  }))

  useEffect(() => {
    let isMounted = true
    const synchronize = () => {
      if (isMounted) setAuth((current) => ({ ...getAuthState(), isLoading: current.isLoading, error: '' }))
    }
    window.addEventListener('auth-changed', synchronize)

    const restoreSession = async () => {
      if (!getAccessToken()) {
        if (isMounted) setAuth({ ...getAuthState(), isLoading: false, error: '' })
        return
      }

      try {
        await restoreCurrentUser()
        if (isMounted) setAuth({ ...getAuthState(), isLoading: false, error: '' })
      } catch (error) {
        if (isMounted) {
          setAuth({
            ...getAuthState(),
            isLoading: false,
            error: error.status ? '' : error.message,
          })
        }
      }
    }

    restoreSession()
    return () => {
      isMounted = false
      window.removeEventListener('auth-changed', synchronize)
    }
  }, [])

  const value = useMemo(() => ({
    ...auth,
    login: loginUser,
    signup: signupUser,
    logout: logoutUser,
  }), [auth])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
