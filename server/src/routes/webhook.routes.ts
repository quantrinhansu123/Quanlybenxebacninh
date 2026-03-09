/**
 * Webhook Routes
 * Endpoints để nhận webhook từ AppSheet
 * 
 * Lưu ý: Webhook endpoints KHÔNG cần authentication (AppSheet gọi từ bên ngoài)
 * Nhưng cần verify webhook secret để bảo mật
 */
import { Router } from 'express'
import {
  appsheetBadgesWebhook,
  appsheetVehiclesWebhook,
  appsheetRoutesWebhook,
  appsheetOperatorsWebhook,
} from '../controllers/webhook.controller.js'

const router = Router()

// Webhook endpoints - không cần authenticate middleware
// AppSheet sẽ gọi từ bên ngoài

router.post('/appsheet/badges', appsheetBadgesWebhook)
router.post('/appsheet/vehicles', appsheetVehiclesWebhook)
router.post('/appsheet/routes', appsheetRoutesWebhook)
router.post('/appsheet/operators', appsheetOperatorsWebhook)

// Health check cho webhook
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'webhook' })
})

export default router
