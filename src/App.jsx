import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { TopNav } from './components/layout/TopNav.jsx'
import { Sidebar } from './components/layout/Sidebar.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { CalculationHistoryProvider } from './context/CalculationHistoryContext.jsx'
import { AuthLandingPage } from './pages/AuthLandingPage.jsx'
import { CalculatorPage } from './pages/CalculatorPage.jsx'
import { HistoryPage } from './pages/HistoryPage.jsx'
import { InsightsPage } from './pages/InsightsPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { ReportsPage } from './pages/ReportsPage.jsx'
import { SignupPage } from './pages/SignupPage.jsx'
import './App.css'

const defaultTheme = 'dark'

function AppShell() {
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem('simpleInterest_theme')
    if (storedTheme) {
      return storedTheme
    }

    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light'
    }

    return defaultTheme
  })

  const auth = useAuth()
  const location = useLocation()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('simpleInterest_theme', theme)
  }, [theme])

  useEffect(() => {
    if (!location.hash) {
      return undefined
    }

    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })

    return () => window.cancelAnimationFrame(firstFrame)
  }, [location.pathname, location.hash])

  const isAuthRoute = ['/', '/login', '/signup'].includes(location.pathname)

  return (
    <div className="app-shell">
      <div className="background-glow glow-one" aria-hidden="true" />
      <div className="background-glow glow-two" aria-hidden="true" />

      {!isAuthRoute && (
        <TopNav
          theme={theme}
          user={auth.user}
          isAuthenticated={auth.isAuthenticated}
          onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        />
      )}

      <div className={isAuthRoute ? 'auth-route-layout' : 'dashboard-layout'}>
        {!isAuthRoute && <Sidebar />}
        <main className={`page-content ${isAuthRoute ? 'auth-page-content' : ''}`}>
          <Routes>
            <Route
              path="/"
              element={auth.isAuthenticated ? <Navigate to="/calculator" replace /> : <AuthLandingPage />}
            />
            <Route path="/login" element={auth.isAuthenticated ? <Navigate to="/calculator" replace /> : <LoginPage />} />
            <Route path="/signup" element={auth.isAuthenticated ? <Navigate to="/calculator" replace /> : <SignupPage />} />
            <Route
              path="/calculator"
              element={renderProtectedPage(auth, CalculatorPage)}
            />
            <Route
              path="/history"
              element={renderProtectedPage(auth, HistoryPage)}
            />
            <Route
              path="/insights"
              element={renderProtectedPage(auth, InsightsPage)}
            />
            <Route
              path="/reports"
              element={renderProtectedPage(auth, ReportsPage)}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function renderProtectedPage(auth, Page) {
  if (auth.isLoading) {
    return <div className="empty-state-panel large-empty" role="status">Restoring your session...</div>
  }
  return auth.isAuthenticated ? <Page key={auth.user.id} /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <CalculationHistoryProvider>
        <AppShell />
      </CalculationHistoryProvider>
    </AuthProvider>
  )
}
