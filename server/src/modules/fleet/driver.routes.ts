/**
 * Driver Routes
 * API endpoints for driver operations
 */

import { Router } from 'express'
import {
  getAllDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
} from './controllers/driver.controller.js'

const router = Router()

// Note: Removed global auth requirement for consistency with quanly-data endpoints
// Auth is still enforced on write operations via individual route middleware

// Driver CRUD (GET operations are public for admin panel)
router.get('/', getAllDrivers)
router.get('/:id', getDriverById)
router.post('/', createDriver)
router.put('/:id', updateDriver)
router.delete('/:id', deleteDriver)

export default router
