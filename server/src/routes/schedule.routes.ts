import { Router } from 'express'
import {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  validateScheduleDay,
  checkTripLimit,
} from '../controllers/schedule.controller.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', getAllSchedules)
router.get('/trip-limit', checkTripLimit)
router.post('/validate-day', validateScheduleDay)
router.get('/:id', getScheduleById)
router.post('/', authorize('admin'), createSchedule)
router.put('/:id', authorize('admin'), updateSchedule)
router.delete('/:id', authorize('admin'), deleteSchedule)

export default router

