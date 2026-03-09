import { Router } from 'express'
import {
  getAllVehicleBadges,
  getVehicleBadgeById,
  getVehicleBadgeByPlateNumber,
  getAllBadgesByPlateNumber,
  getVehicleBadgeStats,
  createVehicleBadge,
  updateVehicleBadge,
  deleteVehicleBadge,
} from '../controllers/vehicle-badge.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/stats', getVehicleBadgeStats)
router.get('/by-plate/:plateNumber/all', getAllBadgesByPlateNumber)
router.get('/by-plate/:plateNumber', getVehicleBadgeByPlateNumber)
router.get('/', getAllVehicleBadges)
router.get('/:id', getVehicleBadgeById)
router.post('/', createVehicleBadge)
router.put('/:id', updateVehicleBadge)
router.delete('/:id', deleteVehicleBadge)

export default router
