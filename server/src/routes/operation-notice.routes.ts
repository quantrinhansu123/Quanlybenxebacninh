import { Router } from 'express'
import { getOperationNotices, proxyPdf } from '../controllers/operation-notice.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)
router.get('/', getOperationNotices)
router.get('/proxy-pdf', proxyPdf)

export default router
