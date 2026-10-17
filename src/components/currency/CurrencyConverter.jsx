import { useEffect, useMemo, useState } from 'react'

import { CURRENCY_OPTIONS, convertCurrency, fetchExchangeRates, formatCurrencyValue } from '../../services/currencyService.js'

export function CurrencyConverter({ currentAmount = 0, currentCurrency = 'INR' }) {
  const [amount, setAmount] = useState(Number(currentAmount) || 0)
  const [fromCurrency, setFromCurrency] = useState(currentCurrency)
  const [toCurrency, setToCurrency] = useState('USD')
  const [rates, setRates] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [rateMeta, setRateMeta] = useState({ source: 'open.er-api.com', timestamp: '' })

  useEffect(() => {
    setAmount(Number(currentAmount) || 0)
    setFromCurrency(currentCurrency)
  }, [currentAmount, currentCurrency])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const loadRates = async () => {
      setLoading(true)
      setError('')

      try {
        const nextRates = await fetchExchangeRates({ signal: controller.signal })
        if (!isMounted) {
          return
        }

        setRates(nextRates.rates)
        setRateMeta({
          source: nextRates.source,
          timestamp: nextRates.timestamp,
        })
      } catch (fetchError) {
        if (!isMounted) {
          return
        }

        setError(fetchError.message || 'Unable to fetch exchange rates right now.')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadRates()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  const convertedAmount = useMemo(() => {
    if (!rates) {
      return 0
    }

    return convertCurrency(amount, fromCurrency, toCurrency, rates)
  }, [amount, fromCurrency, toCurrency, rates])

  const handleSwap = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  const handleReset = () => {
    setAmount(Number(currentAmount) || 0)
    setFromCurrency(currentCurrency)
    setToCurrency('USD')
  }

  const renderOption = (currencyCode) => (
    <option key={currencyCode} value={currencyCode}>
      {currencyCode}
    </option>
  )

  return (
    <section className="panel currency-panel" id="currency">
      <div className="panel-header compact-header">
        <div>
          <p className="eyebrow">Currency Converter</p>
          <h3>Convert your total amount</h3>
        </div>
      </div>

      <div className="currency-quick" aria-label="Quick conversion options">
        {['INR', 'USD', 'EUR', 'AED'].map((code) => (
          <button
            key={code}
            type="button"
            className={`quick-currency-button ${toCurrency === code ? 'active' : ''}`}
            onClick={() => setToCurrency(code)}
          >
            {code}
          </button>
        ))}
      </div>

      <div className="currency-layout">
        <div className="currency-form">
          <div className="field-group">
            <label htmlFor="currency-amount">Amount</label>
            <input
              id="currency-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value) || 0)}
            />
          </div>

          <div className="field-row two-up">
            <div className="field-group">
              <label htmlFor="currency-from">From Currency</label>
              <select id="currency-from" value={fromCurrency} onChange={(event) => setFromCurrency(event.target.value)}>
                {CURRENCY_OPTIONS.map((currency) => renderOption(currency.code))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="currency-to">To Currency</label>
              <select id="currency-to" value={toCurrency} onChange={(event) => setToCurrency(event.target.value)}>
                {CURRENCY_OPTIONS.map((currency) => renderOption(currency.code))}
              </select>
            </div>
          </div>

          <div className="button-row">
            <button type="button" className="primary-button" onClick={handleSwap}>Swap</button>
            <button type="button" className="secondary-button reset-button" onClick={handleReset}>Reset</button>
          </div>
        </div>

        <div className="currency-result-card" aria-live="polite">
          <div className="currency-meta">
            <span>Converted Amount</span>
          </div>
          {loading ? (
            <div className="currency-meta">Loading exchange rates...</div>
          ) : error ? (
            <div className="currency-meta">{error}</div>
          ) : (
            <>
              <div className="amount">{formatCurrencyValue(convertedAmount, toCurrency)}</div>
              <div className="currency-meta">
                <span>{amount > 0 ? `${formatCurrencyValue(amount, fromCurrency)} =` : '0'} {formatCurrencyValue(convertedAmount, toCurrency)}</span>
                <span>Rate source: {rateMeta.source}</span>
                <span>Last updated: {rateMeta.timestamp ? new Date(rateMeta.timestamp).toLocaleString() : 'Just now'}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
