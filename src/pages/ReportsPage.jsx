import { useEffect, useState } from 'react'

import { CustomSelect } from '../components/ui/CustomSelect.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useCalculationHistory } from '../context/CalculationHistoryContext.jsx'
import { apiRequest } from '../services/apiClient.js'
import { getModeLabel } from '../services/historyService.js'
import { buildReportFromCalculation,createReportPdfBlob, downloadReport } from '../services/reportService.js'

export function ReportsPage() {
  const { user } = useAuth()
  const userId = user?.id ? String(user.id) : null
  const { history, isLoading: isHistoryLoading, error: historyError } = useCalculationHistory()
  const [reports, setReports] = useState([])
  const [reportsOwnerId, setReportsOwnerId] = useState(null)
  const [selectedCalculationId, setSelectedCalculationId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    setReportsOwnerId(null)
    setReports([])
    setSelectedCalculationId('')
    setError('')
    const loadReports = async () => {
      setIsLoading(true)
      try {
        const response = await apiRequest('/reports')
        if (isMounted) {
          setReports(response.reports)
          setReportsOwnerId(userId)
        }
      } catch (loadError) {
        if (isMounted) setError(loadError.message)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadReports()
    return () => { isMounted = false }
  }, [userId])

  useEffect(() => {
    if (isHistoryLoading) return
    if (!history.some((entry) => entry.id === selectedCalculationId)) {
      setSelectedCalculationId(history[0]?.id || '')
    }
  }, [history, isHistoryLoading, selectedCalculationId])

  const selectedEntry = history.find((entry) => entry.id === selectedCalculationId) || null

  const handleDelete = async (id) => {
    try {
      await apiRequest(`/reports/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setReports((current) => current.filter((report) => report.id !== id))
      setError('')
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete this report.')
    }
  }

  const getCalculationForReport = (report) => history.find((entry) => entry.id === report.calculationId)

  const handleDownload = (report) => {
    const calculation = getCalculationForReport(report)
    if (!calculation) {
      setError('This report has metadata only; its saved calculation is no longer available to rebuild the local PDF.')
      return
    }

    try {
      downloadReport(buildReportFromCalculation({ ...calculation, date: calculation.date || calculation.createdAt }))
      setError('')
    } catch (downloadError) {
      setError(downloadError.message || 'The PDF could not be generated. Please try again.')
    }
  }

  const handleGenerateReport = async () => {
  if (!selectedEntry) {
    setError('Create a calculation before generating a report.')
    return
  }

  setIsGenerating(true)
  setError('')

  try {
    const report = buildReportFromCalculation({
      ...selectedEntry,
      date: selectedEntry.date || selectedEntry.createdAt,
    })

    const pdfBlob = createReportPdfBlob(report)
    const formData = new FormData()
    formData.append('reportName', report.name)

    if (selectedEntry.id != null) {
      formData.append('calculationId', String(selectedEntry.id))
    }

    formData.append('file', pdfBlob, 'simple-interest-report.pdf')

    const response = await apiRequest('/reports/upload', {
      method: 'POST',
      body: formData,
    })

    setReports((current) => [
      response.report,
      ...current.filter((item) => item.id !== response.report.id),
    ])

    downloadReport(report)
    setError('')
  } catch (error) {
    setError(error.message || 'The PDF report could not be saved.')
  } finally {
    setIsGenerating(false)
  }
}
  const accountReports = reportsOwnerId === userId ? reports : []
  const displayReports = accountReports.map((report) => {
    const calculation = getCalculationForReport(report)
    return {
      ...report,
      name: report.reportName,
      date: report.createdAt,
      status: 'Metadata saved',
      type: calculation ? getModeLabel(calculation.mode) : 'Metadata only',
      principal: calculation?.principal,
      interest: calculation?.interest,
      totalAmount: calculation?.totalAmount,
    }
  })

  return (
    <div className="page-stack" id="reports-section">
      <section className="panel section-header-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Reports</p>
            <h2>Generated analysis</h2>
          </div>
          <button type="button" className="primary-button" onClick={handleGenerateReport} disabled={!selectedEntry || isGenerating}>
            {isGenerating ? 'Generating PDF...' : selectedEntry ? 'Generate Report' : 'Calculate an amount before generating a report.'}
          </button>
        </div>

        <div className="report-picker">
          {isHistoryLoading ? (
            <p className="helper-copy">Loading saved calculations...</p>
          ) : history.length === 0 ? (
            <p className="helper-copy">Create a calculation first to generate a report.</p>
          ) : (
            <CustomSelect
              label="Selected calculation"
              value={selectedCalculationId}
              onChange={setSelectedCalculationId}
              options={history.map((entry) => ({
                value: entry.id,
                label: `${new Date(entry.date).toLocaleDateString()} • ₹${Number(entry.principal).toLocaleString('en-IN')}`,
              }))}
              placeholder="Choose a calculation"
            />
          )}
        </div>

        {(error || historyError) && <p className="field-error" role="alert">{error || historyError}</p>}

        <button
          type="button"
          className="primary-button"
          onClick={handleGenerateReport}
          disabled={!selectedEntry || isGenerating}
        >
          {isGenerating ? 'Generating PDF...' : selectedEntry ? 'Generate Report' : 'Create a calculation first to generate a report.'}
        </button>
      </section>

      <section className="reports-grid">
        {isLoading || reportsOwnerId !== userId ? (
          <div className="empty-state-panel">Loading reports...</div>
        ) : displayReports.length === 0 ? (
          <div className="empty-state-panel">
            <h3>No reports yet.</h3>
            <p>Generate a report from a calculation to see it here.</p>
          </div>
        ) : displayReports.map((report) => (
          <article key={report.id} className="report-card panel">
            <div className="report-card__head">
              <div>
                <p className="eyebrow">Report</p>
                <h3>{report.name}</h3>
              </div>
              <span className="status-badge">{report.status}</span>
            </div>

            <div className="report-meta">
              <div><span>Date</span><strong>{new Date(report.date).toLocaleDateString()}</strong></div>
              <div><span>Type</span><strong>{report.type}</strong></div>
              {report.calculationId ? (
                <>
                  <div><span>Principal</span><strong>{report.principal === undefined ? 'Calculation unavailable' : `₹${Number(report.principal).toLocaleString('en-IN')}`}</strong></div>
                  <div><span>Interest</span><strong>{report.interest === undefined ? 'Calculation unavailable' : `₹${Number(report.interest).toLocaleString('en-IN')}`}</strong></div>
                  <div><span>Total</span><strong>{report.totalAmount === undefined ? 'Calculation unavailable' : `₹${Number(report.totalAmount).toLocaleString('en-IN')}`}</strong></div>
                </>
              ) : <div><span>Calculation</span><strong>Metadata only</strong></div>}
            </div>

            <div className="report-actions">
              <button type="button" className="secondary-button" onClick={() => handleDownload(report)} disabled={!report.calculationId}>View PDF</button>
              <button type="button" className="primary-button" onClick={() => handleDownload(report)} disabled={!report.calculationId}>Download PDF</button>
              <button type="button" className="danger-button" onClick={() => handleDelete(report.id)}>Delete</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
