function normalizeTime(value, unit) {
  const timeValue = Number(value)
  if (!Number.isFinite(timeValue)) {
    return 0
  }

  return unit === 'months' ? timeValue / 12 : timeValue
}

function formatNumber(value) {
  return Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })
}

export function calculateSimpleInterest(input) {
  const args = typeof input === 'object' && input !== null ? input : {}
  const mode = args.mode || 'calculate-interest'
  const unit = args.unit === 'months' ? 'months' : 'years'

  const principalValue = Number(args.principal)
  const rateValue = Number(args.rate)
  const timeValue = Number(args.time)
  const interestValue = Number(args.interest)

  const ensurePrincipal = () => {
    if (!Number.isFinite(principalValue) || principalValue <= 0) {
      throw new Error('Principal must be greater than 0.')
    }
  }

  const ensureRate = () => {
    if (!Number.isFinite(rateValue) || rateValue < 0) {
      throw new Error('Rate must be 0 or greater.')
    }

    if (rateValue === 0 && ['calculate-interest', 'find-principal', 'find-time'].includes(mode)) {
      throw new Error('Rate must be greater than 0.')
    }
  }

  const ensureTime = () => {
    if (!Number.isFinite(timeValue) || timeValue <= 0) {
      throw new Error('Time must be greater than 0.')
    }
  }

  const ensureInterest = () => {
    if (!Number.isFinite(interestValue) || interestValue <= 0) {
      throw new Error('Interest must be greater than 0.')
    }
  }

  if (mode === 'calculate-interest') {
    ensurePrincipal()
    ensureRate()
    ensureTime()

    const normalizedTime = normalizeTime(timeValue, unit)
    const simpleInterest = (principalValue * rateValue * normalizedTime) / 100
    const totalAmount = principalValue + simpleInterest

    return {
      principal: principalValue,
      rate: rateValue,
      time: timeValue,
      unit,
      normalizedTime,
      simpleInterest,
      totalAmount,
      mode,
      formula: `Simple Interest = (${formatNumber(principalValue)} × ${formatNumber(rateValue)} × ${formatNumber(timeValue)}) / 100`,
    }
  }

  if (mode === 'find-principal') {
    ensureInterest()
    ensureRate()
    ensureTime()

    const normalizedTime = normalizeTime(timeValue, unit)
    const principal = (interestValue * 100) / (rateValue * normalizedTime)

    if (!Number.isFinite(principal) || principal <= 0) {
      throw new Error('Principal could not be calculated. Check the inputs.')
    }

    const totalAmount = principal + interestValue

    return {
      principal,
      rate: rateValue,
      time: timeValue,
      unit,
      normalizedTime,
      simpleInterest: interestValue,
      totalAmount,
      mode,
      formula: `Principal = (${formatNumber(interestValue)} × 100) / (${formatNumber(rateValue)} × ${formatNumber(timeValue)})`,
    }
  }

  if (mode === 'find-rate') {
    ensurePrincipal()
    ensureInterest()
    ensureTime()

    const normalizedTime = normalizeTime(timeValue, unit)
    const rate = (interestValue * 100) / (principalValue * normalizedTime)

    if (!Number.isFinite(rate) || rate < 0) {
      throw new Error('Rate could not be calculated. Check the inputs.')
    }

    const totalAmount = principalValue + interestValue

    return {
      principal: principalValue,
      rate,
      time: timeValue,
      unit,
      normalizedTime,
      simpleInterest: interestValue,
      totalAmount,
      mode,
      formula: `Rate = (${formatNumber(interestValue)} × 100) / (${formatNumber(principalValue)} × ${formatNumber(timeValue)})`,
    }
  }

  if (mode === 'find-time') {
    ensurePrincipal()
    ensureRate()
    ensureInterest()

    const normalizedTime = (interestValue * 100) / (principalValue * rateValue)
    const displayTime = unit === 'months' ? normalizedTime * 12 : normalizedTime

    if (!Number.isFinite(normalizedTime) || normalizedTime <= 0) {
      throw new Error('Time could not be calculated. Check the inputs.')
    }

    const totalAmount = principalValue + interestValue

    return {
      principal: principalValue,
      rate: rateValue,
      time: displayTime,
      unit,
      normalizedTime,
      simpleInterest: interestValue,
      totalAmount,
      mode,
      formula: `Time = (${formatNumber(interestValue)} × 100) / (${formatNumber(principalValue)} × ${formatNumber(rateValue)})`,
    }
  }

  throw new Error('Unsupported calculation mode.')
}
