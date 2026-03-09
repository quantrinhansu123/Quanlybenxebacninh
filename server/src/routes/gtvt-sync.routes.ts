import { Router } from 'express'
import { getGtvtContractStatus, getGtvtLastSync, syncGtvtRoutesSchedules } from '../controllers/gtvt-sync.controller.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)
router.use(authorize('admin'))

router.get('/contract-status', getGtvtContractStatus)
router.post('/sync-routes-schedules', syncGtvtRoutesSchedules)
router.get('/last-sync', getGtvtLastSync)

export default router

