import { execute } from '../config/db.js'

export function getHealth(_request, response) {
  response.status(200).json({
    success: true,
    message: 'Simple Interest Calculator API is running',
  })
}

export async function getDatabaseHealth(_request, response, next) {
  try {
    await execute('SELECT 1 AS connection_status')
    response.status(200).json({
      success: true,
      message: 'Database connection successful',
    })
  } catch (error) {
    const databaseError = new Error('Database connection unavailable')
    databaseError.statusCode = 503
    databaseError.publicMessage = 'Database connection unavailable'
    databaseError.cause = error
    next(databaseError)
  }
}
