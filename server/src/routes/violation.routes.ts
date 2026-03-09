import { Router } from 'express'
import {
  getAllViolations,
  getViolationById,
  createViolation,
  updateViolation,
  getAllViolationTypes,
} from '../controllers/violation.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/types', getAllViolationTypes)
router.get('/', getAllViolations)
router.get('/:id', getViolationById)
router.post('/', createViolation)
router.put('/:id', updateViolation)

export default router

