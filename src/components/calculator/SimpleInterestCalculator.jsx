import { useEffect, useMemo, useState } from 'react'

import { buildProjectionSeries, clearCurrentCalculation, setCurrentCalculation } from '../../services/calculationService.js'
import { ProjectionChart } from '../dashboard/ProjectionChart.jsx'
import { CustomSelect } from '../ui/CustomSelect.jsx'
import { calculateSimpleInterest } from '../../utils/simpleInterest.js'

const defaultForm = {
  principal: '',
  rate: '',
  time: '',
  interest: '',
  unit: 'years',
  mode: 'calculate-interest',
}

const modeOptions = [
  { value: 'calculate-interest', label: 'Calculate Interest' },
  { value: 'find-principal', label: 'Find Principal' },
  { value: 'find-rate', label: 'Find Interest Rate' },
  { value: 'find-time', label: 'Find Time' },
]

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

const blankResult = {
  principal: 0,
  rate: 0,
  time: 0,
  totalAmount: 0,
  simpleInterest: 0,
  unit: 'years',
  mode: 'calculate-interest',
  formula: 'Simple Interest = (P × R × T) / 100',
}

export function SimpleInterestCalculator({ onCalculate, initialResult }) {
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [result, setResult] = useState(initialResult || blankResult)
  const [projection, setProjection] = useState(() => {
    if (!initialResult || Number(initialResult.principal) <= 0 || Number(initialResult.time) <= 0) {
      return []
    }

    return buildProjectionSeries(initialResult)
  })

  useEffect(() => {
    if (initialResult) {
      setResult(initialResult)
      const validCurrent = Number(initialResult.principal) > 0 && Number(initialResult.time) > 0
      setProjection(validCurrent ? buildProjectionSeries(initialResult) : [])
    }
  }, [initialResult])

  const showPrincipalField = form.mode !== 'find-principal'
  const showRateField = form.mode !== 'find-rate'
  const showTimeField = form.mode !== 'find-time'
  const showInterestField = form.mode !== 'calculate-interest'

  const insightText = useMemo(() => {
    const principalValue = Number(form.principal || result.principal || 0)
    const rateValue = Number(form.rate || result.rate || 0)
    const timeValue = Number(form.time || result.time || 0)
    const durationLabel = form.unit === 'months' ? `${timeValue} Months` : `${timeValue} Years`
    return `At a ${rateValue}% simple interest rate over ${durationLabel}, your ${formatCurrency(principalValue)} principal generates ${formatCurrency(result.simpleInterest || 0)} in interest.`
  }, [form, result])

  useEffect(() => {
    const principalValue = Number(form.principal)
    const rateValue = Number(form.rate)
    const timeValue = Number(form.time)
    const hasValidInputs = [principalValue, rateValue, timeValue].every((value) => Number.isFinite(value) && value > 0)

    if (hasValidInputs) {
      const payload = {
        principal: principalValue,
        rate: rateValue,
        time: timeValue,
        unit: form.unit,
        mode: form.mode,
      }

      setCurrentCalculation(payload)
      setProjection(buildProjectionSeries(payload))
    } else {
      clearCurrentCalculation()
      setProjection([])
    }
  }, [form.principal, form.rate, form.time, form.unit, form.mode])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  const handleModeChange = (value) => {
    setForm((current) => ({ ...current, mode: value }))
    setErrors((current) => ({ ...current, mode: '' }))
  }

  const handleUnitChange = (value) => {
    setForm((current) => ({ ...current, unit: value }))
    setErrors((current) => ({ ...current, unit: '' }))
  }

  const handleClear = () => {
    clearCurrentCalculation()
    setForm(defaultForm)
    setErrors({})
    setResult(blankResult)
    setProjection([])
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = {
      mode: form.mode,
      unit: form.unit,
      principal: showPrincipalField ? form.principal : undefined,
      rate: showRateField ? form.rate : undefined,
      time: showTimeField ? form.time : undefined,
      interest: showInterestField ? form.interest : undefined,
    }

    try {
      const validatedResult = calculateSimpleInterest(payload)
      setIsSaving(true)
      const savedCalculation = await onCalculate?.(validatedResult, { ...form, mode: form.mode })
      const nextResult = savedCalculation ? {
        ...validatedResult,
        ...savedCalculation,
        simpleInterest: Number(savedCalculation.interest),
        totalAmount: Number(savedCalculation.totalAmount),
        unit: savedCalculation.timeUnit || savedCalculation.unit || form.unit,
        formula: validatedResult.formula,
      } : validatedResult
      const current = {
        ...nextResult,
        mode: form.mode,
        unit: nextResult.unit || form.unit,
      }

      setResult(nextResult)
      setProjection(buildProjectionSeries(current))
      setCurrentCalculation(savedCalculation || current)
      setErrors({})
    } catch (error) {
      const message = error.message
      const nextErrors = {}
      if (message.includes('Principal')) nextErrors.principal = message
      if (message.includes('Rate')) nextErrors.rate = message
      if (message.includes('Time')) nextErrors.time = message
      if (message.includes('Interest')) nextErrors.interest = message
      if (!Object.keys(nextErrors).length) nextErrors.form = message || 'Unable to save this calculation. Please try again.'
      setErrors(nextErrors)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="calculator-layout" id="calculator">
      <section className="panel calculator-panel">
        <div className="panel-header compact-header">
          <div>
            <p className="eyebrow">Calculator</p>
            <h3>Simple interest</h3>
          </div>
        </div>

        <div className="mode-selector" aria-label="Calculation modes">
          {modeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`mode-card ${form.mode === option.value ? 'active' : ''}`}
              onClick={() => handleModeChange(option.value)}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        <form className="calculator-form" onSubmit={handleSubmit} noValidate>
          <div className="field-row stacked-row">
            <div className="field-group">
              <label htmlFor="unit">Time Unit</label>
              <CustomSelect
                label=""
                className="unit-select"
                value={form.unit}
                onChange={handleUnitChange}
                options={[
                  { value: 'years', label: 'Years' },
                  { value: 'months', label: 'Months' },
                ]}
              />
            </div>
          </div>

          {showPrincipalField && (
            <div className="field-group">
              <label htmlFor="principal">Principal Amount</label>
              <input
                id="principal"
                name="principal"
                type="number"
                min="0.01"
                step="0.01"
                value={form.principal}
                onChange={handleChange}
                placeholder="10000"
                aria-invalid={Boolean(errors.principal)}
              />
              {errors.principal && <span className="field-error">{errors.principal}</span>}
            </div>
          )}

          {showRateField && (
            <div className="field-group">
              <label htmlFor="rate">Interest Rate (%)</label>
              <input
                id="rate"
                name="rate"
                type="number"
                min="0"
                step="0.01"
                value={form.rate}
                onChange={handleChange}
                placeholder="5"
                aria-invalid={Boolean(errors.rate)}
              />
              {errors.rate && <span className="field-error">{errors.rate}</span>}
            </div>
          )}

          {showTimeField && (
            <div className="field-group">
              <label htmlFor="time">Time</label>
              <input
                id="time"
                name="time"
                type="number"
                min="0.01"
                step="0.01"
                value={form.time}
                onChange={handleChange}
                placeholder="2"
                aria-invalid={Boolean(errors.time)}
              />
              {errors.time && <span className="field-error">{errors.time}</span>}
            </div>
          )}

          {showInterestField && (
            <div className="field-group">
              <label htmlFor="interest">Interest</label>
              <input
                id="interest"
                name="interest"
                type="number"
                min="0.01"
                step="0.01"
                value={form.interest}
                onChange={handleChange}
                placeholder="1000"
                aria-invalid={Boolean(errors.interest)}
              />
              {errors.interest && <span className="field-error">{errors.interest}</span>}
            </div>
          )}

          <div className="button-row">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Calculate'}
            </button>
            <button type="button" className="secondary-button reset-button" onClick={handleClear}>
              Reset
            </button>
          </div>
          {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
        </form>
      </section>

      <section className="panel results-panel" id="summary" aria-live="polite">
        <div className="result-header">
          <p className="eyebrow">Results</p>
          <h3>Calculation summary</h3>
        </div>

        <div className="result-stack">
          <div className="result-card">
            <span>Principal</span>
            <strong>{formatCurrency(result.principal)}</strong>
          </div>

          <div className="result-card highlight">
            <span>Simple Interest</span>
            <strong>{formatCurrency(result.simpleInterest)}</strong>
          </div>

          <div className="result-card total-card">
            <span>Total Amount</span>
            <strong>{formatCurrency(result.totalAmount)}</strong>
          </div>
        </div>

        <div className="breakdown">
          <div>
            <span>Rate</span>
            <strong>{result.rate}%</strong>
          </div>
          <div>
            <span>Duration</span>
            <strong>
              {result.time} {result.unit === 'months' ? 'Months' : 'Years'}
            </strong>
          </div>
        </div>

        <div className="formula-block">
          <span className="formula-label">Formula used</span>
          <strong>{result.formula || 'Simple Interest = (P × R × T) / 100'}</strong>
        </div>

        <div className="projection-preview" id="projection">
          {projection.length > 0 ? (
            <ProjectionChart data={projection} emptyMessage="Enter a principal, rate, and time to generate your projection." />
          ) : (
            <div className="chart-empty-state" role="status" aria-live="polite">
              <div className="chart-empty-icon">↗</div>
              <p>No current calculation available.</p>
            </div>
          )}
        </div>

        <div className="insight-inline">{insightText}</div>
      </section>
    </div>
  )
}
