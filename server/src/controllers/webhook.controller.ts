/**
 * Webhook Controller
 * Nhận webhook từ AppSheet khi có data thay đổi
 */
import { Request, Response } from 'express'
import { syncBadgesFromAppSheet } from '../modules/fleet/controllers/badge-appsheet-sync.controller.js'
import { syncVehiclesFromAppSheet } from '../modules/fleet/controllers/vehicle-appsheet-sync.controller.js'
import { syncRoutesFromAppSheet } from '../modules/fleet/controllers/route-appsheet-sync.controller.js'
import { syncOperatorsFromAppSheet } from '../modules/fleet/controllers/operator-appsheet-sync.controller.js'

/**
 * Webhook endpoint cho AppSheet Badges (PHUHIEUXE)
 * AppSheet sẽ POST data đến đây khi có thay đổi
 * 
 * Endpoint: POST /api/webhooks/appsheet/badges
 */
export const appsheetBadgesWebhook = async (req: Request, res: Response) => {
  try {
    // Verify webhook secret (nếu có cấu hình)
    const webhookSecret = process.env.APPSHEET_WEBHOOK_SECRET
    const receivedSecret = req.headers['x-appsheet-secret'] || req.headers['x-webhook-secret']
    
    if (webhookSecret && receivedSecret !== webhookSecret) {
      console.warn('[Webhook] Invalid secret received')
      return res.status(401).json({ error: 'Invalid webhook secret' })
    }

    console.log('[Webhook] Received badges webhook:', {
      headers: req.headers,
      bodyKeys: Object.keys(req.body || {}),
    })

    // AppSheet có thể gửi data theo format khác nhau
    // Format 1: { badges: [...] }
    // Format 2: { data: [...] }
    // Format 3: [...] (array trực tiếp)
    let badges = []
    
    if (Array.isArray(req.body)) {
      badges = req.body
    } else if (req.body?.badges && Array.isArray(req.body.badges)) {
      badges = req.body.badges
    } else if (req.body?.data && Array.isArray(req.body.data)) {
      badges = req.body.data
    } else if (req.body?.Rows && Array.isArray(req.body.Rows)) {
      // AppSheet API format
      badges = req.body.Rows
    } else {
      console.error('[Webhook] Invalid payload format:', req.body)
      return res.status(400).json({ error: 'Invalid payload format. Expected array or {badges: [...]}' })
    }

    if (badges.length === 0) {
      return res.status(400).json({ error: 'Empty badges array' })
    }

    console.log(`[Webhook] Processing ${badges.length} badges`)

    // Sử dụng lại logic sync hiện có
    const syncReq = {
      body: { badges },
    } as Request

    let syncResponse: any = null
    const syncRes = {
      status: (code: number) => ({
        json: (data: any) => {
          syncResponse = { code, data }
          if (code >= 400) {
            console.error('[Webhook] Sync failed:', data)
          } else {
            console.log('[Webhook] Sync successful:', data)
          }
          return res.status(code).json(data)
        },
      }),
    } as Response

    await syncBadgesFromAppSheet(syncReq, syncRes)

    // Response đã được gửi trong syncRes
  } catch (error) {
    console.error('[Webhook] Error processing badges webhook:', error)
    res.status(500).json({ error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' })
  }
}

/**
 * Webhook endpoint cho AppSheet Vehicles (XE)
 */
export const appsheetVehiclesWebhook = async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.APPSHEET_WEBHOOK_SECRET
    const receivedSecret = req.headers['x-appsheet-secret'] || req.headers['x-webhook-secret']
    
    if (webhookSecret && receivedSecret !== webhookSecret) {
      return res.status(401).json({ error: 'Invalid webhook secret' })
    }

    let vehicles = []
    if (Array.isArray(req.body)) {
      vehicles = req.body
    } else if (req.body?.vehicles && Array.isArray(req.body.vehicles)) {
      vehicles = req.body.vehicles
    } else if (req.body?.data && Array.isArray(req.body.data)) {
      vehicles = req.body.data
    } else if (req.body?.Rows && Array.isArray(req.body.Rows)) {
      vehicles = req.body.Rows
    } else {
      return res.status(400).json({ error: 'Invalid payload format' })
    }

    console.log(`[Webhook] Processing ${vehicles.length} vehicles`)

    const syncReq = { body: { vehicles } } as Request
    const syncRes = {
      status: (code: number) => ({
        json: (data: any) => {
          if (code >= 400) {
            console.error('[Webhook] Sync failed:', data)
          }
          return res.status(code).json(data)
        },
      }),
    } as Response

    await syncVehiclesFromAppSheet(syncReq, syncRes)
  } catch (error) {
    console.error('[Webhook] Error processing vehicles webhook:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}

/**
 * Webhook endpoint cho AppSheet Routes (TUYEN)
 */
export const appsheetRoutesWebhook = async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.APPSHEET_WEBHOOK_SECRET
    const receivedSecret = req.headers['x-appsheet-secret'] || req.headers['x-webhook-secret']
    
    if (webhookSecret && receivedSecret !== webhookSecret) {
      return res.status(401).json({ error: 'Invalid webhook secret' })
    }

    let routes = []
    if (Array.isArray(req.body)) {
      routes = req.body
    } else if (req.body?.routes && Array.isArray(req.body.routes)) {
      routes = req.body.routes
    } else if (req.body?.data && Array.isArray(req.body.data)) {
      routes = req.body.data
    } else if (req.body?.Rows && Array.isArray(req.body.Rows)) {
      routes = req.body.Rows
    } else {
      return res.status(400).json({ error: 'Invalid payload format' })
    }

    console.log(`[Webhook] Processing ${routes.length} routes`)

    const syncReq = { body: { routes } } as Request
    const syncRes = {
      status: (code: number) => ({
        json: (data: any) => {
          if (code >= 400) {
            console.error('[Webhook] Sync failed:', data)
          }
          return res.status(code).json(data)
        },
      }),
    } as Response

    await syncRoutesFromAppSheet(syncReq, syncRes)
  } catch (error) {
    console.error('[Webhook] Error processing routes webhook:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}

/**
 * Webhook endpoint cho AppSheet Operators (DONVIVANTAI)
 */
export const appsheetOperatorsWebhook = async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.APPSHEET_WEBHOOK_SECRET
    const receivedSecret = req.headers['x-appsheet-secret'] || req.headers['x-webhook-secret']
    
    if (webhookSecret && receivedSecret !== webhookSecret) {
      return res.status(401).json({ error: 'Invalid webhook secret' })
    }

    let operators = []
    if (Array.isArray(req.body)) {
      operators = req.body
    } else if (req.body?.operators && Array.isArray(req.body.operators)) {
      operators = req.body.operators
    } else if (req.body?.data && Array.isArray(req.body.data)) {
      operators = req.body.data
    } else if (req.body?.Rows && Array.isArray(req.body.Rows)) {
      operators = req.body.Rows
    } else {
      return res.status(400).json({ error: 'Invalid payload format' })
    }

    console.log(`[Webhook] Processing ${operators.length} operators`)

    const syncReq = { body: { operators } } as Request
    const syncRes = {
      status: (code: number) => ({
        json: (data: any) => {
          if (code >= 400) {
            console.error('[Webhook] Sync failed:', data)
          }
          return res.status(code).json(data)
        },
      }),
    } as Response

    await syncOperatorsFromAppSheet(syncReq, syncRes)
  } catch (error) {
    console.error('[Webhook] Error processing operators webhook:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}
