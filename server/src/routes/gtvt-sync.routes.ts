import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { syncRoutesSchedules, importSchedulesFromAppSheet, getLastSync, getContractStatus, compareAppSheetSupabase } from '../controllers/gtvt-sync.controller.js'

const router = Router()

router.use(authenticate)
router.use(authorize('admin'))

router.post('/sync-routes-schedules', syncRoutesSchedules)
router.post('/import-schedules-from-appsheet', importSchedulesFromAppSheet)
router.get('/compare', compareAppSheetSupabase)
router.get('/last-sync', getLastSync)
router.get('/contract-status', getContractStatus)

export default router

