import { Router } from 'express'
import { getQuanLyData, getQuanLyStats } from '../controllers/quanly-data.controller.js'

const router = Router()

// GET /api/quanly-data - unified data endpoint
router.get('/', getQuanLyData)

// GET /api/quanly-data/stats - lightweight stats
router.get('/stats', getQuanLyStats)

export default router
