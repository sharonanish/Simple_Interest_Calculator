const MODES = new Set([
  'calculate-interest',
  'find-principal',
  'find-rate',
  'find-time',
])

const MAX_MONEY = 9999999999999.99
const MAX_RATE = 9999.9999
const MAX_TIME = 999999.9999

export class CalculationValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CalculationValidationError'
    this.statusCode = 400
  }
}

function roundTo(value, decimalPlaces) {
  const factor = 10 ** decimalPlaces
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}

function readRequiredNumber(body, field) {
  const value = body[field]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new CalculationValidationError(`${field} must be a finite JSON number.`)
  }
  return value
}

function validateRange(field, value, { minimum, maximum, decimalPlaces }) {
  if (value < minimum) {
    throw new CalculationValidationError(`${field} must be ${minimum === 0 ? '0 or greater' : 'greater than 0'}.`)
  }

  const rounded = roundTo(value, decimalPlaces)
  if (!Number.isFinite(rounded) || rounded > maximum) {
    throw new CalculationValidationError(`${field} exceeds the supported database range.`)
  }
  if (minimum > 0 && rounded <= 0) {
    throw new CalculationValidationError(`${field} must be greater than 0 at the supported precision.`)
  }

  return rounded
}

function requiredPositive(body, field, maximum, decimalPlaces) {
  return validateRange(field, readRequiredNumber(body, field), {
    minimum: Number.EPSILON,
    maximum,
    decimalPlaces,
  })
}

function ensureDerivedRange(field, value, maximum, decimalPlaces, allowZero = false) {
  if (!Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) {
    throw new CalculationValidationError(`${field} could not be calculated from these inputs.`)
  }

  return validateRange(field, value, {
    minimum: allowZero ? 0 : Number.EPSILON,
    maximum,
    decimalPlaces,
  })
}

function readTimeUnit(body) {
  if (body.unit !== undefined && body.timeUnit !== undefined && body.unit !== body.timeUnit) {
    throw new CalculationValidationError('unit and timeUnit must match when both are provided.')
  }

  const timeUnit = body.timeUnit ?? body.unit
  if (timeUnit !== 'years' && timeUnit !== 'months') {
    throw new CalculationValidationError('timeUnit must be either years or months.')
  }
  return timeUnit
}

export function calculateCalculation(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new CalculationValidationError('Request body must be a JSON object.')
  }

  const { mode } = body
  if (typeof mode !== 'string' || !MODES.has(mode)) {
    throw new CalculationValidationError('mode must be one of the supported simple-interest modes.')
  }

  const timeUnit = readTimeUnit(body)
  const timeToYears = (time) => timeUnit === 'months' ? time / 12 : time
  let principal
  let rate
  let time
  let simpleInterest
  let totalAmount

  if (mode === 'calculate-interest') {
    principal = requiredPositive(body, 'principal', MAX_MONEY, 2)
    rate = requiredPositive(body, 'rate', MAX_RATE, 4)
    time = requiredPositive(body, 'time', MAX_TIME, 4)
    simpleInterest = roundTo((principal * rate * timeToYears(time)) / 100, 2)
    totalAmount = roundTo(principal + simpleInterest, 2)
  } else if (mode === 'find-principal') {
    const interest = requiredPositive(body, 'interest', MAX_MONEY, 2)
    rate = requiredPositive(body, 'rate', MAX_RATE, 4)
    time = requiredPositive(body, 'time', MAX_TIME, 4)
    principal = roundTo((interest * 100) / (rate * timeToYears(time)), 2)
    simpleInterest = interest
    totalAmount = roundTo(principal + simpleInterest, 2)
  } else if (mode === 'find-rate') {
    principal = requiredPositive(body, 'principal', MAX_MONEY, 2)
    const interest = requiredPositive(body, 'interest', MAX_MONEY, 2)
    time = requiredPositive(body, 'time', MAX_TIME, 4)
    rate = roundTo((interest * 100) / (principal * timeToYears(time)), 4)
    simpleInterest = interest
    totalAmount = roundTo(principal + simpleInterest, 2)
  } else {
    principal = requiredPositive(body, 'principal', MAX_MONEY, 2)
    rate = requiredPositive(body, 'rate', MAX_RATE, 4)
    const interest = requiredPositive(body, 'interest', MAX_MONEY, 2)
    const timeInYears = (interest * 100) / (principal * rate)
    time = roundTo(timeUnit === 'months' ? timeInYears * 12 : timeInYears, 4)
    simpleInterest = interest
    totalAmount = roundTo(principal + simpleInterest, 2)
  }

  principal = ensureDerivedRange('principal', principal, MAX_MONEY, 2)
  rate = ensureDerivedRange('rate', rate, MAX_RATE, 4, true)
  time = ensureDerivedRange('time', time, MAX_TIME, 4)
  simpleInterest = ensureDerivedRange('interest', simpleInterest, MAX_MONEY, 2, true)
  totalAmount = ensureDerivedRange('totalAmount', totalAmount, MAX_MONEY, 2, true)

  return {
    mode,
    principal,
    rate,
    time,
    timeUnit,
    simpleInterest,
    totalAmount,
  }
}

export function formatCalculation(row) {
  return {
    id: String(row.id),
    mode: row.mode,
    principal: Number(row.principal),
    rate: Number(row.rate),
    time: Number(row.time),
    timeUnit: row.time_unit,
    interest: Number(row.interest),
    totalAmount: Number(row.total_amount),
    createdAt: row.created_at,
  }
}