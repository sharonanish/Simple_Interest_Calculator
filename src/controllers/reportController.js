import { execute } from '../config/db.js'

const REPORT_COLUMNS = 'CAST(id AS CHAR) AS id, CAST(calculation_id AS CHAR) AS calculation_id, report_name, storage_key, created_at'
const MAX_REPORT_NAME_LENGTH = 255
const MAX_STORAGE_KEY_LENGTH = 1024

function createClientError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function readReportId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,19}$/.test(value)) {
    throw createClientError('Report id must be a positive integer.')
  }
  return value
}

function readCalculationId(value) {
  if (value === undefined || value === null) return null
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value)
  }
  if (typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value)) {
    return value
  }
  throw createClientError('calculationId must be a positive integer when provided.')
}

function readStorageKey(value, userId) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    throw createClientError('storageKey must be a relative object key.')
  }

  const storageKey = value.trim()
  const segments = storageKey.split('/')
  const expectedPrefix = `users/${userId}/reports/`
  if (
    !storageKey
    || storageKey.length > MAX_STORAGE_KEY_LENGTH
    || !storageKey.startsWith(expectedPrefix)
    || storageKey.includes('\\')
    || storageKey.includes(':')
    || /[\u0000-\u001f\u007f]/.test(storageKey)
    || segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw createClientError(`storageKey must be a relative object key under ${expectedPrefix}.`)
  }

  return storageKey
}

function readCreateInput(body, userId) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createClientError('Request body must be a JSON object.')
  }

  const allowedFields = new Set(['reportName', 'name', 'calculationId', 'storageKey'])
  if (Object.keys(body).some((field) => !allowedFields.has(field))) {
    throw createClientError('Request contains unsupported report fields.')
  }
  if (body.reportName !== undefined && body.name !== undefined && body.reportName !== body.name) {
    throw createClientError('reportName and name must match when both are provided.')
  }

  const reportNameValue = body.reportName ?? body.name
  if (typeof reportNameValue !== 'string') {
    throw createClientError('reportName is required and must be a string.')
  }

  const reportName = reportNameValue.trim()
  if (!reportName || reportName.length > MAX_REPORT_NAME_LENGTH) {
    throw createClientError(`reportName must contain between 1 and ${MAX_REPORT_NAME_LENGTH} characters.`)
  }

  return {
    reportName,
    calculationId: readCalculationId(body.calculationId),
    storageKey: readStorageKey(body.storageKey, userId),
  }
}

function formatReport(row) {
  return {
    id: String(row.id),
    calculationId: row.calculation_id === null ? null : String(row.calculation_id),
    reportName: row.report_name,
    storageKey: row.storage_key,
    createdAt: row.created_at,
  }
}

export async function createReport(request, response, next) {
  let input
  try {
    input = readCreateInput(request.body, request.user.id)
  } catch (error) {
    return next(error)
  }

  try {
    if (input.calculationId) {
      const [calculations] = await execute(
        'SELECT id FROM calculations WHERE id = ? AND user_id = ? LIMIT 1',
        [input.calculationId, request.user.id],
      )
      if (!calculations.length) {
        return response.status(404).json({ success: false, message: 'Calculation not found.' })
      }
    }

    const [result] = await execute(
      'INSERT INTO reports (user_id, calculation_id, report_name, storage_key) VALUES (?, ?, ?, ?)',
      [request.user.id, input.calculationId, input.reportName, input.storageKey],
    )
    const [rows] = await execute(
      `SELECT ${REPORT_COLUMNS} FROM reports WHERE id = ? AND user_id = ? LIMIT 1`,
      [result.insertId, request.user.id],
    )
    return response.status(201).json({ success: true, report: formatReport(rows[0]) })
  } catch (error) {
    return next(error)
  }
}

export async function listReports(request, response, next) {
  try {
    const [rows] = await execute(
      `SELECT ${REPORT_COLUMNS} FROM reports
       WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
      [request.user.id],
    )
    return response.status(200).json({ success: true, reports: rows.map(formatReport) })
  } catch (error) {
    return next(error)
  }
}

export async function getReport(request, response, next) {
  let id
  try {
    id = readReportId(request.params.id)
  } catch (error) {
    return next(error)
  }

  try {
    const [rows] = await execute(
      `SELECT ${REPORT_COLUMNS} FROM reports WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, request.user.id],
    )
    if (!rows.length) {
      return response.status(404).json({ success: false, message: 'Report not found.' })
    }
    return response.status(200).json({ success: true, report: formatReport(rows[0]) })
  } catch (error) {
    return next(error)
  }
}

export async function deleteReport(request, response, next) {
  let id
  try {
    id = readReportId(request.params.id)
  } catch (error) {
    return next(error)
  }

  try {
    const [result] = await execute(
      'DELETE FROM reports WHERE id = ? AND user_id = ?',
      [id, request.user.id],
    )
    if (result.affectedRows === 0) {
      return response.status(404).json({ success: false, message: 'Report not found.' })
    }
    return response.status(200).json({ success: true, message: 'Report deleted.' })
  } catch (error) {
    return next(error)
  }
}