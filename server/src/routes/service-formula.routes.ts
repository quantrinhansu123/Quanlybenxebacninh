import { Router } from 'express'
import {
  getAllServiceFormulas,
  getServiceFormulaById,
  createServiceFormula,
  updateServiceFormula,
  deleteServiceFormula,
} from '../controllers/service-formula.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', getAllServiceFormulas)
router.get('/:id', getServiceFormulaById)
router.post('/', createServiceFormula)
router.put('/:id', updateServiceFormula)
router.delete('/:id', deleteServiceFormula)

export default router

