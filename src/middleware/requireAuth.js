import jwt from 'jsonwebtoken'

import { getJwtSecret, JWT_ISSUER } from '../utils/jwt.js'

export function requireAuth(request, response, next) {
  const authorization = request.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(\S+)$/i)

  if (!match) {
    return response.status(401).json({ success: false, message: 'Authentication required.' })
  }

  let secret
  try {
    secret = getJwtSecret()
  } catch (error) {
    return next(error)
  }

  try {
    const payload = jwt.verify(match[1], secret, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
    })

    if (!payload || typeof payload.sub !== 'string' || !/^\d+$/.test(payload.sub)) {
      return response.status(401).json({ success: false, message: 'Invalid or expired authentication.' })
    }

    request.user = { id: payload.sub }
    return next()
  } catch {
    return response.status(401).json({ success: false, message: 'Invalid or expired authentication.' })
  }
}