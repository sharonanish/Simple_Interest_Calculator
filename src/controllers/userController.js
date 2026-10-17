import { execute } from '../config/db.js'

const PROFILE_COLUMNS = 'CAST(id AS CHAR) AS id, name, email, created_at'
const MAX_NAME_LENGTH = 100

function formatProfile(row) {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  }
}

function readUpdatedName(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must contain a name.' }
  }

  if (Object.keys(body).some((key) => key !== 'name')) {
    return { error: 'Only the name field can be updated.' }
  }

  if (typeof body.name !== 'string') {
    return { error: 'Name is required and must be a string.' }
  }

  const name = body.name.trim()
  if (!name || name.length > MAX_NAME_LENGTH) {
    return { error: `Name must contain between 1 and ${MAX_NAME_LENGTH} characters.` }
  }

  return { name }
}

export async function getProfile(request, response, next) {
  try {
    const [rows] = await execute(
      `SELECT ${PROFILE_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
      [request.user.id],
    )

    if (!rows.length) {
      return response.status(404).json({ success: false, message: 'User not found.' })
    }

    return response.status(200).json({ success: true, user: formatProfile(rows[0]) })
  } catch (error) {
    return next(error)
  }
}

export async function updateProfile(request, response, next) {
  const input = readUpdatedName(request.body)
  if (input.error) {
    return response.status(400).json({ success: false, message: input.error })
  }

  try {
    await execute('UPDATE users SET name = ? WHERE id = ?', [input.name, request.user.id])
    const [rows] = await execute(
      `SELECT ${PROFILE_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
      [request.user.id],
    )

    if (!rows.length) {
      return response.status(404).json({ success: false, message: 'User not found.' })
    }

    return response.status(200).json({ success: true, user: formatProfile(rows[0]) })
  } catch (error) {
    return next(error)
  }
}