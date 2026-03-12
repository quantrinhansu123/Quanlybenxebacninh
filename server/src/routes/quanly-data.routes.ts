import { Router } from 'express'
import { getQuanLyData, getQuanLyStats } from '../controllers/quanly-data.controller.js'
import { optionalAuthenticate } from '../middleware/auth.js'

const router = Router()

// GET /api/quanly-data - unified data endpoint (optional auth for station filtering)
router.get('/', optionalAuthenticate, getQuanLyData)

// GET /api/quanly-data/stats - lightweight stats
router.get('/stats', getQuanLyStats)

export default router
