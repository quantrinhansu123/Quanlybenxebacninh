/**
 * Dispatch Routes
 * API endpoints for dispatch operations
 */

import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import {
  getAllDispatchRecords,
  getDispatchRecordById,
  createDispatchRecord,
  updateDispatchRecord,
  recordPassengerDrop,
  issuePermit,
  processPayment,
  issueDepartureOrder,
  recordExit,
  updateEntryImage,
  updateDispatchStatus,
  depart,
  deleteDispatchRecord,
  cancelDispatchRecord,
} from './controllers/dispatch.controller.js'

const router = Router()

// Apply authentication to all routes
router.use(authenticate)

// GET routes
router.get('/', getAllDispatchRecords)
router.get('/:id', getDispatchRecordById)

// Workflow endpoints
router.post('/', createDispatchRecord)
router.put('/:id', updateDispatchRecord)
router.delete('/:id', deleteDispatchRecord)
router.post('/:id/cancel', cancelDispatchRecord)
router.post('/:id/passenger-drop', recordPassengerDrop)
router.post('/:id/permit', issuePermit)
router.post('/:id/payment', processPayment)
router.post('/:id/departure-order', issueDepartureOrder)
router.post('/:id/exit', recordExit)
router.patch('/:id/entry-image', updateEntryImage)

// Legacy deprecated endpoints
router.put('/:id/status', updateDispatchStatus)
router.post('/:id/depart', depart)

export default router
