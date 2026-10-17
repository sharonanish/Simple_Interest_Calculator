export function isValidCalculationRecord(entry) {
  if (!entry || typeof entry !== 'object') {
    return false
  }

  const principal = Number(entry.principal)
  const rate = Number(entry.rate)
  const time = Number(entry.time)

  if (!Number.isFinite(principal) || principal <= 0) {
    return false
  }

  if (!Number.isFinite(rate) || rate < 0) {
    return false
  }

  if (!Number.isFinite(time) || time <= 0) {
    return false
  }

  return true
}

export function formatDateLabel(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'N/A'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function getModeLabel(mode) {
  const labels = {
    'calculate-interest': 'Calculate Interest',
    'find-principal': 'Find Principal',
    'find-rate': 'Find Interest Rate',
    'find-time': 'Find Time',
  }

  return labels[mode] || 'Calculate Interest'
}
