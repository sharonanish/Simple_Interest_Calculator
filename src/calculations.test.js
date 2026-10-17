import 'dotenv/config'

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { test } from 'node:test'
import bcrypt from 'bcryptjs'

import app from './app.js'
import { closeDatabasePool, execute } from './config/db.js'
import { signAccessToken } from './utils/jwt.js'

test('calculation endpoints validate, persist, and isolate user calculations', async (t) => {
  assert.ok(process.env.JWT_SECRET && Buffer.byteLength(process.env.JWT_SECRET, 'utf8') >= 32)
  await execute('SELECT 1')

  const suffix = randomUUID()
  const passwordHash = await bcrypt.hash(randomUUID(), 4)
  const [firstUser] = await execute(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    ['Calculation Test', `calc-${suffix}@example.test`, passwordHash],
  )
  const [secondUser] = await execute(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    ['Calculation Isolation Test', `calc-other-${suffix}@example.test`, passwordHash],
  )

  const userId = String(firstUser.insertId)
  const otherUserId = String(secondUser.insertId)
  const token = signAccessToken(userId)
  const otherToken = signAccessToken(otherUserId)
  const server = app.listen(0)
  await once(server, 'listening')
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  const firstCalculation = { mode: 'calculate-interest', principal: 10000, rate: 5, time: 2, timeUnit: 'years' }
  let savedCalculationId
  let monthCalculationId

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
    await t.test('creates a valid calculation and recalculates monetary values', async () => {
      const response = await request('/api/calculations', { method: 'POST', body: firstCalculation })
      const body = await response.json()
      assert.equal(response.status, 201)
      assert.equal(body.calculation.principal, 10000)
      assert.equal(body.calculation.rate, 5)
      assert.equal(body.calculation.time, 2)
      assert.equal(body.calculation.interest, 1000)
      assert.equal(body.calculation.totalAmount, 11000)
      assert.equal(body.calculation.mode, 'calculate-interest')
      savedCalculationId = body.calculation.id
    })

    await t.test('supports each solve-for calculation mode', async () => {
      const cases = [
        {
          input: { mode: 'find-principal', interest: 1200, rate: 5, time: 2, timeUnit: 'years' },
          expected: { principal: 12000, rate: 5, time: 2, interest: 1200, totalAmount: 13200 },
        },
        {
          input: { mode: 'find-rate', principal: 10000, interest: 1500, time: 3, timeUnit: 'years' },
          expected: { principal: 10000, rate: 5, time: 3, interest: 1500, totalAmount: 11500 },
        },
        {
          input: { mode: 'find-time', principal: 20000, rate: 6, interest: 600, timeUnit: 'months' },
          expected: { principal: 20000, rate: 6, time: 6, interest: 600, totalAmount: 20600 },
        },
      ]

      for (const { input, expected } of cases) {
        const response = await request('/api/calculations', { method: 'POST', body: input })
        const body = await response.json()
        assert.equal(response.status, 201)
        for (const [field, value] of Object.entries(expected)) {
          assert.equal(body.calculation[field], value)
        }
        assert.equal((await request(`/api/calculations/${body.calculation.id}`, { method: 'DELETE' })).status, 200)
      }
    })

    await t.test('rejects an unsupported calculation mode', async () => {
      const response = await request('/api/calculations', {
        method: 'POST',
        body: { ...firstCalculation, mode: 'compound-interest' },
      })
      assert.equal(response.status, 400)
    })

    await t.test('rejects missing and malformed numeric inputs', async () => {
      const missing = await request('/api/calculations', {
        method: 'POST',
        body: { mode: 'calculate-interest', principal: 10000, rate: 5, timeUnit: 'years' },
      })
      const malformed = await request('/api/calculations', {
        method: 'POST',
        body: { ...firstCalculation, principal: '10000' },
      })
      const invalidUnit = await request('/api/calculations', {
        method: 'POST',
        body: { ...firstCalculation, timeUnit: 'days' },
      })
      const negativeRate = await request('/api/calculations', {
        method: 'POST',
        body: { ...firstCalculation, rate: -1 },
      })
      assert.equal(missing.status, 400)
      assert.equal(malformed.status, 400)
      assert.equal(invalidUnit.status, 400)
      assert.equal(negativeRate.status, 400)
    })

    await t.test('rejects division by zero in solved modes', async () => {
      const response = await request('/api/calculations', {
        method: 'POST',
        body: { mode: 'find-principal', interest: 100, rate: 0, time: 2, timeUnit: 'years' },
      })
      assert.equal(response.status, 400)
    })

    await t.test('uses simple interest and rounds money to cents', async () => {
      const response = await request('/api/calculations', {
        method: 'POST',
        body: { ...firstCalculation, principal: 10000.125 },
      })
      const body = await response.json()
      assert.equal(response.status, 201)
      assert.equal(body.calculation.principal, 10000.13)
      assert.equal(body.calculation.interest, 1000.01)
      assert.equal(body.calculation.totalAmount, 11000.14)
      await request(`/api/calculations/${body.calculation.id}`, { method: 'DELETE' })
    })

    await t.test('converts month durations to years for interest calculation', async () => {
      const response = await request('/api/calculations', {
        method: 'POST',
        body: { mode: 'calculate-interest', principal: 12000, rate: 6, time: 6, timeUnit: 'months' },
      })
      const body = await response.json()
      assert.equal(response.status, 201)
      assert.equal(body.calculation.interest, 360)
      assert.equal(body.calculation.totalAmount, 12360)
      assert.equal(body.calculation.time, 6)
      assert.equal(body.calculation.timeUnit, 'months')
      monthCalculationId = body.calculation.id
    })

    await t.test('lists only this user’s calculations newest first', async () => {
      const response = await request('/api/calculations')
      const body = await response.json()
      assert.equal(response.status, 200)
      assert.equal(body.calculations.length, 2)
      assert.equal(body.calculations[0].id, monthCalculationId)
      assert.equal(body.calculations[1].id, savedCalculationId)
    })

    await t.test('retrieves a saved calculation', async () => {
      const response = await request(`/api/calculations/${savedCalculationId}`)
      const body = await response.json()
      assert.equal(response.status, 200)
      assert.equal(body.calculation.id, savedCalculationId)
      assert.equal(body.calculation.interest, 1000)
    })

    await t.test('deletes only the selected saved calculation', async () => {
      const response = await request(`/api/calculations/${monthCalculationId}`, { method: 'DELETE' })
      assert.equal(response.status, 200)
      assert.equal((await request(`/api/calculations/${monthCalculationId}`)).status, 404)
      assert.equal((await request(`/api/calculations/${savedCalculationId}`)).status, 200)
    })

    await t.test('requires authentication for every calculation endpoint', async () => {
      const requests = [
        request('/api/calculations', { bearer: null }),
        request('/api/calculations', { method: 'POST', bearer: null, body: firstCalculation }),
        request('/api/calculations/1', { bearer: null }),
        request('/api/calculations/1', { method: 'DELETE', bearer: null }),
      ]
      const responses = await Promise.all(requests)
      assert.deepEqual(responses.map((response) => response.status), [401, 401, 401, 401])
    })

    await t.test('prevents another user from reading or deleting a calculation', async () => {
      assert.equal((await request(`/api/calculations/${savedCalculationId}`, { bearer: otherToken })).status, 404)
      assert.equal((await request(`/api/calculations/${savedCalculationId}`, { method: 'DELETE', bearer: otherToken })).status, 404)
      assert.equal((await request(`/api/calculations/${savedCalculationId}`)).status, 200)
    })

    await t.test('ignores a client-supplied owner ID when creating a calculation', async () => {
      const response = await request('/api/calculations', {
        method: 'POST',
        bearer: otherToken,
        body: { ...firstCalculation, userId },
      })
      const body = await response.json()
      assert.equal(response.status, 201)

      const otherHistory = await (await request('/api/calculations', { bearer: otherToken })).json()
      const firstHistory = await (await request('/api/calculations')).json()
      assert.ok(otherHistory.calculations.some((entry) => entry.id === body.calculation.id))
      assert.equal(firstHistory.calculations.some((entry) => entry.id === body.calculation.id), false)
      assert.equal((await request(`/api/calculations/${body.calculation.id}`, { method: 'DELETE', bearer: otherToken })).status, 200)
    })

    await t.test('returns an empty list for a user with no history', async () => {
      const response = await request('/api/calculations', { bearer: otherToken })
      const body = await response.json()
      assert.equal(response.status, 200)
      assert.deepEqual(body.calculations, [])
    })
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    await execute('DELETE FROM users WHERE id IN (?, ?)', [userId, otherUserId])
    await closeDatabasePool()
  }
})