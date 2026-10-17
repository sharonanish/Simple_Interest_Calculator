import 'dotenv/config'

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { test } from 'node:test'
import bcrypt from 'bcryptjs'

import app from './app.js'
import { closeDatabasePool, execute } from './config/db.js'
import { signAccessToken } from './utils/jwt.js'

test('profile endpoints return safe data and only update the authenticated user', async (t) => {
  assert.ok(process.env.JWT_SECRET && Buffer.byteLength(process.env.JWT_SECRET, 'utf8') >= 32)
  await execute('SELECT 1')

  const suffix = randomUUID()
  const password = `profile-test-${randomUUID()}`
  const passwordHash = await bcrypt.hash(password, 4)
  const firstEmail = `profile-${suffix}@example.test`
  const secondEmail = `profile-other-${suffix}@example.test`
  const [firstInsert] = await execute(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    ['Profile Test User', firstEmail, passwordHash],
  )
  const [secondInsert] = await execute(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    ['Other Profile User', secondEmail, passwordHash],
  )

  const userId = String(firstInsert.insertId)
  const otherUserId = String(secondInsert.insertId)
  const token = signAccessToken(userId)
  const otherToken = signAccessToken(otherUserId)
  const missingUserToken = signAccessToken('999999999999999999')
  const server = app.listen(0)
  let serverListening = false
  let baseUrl

  const request = (path, { method = 'GET', bearer = token, body } = {}) => {
    const headers = {}
    if (bearer) headers.authorization = `Bearer ${bearer}`
    if (body !== undefined) headers['content-type'] = 'application/json'
    return fetch(`${baseUrl}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  }

  try {
    await once(server, 'listening')
    serverListening = true
    baseUrl = `http://127.0.0.1:${server.address().port}`

    await t.test('retrieves the authenticated profile without protected data', async () => {
      const response = await request('/api/users/profile')
      const body = await response.json()
      assert.equal(response.status, 200)
      assert.equal(body.user.id, userId)
      assert.equal(body.user.name, 'Profile Test User')
      assert.equal(body.user.email, firstEmail)
      assert.ok(body.user.createdAt)
      assert.equal(Object.hasOwn(body.user, 'password_hash'), false)
      assert.equal(JSON.stringify(body).includes(password), false)
    })

    await t.test('updates only the name and returns the safe updated profile', async () => {
      const response = await request('/api/users/profile', {
        method: 'PUT',
        body: { name: '  Updated Profile Name  ' },
      })
      const body = await response.json()
      assert.equal(response.status, 200)
      assert.equal(body.user.name, 'Updated Profile Name')
      assert.equal(body.user.email, firstEmail)
      assert.equal(body.user.id, userId)
      assert.equal(Object.hasOwn(body.user, 'password_hash'), false)
    })

    await t.test('rejects missing, blank, overlong, and non-string names', async () => {
      const bodies = [{}, { name: '  ' }, { name: 'n'.repeat(101) }, { name: 42 }]
      for (const body of bodies) {
        assert.equal((await request('/api/users/profile', { method: 'PUT', body })).status, 400)
      }
    })

    await t.test('rejects attempts to update email or protected fields', async () => {
      const response = await request('/api/users/profile', {
        method: 'PUT',
        body: { name: 'Must Not Apply', email: 'changed@example.test', password_hash: 'replaced' },
      })
      assert.equal(response.status, 400)
      const profile = await (await request('/api/users/profile')).json()
      assert.equal(profile.user.name, 'Updated Profile Name')
      assert.equal(profile.user.email, firstEmail)
    })

    await t.test('rejects missing and invalid authentication on both endpoints', async () => {
      const responses = await Promise.all([
        request('/api/users/profile', { bearer: null }),
        request('/api/users/profile', { bearer: 'not-a-valid-token' }),
        request('/api/users/profile', { method: 'PUT', bearer: null, body: { name: 'Unauthenticated' } }),
        request('/api/users/profile', { method: 'PUT', bearer: 'not-a-valid-token', body: { name: 'Invalid' } }),
      ])
      assert.deepEqual(responses.map((response) => response.status), [401, 401, 401, 401])
    })

    await t.test('another user can see only their own profile and cannot target this user', async () => {
      const otherProfileResponse = await request('/api/users/profile', { bearer: otherToken })
      const otherProfile = await otherProfileResponse.json()
      assert.equal(otherProfileResponse.status, 200)
      assert.equal(otherProfile.user.id, otherUserId)
      assert.equal(otherProfile.user.email, secondEmail)

      const attemptedUpdate = await request('/api/users/profile', {
        method: 'PUT',
        bearer: otherToken,
        body: { name: 'Cross-user change', userId, id: userId },
      })
      assert.equal(attemptedUpdate.status, 400)

      const ownProfile = await (await request('/api/users/profile')).json()
      assert.equal(ownProfile.user.name, 'Updated Profile Name')
      assert.equal(ownProfile.user.email, firstEmail)
      const unchangedOtherProfile = await (await request('/api/users/profile', { bearer: otherToken })).json()
      assert.equal(unchangedOtherProfile.user.name, 'Other Profile User')
      assert.equal(unchangedOtherProfile.user.email, secondEmail)

      const otherUserUpdate = await request('/api/users/profile', {
        method: 'PUT',
        bearer: otherToken,
        body: { name: 'Other Profile Updated' },
      })
      const updatedOtherProfile = await otherUserUpdate.json()
      assert.equal(otherUserUpdate.status, 200)
      assert.equal(updatedOtherProfile.user.name, 'Other Profile Updated')
      const stillUnchangedFirstProfile = await (await request('/api/users/profile')).json()
      assert.equal(stillUnchangedFirstProfile.user.name, 'Updated Profile Name')
    })

    await t.test('returns not found when the authenticated user record is missing', async () => {
      const profile = await request('/api/users/profile', { bearer: missingUserToken })
      const update = await request('/api/users/profile', {
        method: 'PUT',
        bearer: missingUserToken,
        body: { name: 'Orphaned Token' },
      })
      assert.equal(profile.status, 404)
      assert.equal(update.status, 404)
    })

    await t.test('email and password hash remain unchanged in storage', async () => {
      const [rows] = await execute('SELECT email, password_hash FROM users WHERE id = ?', [userId])
      assert.equal(rows[0].email, firstEmail)
      assert.equal(await bcrypt.compare(password, rows[0].password_hash), true)
    })
  } finally {
    if (serverListening) {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
    await execute('DELETE FROM users WHERE id IN (?, ?)', [userId, otherUserId])
    await closeDatabasePool()
  }
})