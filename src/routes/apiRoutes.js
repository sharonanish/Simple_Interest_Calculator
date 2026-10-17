import { Router } from 'express'

import { authRoutes } from './authRoutes.js'
import { calculationRoutes } from './calculationRoutes.js'
import { getDatabaseHealth, getHealth } from '../controllers/healthController.js'
import { reportRoutes } from './reportRoutes.js'
import { userRoutes } from './userRoutes.js'

export const apiRoutes = Router()

apiRoutes.get('/health', getHealth)
apiRoutes.get('/health/db', getDatabaseHealth)
apiRoutes.use('/auth', authRoutes)
apiRoutes.use('/calculations', calculationRoutes)
apiRoutes.use('/users', userRoutes)
apiRoutes.use('/reports', reportRoutes)
