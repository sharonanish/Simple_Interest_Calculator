import bcrypt from 'bcryptjs'

import { execute } from '../config/db.js'
import { signAccessToken, JWT_EXPIRES_IN_SECONDS } from '../utils/jwt.js'

const BCRYPT_ROUNDS = 12
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SAFE_USER_COLUMNS = 'CAST(id AS CHAR) AS id, name, email, created_at'
const INVALID_CREDENTIALS = 'Invalid email or password.'

function normalizeEmail(value) {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

function getSignupInput(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = normalizeEmail(body?.email)
  const password = body?.password

  if (!name || name.length > 100) {
    return { error: 'Name is required and must be 100 characters or fewer.' }
  }
  if (email.length > 255 || !EMAIL_PATTERN.test(email)) {
    return { error: 'Enter a valid email address.' }
  }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return { error: 'Password must be at least 8 characters and no more than 72 bytes.' }
  }

  return { name, email, password }
}

function formatUser(row) {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  }
}

export async function signup(request, response, next) {
  const input = getSignupInput(request.body)
  if (input.error) {
    return response.status(400).json({ success: false, message: input.error })
  }

  try {
    const [existingUsers] = await execute('SELECT id FROM users WHERE email = ? LIMIT 1', [input.email])
    if (existingUsers.length) {
      return response.status(409).json({ success: false, message: 'An account with this email already exists.' })
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
    const [result] = await execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [input.name, input.email, passwordHash],
    )
    const [rows] = await execute(
      `SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
      [result.insertId],
    )

    return response.status(201).json({ success: true, user: formatUser(rows[0]) })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({ success: false, message: 'An account with this email already exists.' })
    }
    return next(error)
  }
}

export async function login(request, response, next) {
  const email = normalizeEmail(request.body?.email)
  const password = request.body?.password

  if (!email || email.length > 255 || !EMAIL_PATTERN.test(email) || typeof password !== 'string') {
    return response.status(401).json({ success: false, message: INVALID_CREDENTIALS })
  }

  try {
    const [rows] = await execute(
      `SELECT ${SAFE_USER_COLUMNS}, password_hash FROM users WHERE email = ? LIMIT 1`,
      [email],
    )
    const user = rows[0]
    const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false

    if (!user || !passwordMatches) {
      return response.status(401).json({ success: false, message: INVALID_CREDENTIALS })
    }

    const token = signAccessToken(user.id)
    return response.status(200).json({
      success: true,
      token,
      tokenType: 'Bearer',
      expiresInSeconds: JWT_EXPIRES_IN_SECONDS,
      user: formatUser(user),
    })
  } catch (error) {
    return next(error)
  }
}

export async function getCurrentUser(request, response, next) {
  try {
    const [rows] = await execute(
      `SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
      [request.user.id],
    )

    if (!rows.length) {
      return response.status(401).json({ success: false, message: 'Invalid or expired authentication.' })
    }

    return response.status(200).json({ success: true, user: formatUser(rows[0]) })
  } catch (error) {
    return next(error)
  }
}

export function logout(_request, response) {
  return response.status(200).json({
    success: true,
    message: 'Logged out. Discard the bearer token; it remains valid until it expires.',
  })
}