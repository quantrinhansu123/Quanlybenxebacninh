import { Router } from 'express'
import {
  getAllShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
} from '../controllers/shift.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', getAllShifts)
router.get('/:id', getShiftById)
router.post('/', createShift)
router.put('/:id', updateShift)
router.delete('/:id', deleteShift)

export default router

