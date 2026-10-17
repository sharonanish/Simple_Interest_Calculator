import { Router } from 'express'

import {
  createCalculation,
  deleteCalculation,
  getCalculation,
  listCalculations,
} from '../controllers/calculationController.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const calculationRoutes = Router()

calculationRoutes.use(requireAuth)
calculationRoutes.post('/', createCalculation)
calculationRoutes.get('/', listCalculations)
calculationRoutes.get('/:id', getCalculation)
calculationRoutes.delete('/:id', deleteCalculation)