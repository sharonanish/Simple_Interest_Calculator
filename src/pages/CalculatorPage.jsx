import { useEffect, useMemo, useState } from 'react'

import { ScenarioComparisonChart } from '../components/dashboard/ScenarioComparisonChart.jsx'
import { WhatIfAnalysis } from '../components/dashboard/WhatIfAnalysis.jsx'
import { SimpleInterestCalculator } from '../components/calculator/SimpleInterestCalculator.jsx'
import { CurrencyConverter } from '../components/currency/CurrencyConverter.jsx'
import { useCalculationHistory } from '../context/CalculationHistoryContext.jsx'
import { apiRequest } from '../services/apiClient.js'
import { buildReportFromCalculation, createReportPdfBlob, downloadReport } from '../services/reportService.js'

function toResult(calculation) {
  return {
    ...calculation,
    principal: Number(calculation.principal || 0),
    rate: Number(calculation.rate || 0),
    time: Number(calculation.time || 0),
    unit: calculation.timeUnit || calculation.unit || 'years',
    simpleInterest: Number(calculation.interest ?? calculation.simpleInterest ?? 0),
    totalAmount: Number(calculation.totalAmount || 0),
  }
}

export function CalculatorPage() {
  const {
    history: historyEntries,
    currentCalculation,
    addHistoryEntry,
    deleteHistoryEntry,
    isLoading: isHistoryLoading,
    error: historyError,
    updateCurrentCalculation,
  } = useCalculationHistory()

  const [result, setResult] = useState({
    principal: 0,
    rate: 0,
    time: 0,
    totalAmount: 0,
    simpleInterest: 0,
    unit: 'years',
    mode: 'calculate-interest',
  })

  const [historySnapshot, setHistorySnapshot] = useState(() => ({
    principal: 0,
    rate: 0,
    time: 0,
    unit: 'years',
    mode: 'calculate-interest',
  }))
  const [selectedPreviousId, setSelectedPreviousId] = useState('')
  const [reportError, setReportError] = useState('')
  const [dashboardError, setDashboardError] = useState('')
  const [whatIfValues, setWhatIfValues] = useState(() => ({
    principal: 0,
    rate: 0,
    time: 0,
    unit: 'years',
  }))

  const activeCurrentCalculation = currentCalculation || historyEntries[0] || result
  const reportSource = currentCalculation?.id ? currentCalculation : historyEntries[0]
  const reportCalculationAvailable = Boolean(reportSource
    && Number(reportSource.principal) > 0
    && Number(reportSource.rate) >= 0
    && Number(reportSource.time) > 0)
  const selectedPrevious = useMemo(() => {
    if (!selectedPreviousId) {
      return null
    }

    return historyEntries.find((entry) => entry.id === selectedPreviousId) || null
  }, [historyEntries, selectedPreviousId])

  const insightText = useMemo(() => {
    const durationLabel = historySnapshot.unit === 'months' ? `${historySnapshot.time} Months` : `${historySnapshot.time} Years`
    return `At a ${historySnapshot.rate}% simple interest rate over ${durationLabel}, your ₹${Number(historySnapshot.principal || 0).toLocaleString('en-IN')} principal generates ₹${Number(result.simpleInterest || 0).toLocaleString('en-IN')} in interest.`
  }, [historySnapshot, result.simpleInterest])

  const handleCalculate = async (nextResult, nextForm) => {
    const saved = await addHistoryEntry({
      mode: nextForm.mode,
      principal: nextResult.principal,
      rate: nextResult.rate,
      time: nextResult.time,
      timeUnit: nextForm.unit,
      interest: nextResult.simpleInterest,
    })
    const authoritativeResult = toResult(saved)
    setResult(authoritativeResult)
    setHistorySnapshot({ ...authoritativeResult, mode: saved.mode })
    setWhatIfValues({
      principal: authoritativeResult.principal,
      rate: authoritativeResult.rate,
      time: authoritativeResult.time,
      unit: authoritativeResult.unit,
    })
    updateCurrentCalculation(saved)
    setDashboardError('')
    return saved
  }

 const handleGenerateReport = async () => {
  const calculation = reportSource

  if (!calculation) {
    setReportError('Complete a valid calculation before generating its report.')
    return
  }

  try {
    const report = buildReportFromCalculation({
      ...calculation,
      date: calculation.date || calculation.createdAt,
    })

    const pdfBlob = createReportPdfBlob(report)
    const formData = new FormData()
    formData.append('reportName', report.name)

    if (calculation.id != null) {
      formData.append('calculationId', String(calculation.id))
    }

    formData.append('file', pdfBlob, 'simple-interest-report.pdf')

    await apiRequest('/reports/upload', {
      method: 'POST',
      body: formData,
    })

    downloadReport(report)
    setReportError('')
  } catch (error) {
    setReportError(error.message || 'The PDF report could not be saved.')
  }
}

  const handleDeleteSelected = async () => {
    if (!selectedPrevious) {
      return
    }

    const confirmed = window.confirm('Delete this historical comparison entry?')
    if (!confirmed) {
      return
    }

    try {
      await deleteHistoryEntry(selectedPrevious.id)
      setSelectedPreviousId('')
      setDashboardError('')
    } catch (error) {
      setDashboardError(error.message || 'Unable to delete this calculation.')
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const selectedSavedCalculation = currentCalculation?.id
      ? currentCalculation
      : (!currentCalculation ? historyEntries[0] : null)

    if (selectedSavedCalculation) {
      const latest = toResult(selectedSavedCalculation)
      setResult(latest)
      setHistorySnapshot({ ...latest, mode: selectedSavedCalculation.mode })
      setWhatIfValues({
        principal: latest.principal,
        rate: latest.rate,
        time: latest.time,
        unit: latest.unit,
      })
    }
  }, [currentCalculation, historyEntries])

  return (
    <>
      <div className="page-intro" id="overview">
        <p className="eyebrow">Calculator</p>
        <h2>Simple interest dashboard</h2>
      </div>

      <div className="projected-value-card dashboard-card">
        <div className="projected-value-header">
          <span>Projected value</span>
          <small>{activeCurrentCalculation && Number(activeCurrentCalculation.principal) > 0 && Number(activeCurrentCalculation.time) > 0 ? 'Live calculation' : 'Empty state'}</small>
        </div>
        <div className="projected-value-body">
          {activeCurrentCalculation && Number(activeCurrentCalculation.principal) > 0 && Number(activeCurrentCalculation.time) > 0 ? (
            <>
              <strong>₹{Number(activeCurrentCalculation.totalAmount || 0).toLocaleString('en-IN')}</strong>
              <small>+₹{Number((activeCurrentCalculation.totalAmount || 0) - (activeCurrentCalculation.principal || 0)).toLocaleString('en-IN')} over {Number(activeCurrentCalculation.time)} {activeCurrentCalculation.unit === 'months' ? 'months' : 'years'}</small>
            </>
          ) : (
            <>
              <strong>—</strong>
              <small>Calculate an amount to see your projection.</small>
            </>
          )}
        </div>
      </div>

      {(historyError || dashboardError) && (
        <p className="field-error" role="alert">{historyError || dashboardError}</p>
      )}
      {isHistoryLoading && <p className="helper-copy" role="status">Loading your saved calculations...</p>}

      <SimpleInterestCalculator onCalculate={handleCalculate} initialResult={result} />

      <CurrencyConverter currentAmount={Number(activeCurrentCalculation.totalAmount || 0)} currentCurrency="INR" />

      <section className="insight-banner">
        <p>{insightText}</p>
      </section>

      <section className="dashboard-sections">
        <div className="panel" id="comparison">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Scenario comparison</p>
              <h3>Compare with previous calculation</h3>
            </div>
          </div>

          {historyEntries.length === 0 ? (
            <div className="chart-empty-state" role="status" aria-live="polite">
              <div className="chart-empty-icon">↗</div>
              <p>Make another calculation to compare it with a previous scenario.</p>
            </div>
          ) : (
            <div className="comparison-controls">
              <label htmlFor="previousCalculation">Previous Calculation</label>
              <div className="comparison-select-row">
                <select id="previousCalculation" value={selectedPreviousId} onChange={(event) => setSelectedPreviousId(event.target.value)}>
                  <option value="">Select a previous calculation from your history to compare</option>
                  {historyEntries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {new Date(entry.date).toLocaleDateString()} • ₹{Number(entry.principal).toLocaleString('en-IN')} • {entry.rate}% • {entry.time} {entry.timeUnit === 'months' ? 'Months' : 'Years'}
                    </option>
                  ))}
                </select>
                {selectedPreviousId && (
                  <button type="button" className="secondary-button" onClick={() => setSelectedPreviousId('')}>
                    Clear Comparison
                  </button>
                )}
              </div>
            </div>
          )}

          {!activeCurrentCalculation || !activeCurrentCalculation.principal || !activeCurrentCalculation.time ? (
            <div className="chart-empty-state" role="status" aria-live="polite">
              <div className="chart-empty-icon">↗</div>
              <p>No current calculation available.</p>
            </div>
          ) : !selectedPrevious ? (
            <div className="chart-empty-state" role="status" aria-live="polite">
              <div className="chart-empty-icon">↗</div>
              <p>Select a previous calculation from your history to compare.</p>
            </div>
          ) : (
            <>
              <div className="scenario-delete-box">
                <div>
                  <strong>Selected Previous Calculation</strong>
                  <div>{new Date(selectedPrevious.date).toLocaleDateString()} • ₹{Number(selectedPrevious.principal).toLocaleString('en-IN')} • {selectedPrevious.rate}% • {selectedPrevious.time} {selectedPrevious.timeUnit === 'months' ? 'Months' : 'Years'}</div>
                </div>
                <button type="button" className="danger-button" onClick={handleDeleteSelected}>Delete</button>
              </div>
              <ScenarioComparisonChart previous={selectedPrevious} current={activeCurrentCalculation} />
            </>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">What if?</p>
              <h3>Adjust inputs to model the outcome</h3>
            </div>
            <button type="button" className="primary-button" onClick={handleGenerateReport} disabled={!reportCalculationAvailable}>Generate Report</button>
          </div>
          {reportError && <p className="field-error" role="alert">{reportError}</p>}

          <div className="what-if-controls">
            <div className="field-group">
              <label>Principal</label>
              <input
                type="number"
                value={whatIfValues.principal}
                onChange={(event) => setWhatIfValues((current) => ({ ...current, principal: Number(event.target.value) || 0 }))}
              />
            </div>
            <div className="field-group">
              <label>Rate (%)</label>
              <input
                type="number"
                value={whatIfValues.rate}
                onChange={(event) => setWhatIfValues((current) => ({ ...current, rate: Number(event.target.value) || 0 }))}
              />
            </div>
            <div className="field-group">
              <label>Duration</label>
              <input
                type="number"
                value={whatIfValues.time}
                onChange={(event) => setWhatIfValues((current) => ({ ...current, time: Number(event.target.value) || 0 }))}
              />
            </div>
          </div>

          <WhatIfAnalysis initial={whatIfValues} />
        </div>
      </section>
    </>
  )
}
