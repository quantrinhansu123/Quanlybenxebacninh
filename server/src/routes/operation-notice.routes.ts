import { Router } from 'express'
import { getOperationNotices, proxyPdf, generateOperationNoticeFileUrls } from '../controllers/operation-notice.controller.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)
router.get('/', getOperationNotices)
router.get('/proxy-pdf', proxyPdf)
router.post('/generate-file-urls', authorize('admin'), generateOperationNoticeFileUrls)

export default router
