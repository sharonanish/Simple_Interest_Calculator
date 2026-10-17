import cors from 'cors'
import express from 'express'

import { apiRoutes } from './routes/apiRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFoundHandler } from './middleware/notFoundHandler.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use('/api', apiRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

export default app
