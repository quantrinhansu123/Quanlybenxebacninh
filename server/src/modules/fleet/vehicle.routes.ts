/**
 * Vehicle Routes
 * API endpoints for vehicle operations
 */

import { Router } from 'express'
import bodyParser from 'body-parser'
import { authenticate } from '../../middleware/auth.js'
import {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleDocumentAuditLogs,
  getAllDocumentAuditLogs,
} from './controllers/vehicle.controller.js'
import { syncVehiclesFromAppSheet } from './controllers/vehicle-appsheet-sync.controller.js'
import { syncBadgesFromAppSheet } from './controllers/badge-appsheet-sync.controller.js'
import { syncOperatorsFromAppSheet } from './controllers/operator-appsheet-sync.controller.js'
import { syncRoutesFromAppSheet } from './controllers/route-appsheet-sync.controller.js'
import { syncSchedulesFromAppSheet } from './controllers/schedule-appsheet-sync.controller.js'

const router = Router()

// Apply authentication to all routes
router.use(authenticate)

// Vehicle CRUD
router.get('/', getAllVehicles)
router.get('/document-audit-logs/all', getAllDocumentAuditLogs)
router.get('/:id/document-audit-logs', getVehicleDocumentAuditLogs)
router.get('/:id', getVehicleById)
router.post('/appsheet-sync', bodyParser.json({ limit: '5mb' }), syncVehiclesFromAppSheet)
router.post('/badges/appsheet-sync', bodyParser.json({ limit: '5mb' }), syncBadgesFromAppSheet)
router.post('/operators/appsheet-sync', bodyParser.json({ limit: '2mb' }), syncOperatorsFromAppSheet)
router.post('/routes/appsheet-sync', bodyParser.json({ limit: '2mb' }), syncRoutesFromAppSheet)
router.post('/schedules/appsheet-sync', bodyParser.json({ limit: '5mb' }), syncSchedulesFromAppSheet)
router.post('/', createVehicle)
router.put('/:id', updateVehicle)
router.delete('/:id', deleteVehicle)

export default router
