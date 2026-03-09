import { Router } from 'express'
import {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../controllers/location.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', getAllLocations)
router.get('/:id', getLocationById)
router.post('/', createLocation)
router.put('/:id', updateLocation)
router.delete('/:id', deleteLocation)

export default router

