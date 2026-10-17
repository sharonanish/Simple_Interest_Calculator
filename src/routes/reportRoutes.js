import { Router } from 'express'

import {
  createReport,
  deleteReport,
  getReport,
  listReports,
} from '../controllers/reportController.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const reportRoutes = Router()

reportRoutes.use(requireAuth)
reportRoutes.post('/', createReport)
reportRoutes.get('/', listReports)
reportRoutes.get('/:id', getReport)
reportRoutes.delete('/:id', deleteReport)