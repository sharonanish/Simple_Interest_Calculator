import mysql from 'mysql2/promise'

let pool

function getDatabaseConfig() {
  const required = ['DB_HOST', 'DB_USER', 'DB_NAME']
  const missing = required.filter((key) => !process.env[key])

  if (missing.length) {
    throw new Error(`Missing required database environment variable(s): ${missing.join(', ')}`)
  }

  const port = Number(process.env.DB_PORT || 3306)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be a valid TCP port number.')
  }

  return {
    host: process.env.DB_HOST,
    port,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  }
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...getDatabaseConfig(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000,
    })
  }

  return pool
}

export async function execute(sql, parameters = []) {
  return getPool().execute(sql, parameters)
}

export async function testDatabaseConnection() {
  const connection = await getPool().getConnection()

  try {
    await connection.execute('SELECT 1')
  } finally {
    connection.release()
  }
}

export async function closeDatabasePool() {
  if (pool) {
    const activePool = pool
    pool = undefined
    await activePool.end()
  }
}
