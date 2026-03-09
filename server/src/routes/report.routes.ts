import { Router } from 'express'
import {
  getInvoices,
  getVehicleLogs,
  getStationActivity,
  getInvalidVehicles,
  getRevenue,
  exportExcel,
} from '../controllers/report.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/invoices', getInvoices)
router.get('/vehicle-logs', getVehicleLogs)
router.get('/station-activity', getStationActivity)
router.get('/invalid-vehicles', getInvalidVehicles)
router.get('/revenue', getRevenue)
router.get('/export/:type', exportExcel)

export default router

