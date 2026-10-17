import { Router } from 'express'

import { getProfile, updateProfile } from '../controllers/userController.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const userRoutes = Router()

userRoutes.use(requireAuth)
userRoutes.get('/profile', getProfile)
userRoutes.put('/profile', updateProfile)