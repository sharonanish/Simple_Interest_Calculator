import { Router } from 'express'

import { getCurrentUser, login, logout, signup } from '../controllers/authController.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const authRoutes = Router()

authRoutes.post('/signup', signup)
authRoutes.post('/login', login)
authRoutes.get('/me', requireAuth, getCurrentUser)
authRoutes.post('/logout', requireAuth, logout)