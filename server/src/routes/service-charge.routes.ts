import { Router } from 'express'
import {
  getAllServiceCharges,
  getServiceChargeById,
  createServiceCharge,
  deleteServiceCharge,
  getAllServiceTypes,
} from '../controllers/service-charge.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/types', getAllServiceTypes)
router.get('/', getAllServiceCharges)
router.get('/:id', getServiceChargeById)
router.post('/', createServiceCharge)
router.delete('/:id', deleteServiceCharge)

export default router

