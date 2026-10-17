import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CustomSelect } from '../components/ui/CustomSelect.jsx'
import { useCalculationHistory } from '../context/CalculationHistoryContext.jsx'
import { formatDateLabel, getModeLabel } from '../services/historyService.js'

export function HistoryPage() {
  const navigate = useNavigate()
  const { history, deleteHistoryEntry, clearHistory, updateCurrentCalculation, isLoading, error } = useCalculationHistory()
  const [query, setQuery] = useState('')
  const [modeFilter, setModeFilter] = useState('all')
  const [sortDirection, setSortDirection] = useState('desc')
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [actionError, setActionError] = useState('')

  const filteredHistory = useMemo(() => {
    const filtered = history.filter((entry) => {
      const matchesQuery = !query || `${entry.mode} ${entry.principal} ${entry.rate} ${entry.time}`.toLowerCase().includes(query.toLowerCase())
      const matchesMode = modeFilter === 'all' || entry.mode === modeFilter
      return matchesQuery && matchesMode
    })

    return [...filtered].sort((a, b) => {
      const left = new Date(a.date).getTime()
      const right = new Date(b.date).getTime()
      return sortDirection === 'desc' ? right - left : left - right
    })
  }, [history, modeFilter, query, sortDirection])

  const handleDelete = async (id) => {
    try {
      await deleteHistoryEntry(id)
      setSelectedEntry((current) => current?.id === id ? null : current)
      setActionError('')
    } catch (deleteError) {
      setActionError(deleteError.message || 'Unable to delete this calculation.')
    }
  }

  const handleClear = async () => {
    try {
      await clearHistory()
      setSelectedEntry(null)
      setActionError('')
    } catch (clearError) {
      setActionError(clearError.message || 'Unable to clear calculation history.')
    }
  }

  const handleUseAgain = (entry) => {
    updateCurrentCalculation(entry)
    navigate('/calculator')
  }

  return (
    <div className="page-stack">
      <section className="panel section-header-panel" id="history-section">
        <div className="panel-header">
          <div>
            <p className="eyebrow">History</p>
            <h2>Calculation log</h2>
          </div>
          <button type="button" className="secondary-button" onClick={handleClear}>
            Clear history
          </button>
        </div>

        {(error || actionError) && <p className="field-error" role="alert">{actionError || error}</p>}

        <div className="history-controls">
          <input
            type="search"
            placeholder="Search calculations"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <CustomSelect
            label="Filter by mode"
            value={modeFilter}
            onChange={setModeFilter}
            options={[
              { value: 'all', label: 'All modes' },
              { value: 'calculate-interest', label: 'Calculate Interest' },
              { value: 'find-principal', label: 'Find Principal' },
              { value: 'find-rate', label: 'Find Interest Rate' },
              { value: 'find-time', label: 'Find Time' },
            ]}
          />

          <CustomSelect
            label="Sort order"
            value={sortDirection}
            onChange={setSortDirection}
            options={[
              { value: 'desc', label: 'Newest first' },
              { value: 'asc', label: 'Oldest first' },
            ]}
          />
        </div>
      </section>

      <section className="history-table-wrap panel">
        <div className="history-table">
          <div className="history-row history-head">
            <span>Date</span>
            <span>Mode</span>
            <span>Principal</span>
            <span>Rate</span>
            <span>Time</span>
            <span>Interest</span>
            <span>Total</span>
            <span>Actions</span>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="empty-state">{isLoading ? 'Loading calculations...' : 'No calculations found.'}</div>
          ) : (
            filteredHistory.map((entry) => (
              <div key={entry.id} className="history-row history-item">
                <span>{formatDateLabel(entry.date)}</span>
                <span>{getModeLabel(entry.mode)}</span>
                <span>₹{Number(entry.principal).toLocaleString('en-IN')}</span>
                <span>{entry.rate}%</span>
                <span>
                  {entry.time} {entry.timeUnit === 'months' ? 'Months' : 'Years'}
                </span>
                <span>₹{Number(entry.interest).toLocaleString('en-IN')}</span>
                <span className="amount-positive">₹{Number(entry.totalAmount).toLocaleString('en-IN')}</span>
                <span className="history-actions">
                  <button type="button" className="ghost-button small-button" onClick={() => setSelectedEntry(entry)}>
                    View
                  </button>
                  <button type="button" className="secondary-button small-button" onClick={() => handleUseAgain(entry)}>
                    Use Again
                  </button>
                  <button type="button" className="danger-button" onClick={() => handleDelete(entry.id)}>
                    Delete
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {selectedEntry && (
        <section className="panel selection-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Selected calculation</p>
              <h3>{getModeLabel(selectedEntry.mode)}</h3>
            </div>
          </div>

          <div className="selection-grid">
            <div><span>Principal</span><strong>₹{Number(selectedEntry.principal).toLocaleString('en-IN')}</strong></div>
            <div><span>Rate</span><strong>{selectedEntry.rate}%</strong></div>
            <div><span>Duration</span><strong>{selectedEntry.time} {selectedEntry.timeUnit === 'months' ? 'Months' : 'Years'}</strong></div>
            <div><span>Interest</span><strong>₹{Number(selectedEntry.interest).toLocaleString('en-IN')}</strong></div>
            <div><span>Total amount</span><strong>₹{Number(selectedEntry.totalAmount).toLocaleString('en-IN')}</strong></div>
            <div><span>Date</span><strong>{formatDateLabel(selectedEntry.date)}</strong></div>
          </div>
        </section>
      )}
    </div>
  )
}
