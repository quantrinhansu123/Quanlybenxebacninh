/**
 * Vehicle Routes
 * API endpoints for vehicle operations
 */

import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import {
  getAllVehicles,
  getVehicleById,
  lookupVehicleByPlate,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleDocumentAuditLogs,
  getAllDocumentAuditLogs,
} from './controllers/vehicle.controller.js'

const router = Router()

// Apply authentication to all routes
router.use(authenticate)

// Vehicle CRUD
router.get('/', getAllVehicles)
router.get('/document-audit-logs/all', getAllDocumentAuditLogs)
router.get('/lookup/:plate', lookupVehicleByPlate)
router.get('/:id/document-audit-logs', getVehicleDocumentAuditLogs)
router.get('/:id', getVehicleById)
router.post('/', createVehicle)
router.put('/:id', updateVehicle)
router.delete('/:id', deleteVehicle)

export default router
