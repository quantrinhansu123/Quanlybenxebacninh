import { Router } from 'express'
import {
  getAllRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  getLegacyRoutes,
} from '../controllers/route.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', getAllRoutes)
router.get('/legacy', getLegacyRoutes)
router.get('/:id', getRouteById)
router.post('/', createRoute)
router.put('/:id', updateRoute)
router.delete('/:id', deleteRoute)

export default router

