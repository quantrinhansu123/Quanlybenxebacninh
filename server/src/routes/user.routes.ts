/**
 * User Routes
 * API endpoints for user management (Nhân sự)
 */
import { Router } from 'express'
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/user.controller.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/auth.js'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Only admin can manage users
router.use(authorize('admin'))

// User CRUD operations
router.get('/', getAllUsers)
router.get('/:id', getUserById)
router.post('/', createUser)
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)

export default router
