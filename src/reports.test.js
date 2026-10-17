import 'dotenv/config'

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { test } from 'node:test'
import bcrypt from 'bcryptjs'

import app from './app.js'
import { closeDatabasePool, execute } from './config/db.js'
import { signAccessToken } from './utils/jwt.js'

test('report endpoints validate metadata and isolate each user’s reports', async (t) => {
  assert.ok(process.env.JWT_SECRET && Buffer.byteLength(process.env.JWT_SECRET, 'utf8') >= 32)
  await execute('SELECT 1')

  const suffix = randomUUID()
  const passwordHash = await bcrypt.hash(randomUUID(), 4)
  const [firstUser] = await execute(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    ['Report Test User', `report-${suffix}@example.test`, passwordHash],
  )
  const [secondUser] = await execute(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    ['Report Isolation User', `report-other-${suffix}@example.test`, passwordHash],
  )

  const userId = String(firstUser.insertId)
  const otherUserId = String(secondUser.insertId)
  const token = signAccessToken(userId)
  const otherToken = signAccessToken(otherUserId)
  let server
  let serverListening = false
  let baseUrl
  let calculationId
  let otherCalculationId
  let createdReportId
  let secondReportId

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
    const [firstCalculation] = await execute(
      `INSERT INTO calculations
        (user_id, mode, principal, rate, time, time_unit, interest, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, 'calculate-interest', 10000, 5, 2, 'years', 1000, 11000],
    )
    const [secondCalculation] = await execute(
      `INSERT INTO calculations
        (user_id, mode, principal, rate, time, time_unit, interest, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [otherUserId, 'calculate-interest', 20000, 4, 3, 'years', 2400, 22400],
    )
    calculationId = String(firstCalculation.insertId)
    otherCalculationId = String(secondCalculation.insertId)

    server = app.listen(0)
    await once(server, 'listening')
    serverListening = true
    baseUrl = `http://127.0.0.1:${server.address().port}`

    await t.test('creates report metadata without claiming a stored PDF', async () => {
      const response = await request('/api/reports', {
        method: 'POST',
        body: { reportName: '  Annual projection  ', calculationId },
      })
      const body = await response.json()
      assert.equal(response.status, 201)
      assert.equal(body.report.reportName, 'Annual projection')
      assert.equal(body.report.calculationId, calculationId)
      assert.equal(body.report.storageKey, null)
      assert.ok(body.report.createdAt)
      assert.equal(Object.hasOwn(body.report, 'userId'), false)
      assert.equal(Object.hasOwn(body.report, 'pdf'), false)
      createdReportId = body.report.id
    })

    await t.test('lists reports newest first', async () => {
      const secondResponse = await request('/api/reports', {
        method: 'POST',
        body: { name: 'A second report', storageKey: `users/${userId}/reports/annual/projection.pdf` },
      })
      const secondBody = await secondResponse.json()
      assert.equal(secondResponse.status, 201)
      assert.equal(secondBody.report.storageKey, `users/${userId}/reports/annual/projection.pdf`)
      secondReportId = secondBody.report.id

      const response = await request('/api/reports')
      const body = await response.json()
      assert.equal(response.status, 200)
      assert.equal(body.reports.length, 2)
      assert.equal(body.reports[0].id, secondReportId)
      assert.equal(body.reports[1].id, createdReportId)
    })

    await t.test('retrieves a report and deletes its record only', async () => {
      const response = await request(`/api/reports/${createdReportId}`)
      const body = await response.json()
      assert.equal(response.status, 200)
      assert.equal(body.report.id, createdReportId)

      const deletion = await request(`/api/reports/${createdReportId}`, { method: 'DELETE' })
      assert.equal(deletion.status, 200)
      assert.equal((await request(`/api/reports/${createdReportId}`)).status, 404)
      const [calculationRows] = await execute('SELECT id FROM calculations WHERE id = ? AND user_id = ?', [calculationId, userId])
      assert.equal(calculationRows.length, 1)
    })

    await t.test('requires authentication for all report endpoints', async () => {
      const responses = await Promise.all([
        request('/api/reports', { bearer: null }),
        request('/api/reports', { method: 'POST', bearer: null, body: { reportName: 'No auth' } }),
        request('/api/reports/1', { bearer: null }),
        request('/api/reports/1', { method: 'DELETE', bearer: null }),
      ])
      assert.deepEqual(responses.map((response) => response.status), [401, 401, 401, 401])
    })

    await t.test('prevents access to another user’s reports', async () => {
      assert.equal((await request(`/api/reports/${secondReportId}`, { bearer: otherToken })).status, 404)
      assert.equal((await request(`/api/reports/${secondReportId}`, { method: 'DELETE', bearer: otherToken })).status, 404)
      assert.equal((await request(`/api/reports/${secondReportId}`)).status, 200)
    })

    await t.test('rejects calculation IDs owned by another user', async () => {
      const response = await request('/api/reports', {
        method: 'POST',
        body: { reportName: 'Foreign calculation', calculationId: otherCalculationId },
      })
      assert.equal(response.status, 404)

      const reverseResponse = await request('/api/reports', {
        method: 'POST',
        bearer: otherToken,
        body: { reportName: 'Foreign calculation', calculationId },
      })
      assert.equal(reverseResponse.status, 404)
    })

    await t.test('rejects client-supplied report owners and creates under the token owner', async () => {
      const spoofed = await request('/api/reports', {
        method: 'POST',
        bearer: otherToken,
        body: { reportName: 'Spoofed owner', calculationId: otherCalculationId, userId },
      })
      assert.equal(spoofed.status, 400)

      const valid = await request('/api/reports', {
        method: 'POST',
        bearer: otherToken,
        body: { reportName: 'Other user report', calculationId: otherCalculationId },
      })
      const body = await valid.json()
      assert.equal(valid.status, 201)

      const firstReports = await (await request('/api/reports')).json()
      const secondReports = await (await request('/api/reports', { bearer: otherToken })).json()
      assert.equal(firstReports.reports.some((report) => report.id === body.report.id), false)
      assert.ok(secondReports.reports.some((report) => report.id === body.report.id))
      assert.equal((await request(`/api/reports/${body.report.id}`, { method: 'DELETE', bearer: otherToken })).status, 200)
    })

    await t.test('returns an empty report list for a user without reports', async () => {
      const response = await request('/api/reports', { bearer: otherToken })
      const body = await response.json()
      assert.equal(response.status, 200)
      assert.deepEqual(body.reports, [])
    })

    await t.test('rejects invalid report metadata and filesystem-style keys', async () => {
      const invalidBodies = [
        {},
        { reportName: '   ' },
        { reportName: 'x'.repeat(256) },
        { reportName: 'Invalid calculation', calculationId: 'not-an-id' },
        { reportName: 'Filesystem path', storageKey: 'C:\\private\\report.pdf' },
        { reportName: 'Foreign key', storageKey: `users/${otherUserId}/reports/report.pdf` },
        { reportName: 'Client user ID', userId: otherUserId },
      ]

      for (const body of invalidBodies) {
        assert.equal((await request('/api/reports', { method: 'POST', body })).status, 400)
      }
    })
  } finally {
    if (serverListening) {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
    await execute('DELETE FROM users WHERE id IN (?, ?)', [userId, otherUserId])
    await closeDatabasePool()
  }
})