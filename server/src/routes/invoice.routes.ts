import { Router } from 'express'
import {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  updateInvoicePayment,
} from '../controllers/invoice.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', getAllInvoices)
router.get('/:id', getInvoiceById)
router.post('/', createInvoice)
router.put('/:id', updateInvoice)
router.patch('/:id/payment', updateInvoicePayment)

export default router

