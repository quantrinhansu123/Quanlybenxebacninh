import { Router } from 'express'
import { login, register, getCurrentUser, updateProfile } from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.post('/login', login)
router.post('/register', register)
router.get('/me', authenticate, getCurrentUser)
router.put('/profile', authenticate, updateProfile)

export default router

