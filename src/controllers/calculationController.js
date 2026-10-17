import { execute } from '../config/db.js'
import { calculateCalculation, formatCalculation } from '../services/calculationService.js'

const CALCULATION_COLUMNS = 'id, mode, principal, rate, time, time_unit, interest, total_amount, created_at'

function readCalculationId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,19}$/.test(value)) {
    const error = new Error('Calculation id must be a positive integer.')
    error.statusCode = 400
    throw error
  }
  return value
}

export async function createCalculation(request, response, next) {
  try {
    const calculation = calculateCalculation(request.body)
    const [result] = await execute(
      `INSERT INTO calculations
        (user_id, mode, principal, rate, time, time_unit, interest, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        request.user.id,
        calculation.mode,
        calculation.principal,
        calculation.rate,
        calculation.time,
        calculation.timeUnit,
        calculation.simpleInterest,
        calculation.totalAmount,
      ],
    )
    const [rows] = await execute(
      `SELECT ${CALCULATION_COLUMNS} FROM calculations WHERE id = ? AND user_id = ? LIMIT 1`,
      [result.insertId, request.user.id],
    )

    return response.status(201).json({ success: true, calculation: formatCalculation(rows[0]) })
  } catch (error) {
    return next(error)
  }
}

export async function listCalculations(request, response, next) {
  try {
    const [rows] = await execute(
      `SELECT ${CALCULATION_COLUMNS} FROM calculations
       WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
      [request.user.id],
    )
    return response.status(200).json({ success: true, calculations: rows.map(formatCalculation) })
  } catch (error) {
    return next(error)
  }
}

export async function getCalculation(request, response, next) {
  let id
  try {
    id = readCalculationId(request.params.id)
  } catch (error) {
    return next(error)
  }

  try {
    const [rows] = await execute(
      `SELECT ${CALCULATION_COLUMNS} FROM calculations WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, request.user.id],
    )
    if (!rows.length) {
      return response.status(404).json({ success: false, message: 'Calculation not found.' })
    }
    return response.status(200).json({ success: true, calculation: formatCalculation(rows[0]) })
  } catch (error) {
    return next(error)
  }
}

export async function deleteCalculation(request, response, next) {
  let id
  try {
    id = readCalculationId(request.params.id)
  } catch (error) {
    return next(error)
  }

  try {
    const [result] = await execute(
      'DELETE FROM calculations WHERE id = ? AND user_id = ?',
      [id, request.user.id],
    )
    if (result.affectedRows === 0) {
      return response.status(404).json({ success: false, message: 'Calculation not found.' })
    }
    return response.status(200).json({ success: true, message: 'Calculation deleted.' })
  } catch (error) {
    return next(error)
  }
}