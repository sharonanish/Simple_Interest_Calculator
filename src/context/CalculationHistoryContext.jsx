import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { useAuth } from './AuthContext.jsx'
import { apiRequest } from '../services/apiClient.js'
import { clearCurrentCalculation, getCurrentCalculation, setCurrentCalculation } from '../services/calculationService.js'

function normalizeCalculation(calculation) {
  return {
    ...calculation,
    id: String(calculation.id),
    timeUnit: calculation.timeUnit || calculation.time_unit || 'years',
    date: calculation.createdAt || calculation.created_at || calculation.date,
    interest: Number(calculation.interest || 0),
    principal: Number(calculation.principal || 0),
    rate: Number(calculation.rate || 0),
    time: Number(calculation.time || 0),
    totalAmount: Number(calculation.totalAmount || calculation.total_amount || 0),
  }
}

const CalculationHistoryContext = createContext(null)

export function CalculationHistoryProvider({ children }) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const userId = isAuthenticated && user?.id ? String(user.id) : null
  const [storedHistory, setStoredHistory] = useState([])
  const [historyOwnerId, setHistoryOwnerId] = useState(null)
  const history = historyOwnerId === userId ? storedHistory : []
  const [storedCurrent, setStoredCurrent] = useState(null)
  const [currentOwnerId, setCurrentOwnerId] = useState(null)
  const currentCalculation = currentOwnerId === userId ? storedCurrent : null
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const syncCurrent = () => {
    const nextCurrent = getCurrentCalculation()
    setStoredCurrent(nextCurrent)
    setCurrentOwnerId(nextCurrent ? userId : null)
  }

  useEffect(() => {
    const handleHistoryChange = () => syncCurrent()
    window.addEventListener('history-changed', handleHistoryChange)
    return () => window.removeEventListener('history-changed', handleHistoryChange)
  }, [])

  useEffect(() => {
    let isMounted = true

    if (isAuthLoading) return () => { isMounted = false }
    setHistoryOwnerId(null)
    setStoredHistory([])
    clearCurrentCalculation()
    setStoredCurrent(null)
    setCurrentOwnerId(null)
    if (!isAuthenticated) {
      setIsLoading(false)
      setError('')
      return () => { isMounted = false }
    }

    const loadHistory = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await apiRequest('/calculations')
        if (isMounted) {
          setStoredHistory(response.calculations.map(normalizeCalculation))
          setHistoryOwnerId(userId)
        }
      } catch (loadError) {
        if (isMounted) setError(loadError.message)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadHistory()
    return () => { isMounted = false }
  }, [isAuthenticated, isAuthLoading, userId])

  const refreshHistory = async () => {
    const response = await apiRequest('/calculations')
    const nextHistory = response.calculations.map(normalizeCalculation)
    setStoredHistory(nextHistory)
    setHistoryOwnerId(userId)
    setError('')
    return nextHistory
  }

  const value = useMemo(() => ({
    history,
    currentCalculation,
    isLoading,
    error,
    refreshHistory,
    addHistoryEntry: async (entry) => {
      const response = await apiRequest('/calculations', {
        method: 'POST',
        body: JSON.stringify({
          mode: entry.mode,
          principal: entry.principal,
          rate: entry.rate,
          time: entry.time,
          timeUnit: entry.timeUnit || entry.unit || 'years',
          interest: entry.interest,
        }),
      })
      const saved = normalizeCalculation(response.calculation)
      setStoredHistory((current) => [saved, ...current.filter((item) => item.id !== saved.id)])
      setHistoryOwnerId(userId)
      setError('')
      return saved
    },
    deleteHistoryEntry: async (id) => {
      await apiRequest(`/calculations/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setStoredHistory((current) => current.filter((item) => item.id !== String(id)))
      if (currentCalculation?.id === String(id)) {
        clearCurrentCalculation()
        setStoredCurrent(null)
        setCurrentOwnerId(null)
      }
      setError('')
    },
    clearHistory: async () => {
      const currentHistory = history
      for (const item of currentHistory) {
        await apiRequest(`/calculations/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
        setStoredHistory((current) => current.filter((entry) => entry.id !== item.id))
      }
      clearCurrentCalculation()
      setStoredCurrent(null)
      setCurrentOwnerId(null)
      setError('')
    },
    updateCurrentCalculation: (entry) => {
      const next = setCurrentCalculation(entry)
      setStoredCurrent(next)
      setCurrentOwnerId(next ? userId : null)
      return next
    },
    clearCurrentCalculation: () => {
      const next = clearCurrentCalculation()
      setStoredCurrent(next)
      setCurrentOwnerId(null)
      return next
    },
  }), [history, currentCalculation, isLoading, error, userId])

  return (
    <CalculationHistoryContext.Provider value={value}>
      {children}
    </CalculationHistoryContext.Provider>
  )
}

export function useCalculationHistory() {
  const context = useContext(CalculationHistoryContext)

  if (!context) {
    throw new Error('useCalculationHistory must be used within a CalculationHistoryProvider')
  }

  return context
}
