import 'dotenv/config'

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { test } from 'node:test'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import app from './app.js'
import { closeDatabasePool, execute } from './config/db.js'

test('authentication endpoints validate inputs and protect account data', async (t) => {
  assert.ok(process.env.JWT_SECRET && Buffer.byteLength(process.env.JWT_SECRET, 'utf8') >= 32)
  await execute('SELECT 1')

  const email = `auth-${randomUUID()}@example.test`
  const password = 'correct-horse-battery-staple'
  const server = app.listen(0)
  await once(server, 'listening')
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  let userId

  const request = (path, options = {}) => fetch(`${baseUrl}${path}`, options)
  const postJson = (path, body) => request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  try {
    await t.test('health endpoints remain available', async () => {
      assert.equal((await request('/api/health')).status, 200)
      assert.equal((await request('/api/health/db')).status, 200)
    })

    await t.test('signup normalizes input and returns no password hash', async () => {
      const response = await postJson('/api/auth/signup', {
        name: '  Auth Integration Test  ',
        email: email.toUpperCase(),
        password,
      })
      const body = await response.json()
      userId = body.user?.id

      assert.equal(response.status, 201)
      assert.equal(body.user.name, 'Auth Integration Test')
      assert.equal(body.user.email, email)
      assert.equal(Object.hasOwn(body.user, 'password_hash'), false)
      assert.equal(JSON.stringify(body).includes(password), false)
      const [storedRows] = await execute('SELECT password_hash FROM users WHERE id = ?', [userId])
      assert.notEqual(storedRows[0].password_hash, password)
      assert.equal(await bcrypt.compare(password, storedRows[0].password_hash), true)
    })

    await t.test('duplicate signup is rejected', async () => {
      const response = await postJson('/api/auth/signup', { name: 'Another Name', email, password })
      assert.equal(response.status, 409)
    })

    await t.test('invalid password receives a generic login error', async () => {
      const response = await postJson('/api/auth/login', { email, password: 'incorrect-password' })
      const body = await response.json()
      assert.equal(response.status, 401)
      assert.equal(body.message, 'Invalid email or password.')
    })

    let token
    await t.test('valid login returns an expiring bearer token', async () => {
      const response = await postJson('/api/auth/login', { email: email.toUpperCase(), password })
      const body = await response.json()

      assert.equal(response.status, 200)
      assert.equal(body.tokenType, 'Bearer')
      assert.equal(typeof body.token, 'string')
      const payload = jwt.decode(body.token)
      assert.ok(payload.exp > Math.floor(Date.now() / 1000))
      assert.equal(body.user.email, email)
      assert.equal(Object.hasOwn(body.user, 'password_hash'), false)
      token = body.token
    })

    await t.test('current user rejects missing credentials', async () => {
      assert.equal((await request('/api/auth/me')).status, 401)
    })

    await t.test('current user rejects malformed credentials', async () => {
      assert.equal((await request('/api/auth/me', { headers: { authorization: 'Bearer invalid-token' } })).status, 401)
    })

    await t.test('current user returns only the authenticated user', async () => {
      const response = await request('/api/auth/me', { headers: { authorization: `Bearer ${token}` } })
      const body = await response.json()
      assert.equal(response.status, 200)
      assert.equal(body.user.id, userId)
      assert.equal(body.user.email, email)
      assert.equal(Object.hasOwn(body.user, 'password_hash'), false)
    })

    await t.test('logout explains bearer token disposal without claiming revocation', async () => {
      const response = await request('/api/auth/logout', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      })
      const body = await response.json()
      assert.equal(response.status, 200)
      assert.match(body.message, /discard the bearer token/i)
      assert.equal((await request('/api/auth/me', { headers: { authorization: `Bearer ${token}` } })).status, 200)
    })
  } finally {
    if (userId) await execute('DELETE FROM users WHERE id = ?', [userId])
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    await closeDatabasePool()
  }
})