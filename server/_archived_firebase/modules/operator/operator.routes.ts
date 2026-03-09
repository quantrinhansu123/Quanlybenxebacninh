/**
 * Operator Routes
 * Defines HTTP routes for Operator module
 */

import { Router } from 'express'
import * as operatorController from './controllers/operator.controller.js'
import { authenticate, authorize } from '../../middleware/auth.js'

const router = Router()

// Apply authentication to all routes
router.use(authenticate)

// GET /operators - Get all operators
router.get('/', operatorController.getAll)

// GET /operators/:id - Get operator by ID
router.get('/:id', operatorController.getById)

// POST /operators - Create operator (admin only)
router.post('/', authorize('admin'), operatorController.create)

// PUT /operators/:id - Update operator (admin only)
router.put('/:id', authorize('admin'), operatorController.update)

// DELETE /operators/:id - Delete operator (admin only)
router.delete('/:id', authorize('admin'), operatorController.remove)

// PATCH /operators/:id/toggle-active - Toggle active status (admin only)
router.patch('/:id/toggle-active', authorize('admin'), operatorController.toggleActive)

export default router
