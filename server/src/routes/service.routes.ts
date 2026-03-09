import { Router } from 'express'
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from '../controllers/service.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', getAllServices)
router.get('/:id', getServiceById)
router.post('/', createService)
router.put('/:id', updateService)
router.delete('/:id', deleteService)

export default router

