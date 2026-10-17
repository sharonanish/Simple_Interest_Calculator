import 'dotenv/config'

import app from './app.js'
import { testDatabaseConnection } from './config/db.js'

const port = Number(process.env.PORT) || 5000

async function startServer() {
  try {
    await testDatabaseConnection()
    console.log('Database connection successful')
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`)
  }

  app.listen(port, () => {
    console.log(`Simple Interest Calculator API listening on port ${port}`)
  })
}

startServer()
