import jwt from 'jsonwebtoken'

export const JWT_ISSUER = 'simple-interest-calculator-api'
export const JWT_EXPIRES_IN = '1h'
export const JWT_EXPIRES_IN_SECONDS = 60 * 60

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    const error = new Error('JWT_SECRET must contain at least 32 bytes.')
    error.statusCode = 500
    error.publicMessage = 'Authentication is not configured.'
    throw error
  }

  return secret
}

export function signAccessToken(userId) {
  return jwt.sign(
    { sub: String(userId) },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: JWT_EXPIRES_IN, issuer: JWT_ISSUER },
  )
}