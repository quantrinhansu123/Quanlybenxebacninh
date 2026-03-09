import { Router } from 'express'
import {
  getDashboardData,
  getStats,
  getChartData,
  getRecentActivity,
  getWarnings,
} from '../controllers/dashboard.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', getDashboardData)
router.get('/stats', getStats)
router.get('/chart', getChartData)
router.get('/chart-data', getChartData)
router.get('/recent-activity', getRecentActivity)
router.get('/warnings', getWarnings)

export default router

