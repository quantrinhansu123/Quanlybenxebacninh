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
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', getAllSchedules)
router.get('/trip-limit', checkTripLimit)
router.post('/validate-day', validateScheduleDay)
router.get('/:id', getScheduleById)
router.post('/', createSchedule)
router.put('/:id', updateSchedule)
router.delete('/:id', deleteSchedule)

export default router

