import { Router } from 'express'
import {
  getAllVehicleTypes,
  getVehicleTypeById,
  createVehicleType,
  updateVehicleType,
  deleteVehicleType,
} from '../controllers/vehicle-type.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', getAllVehicleTypes)
router.get('/:id', getVehicleTypeById)
router.post('/', createVehicleType)
router.put('/:id', updateVehicleType)
router.delete('/:id', deleteVehicleType)

export default router

