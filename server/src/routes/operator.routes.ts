import { Router } from 'express'
import {
  getAllOperators,
  getLegacyOperators,
  getOperatorById,
  createOperator,
  updateOperator,
  deleteOperator,
  updateLegacyOperator,
  deleteLegacyOperator,
  getNextOperatorCode,
  checkTaxCodeExists,
} from '../controllers/operator.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/next-code', getNextOperatorCode)
router.get('/check-tax-code', checkTaxCodeExists)
router.get('/', getAllOperators)
router.get('/legacy', getLegacyOperators)
router.get('/:id', getOperatorById)
router.post('/', createOperator)
router.put('/:id', updateOperator)
router.delete('/:id', deleteOperator)

// Legacy (RTDB) operator routes
router.put('/legacy/:id', updateLegacyOperator)
router.delete('/legacy/:id', deleteLegacyOperator)

export default router

