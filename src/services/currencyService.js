const DEFAULT_CURRENCY_API_URL = import.meta.env.VITE_CURRENCY_API_URL || 'https://open.er-api.com/v6/latest/INR'

export const CURRENCY_OPTIONS = [
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
]

export async function fetchExchangeRates({ signal } = {}) {
  const response = await fetch(DEFAULT_CURRENCY_API_URL, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Unable to load exchange rates right now. Please try again shortly.')
  }

  const payload = await response.json()
  const rates = payload?.rates && typeof payload.rates === 'object' ? payload.rates : null

  if (!rates || !Object.keys(rates).length) {
    throw new Error('Exchange rate data is not available for conversion right now.')
  }

  return {
    source: payload?.provider || 'open.er-api.com',
    base: payload?.base_code || 'INR',
    timestamp: payload?.time_last_update_utc || new Date().toISOString(),
    rates,
  }
}

export function convertCurrency(amount, fromCurrency, toCurrency, rates) {
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return 0
  }

  if (!rates || typeof rates !== 'object') {
    return 0
  }

  if (fromCurrency === toCurrency) {
    return Number(amount)
  }

  const baseAmount = fromCurrency === 'INR' ? Number(amount) : Number(amount) / Number(rates[fromCurrency] || 1)
  return baseAmount * Number(rates[toCurrency] || 1)
}

export function formatCurrencyValue(amount, currency) {
  const normalized = Number(amount) || 0
  const locale = currency === 'JPY' ? 'ja-JP' : 'en-US'

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(normalized)
}
