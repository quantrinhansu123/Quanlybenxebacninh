# Webhook Support - Hệ Thống Quản Lý Bến Xe

## Trạng thái hiện tại

**❌ Chưa có webhook endpoint**

Hệ thống hiện tại đang sử dụng **polling** (SharedWorker tự động poll AppSheet API mỗi 10-300 giây).

## So sánh Polling vs Webhook

### Polling (Hiện tại)
- ✅ Đơn giản, không cần cấu hình AppSheet
- ✅ Hoạt động ngay cả khi AppSheet không hỗ trợ webhook
- ❌ Tốn tài nguyên (poll liên tục)
- ❌ Delay (phải đợi đến lần poll tiếp theo)

### Webhook (Đề xuất)
- ✅ Real-time (data được push ngay khi có thay đổi)
- ✅ Tiết kiệm tài nguyên (chỉ xử lý khi có data mới)
- ❌ Cần AppSheet hỗ trợ webhook
- ❌ Cần cấu hình webhook URL trong AppSheet

## Tạo Webhook Endpoint

Nếu AppSheet hỗ trợ webhook, có thể tạo endpoint như sau:

### 1. Webhook Controller

**File:** `server/src/controllers/webhook.controller.ts`

```typescript
import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { vehicleBadges } from '../db/schema/vehicle-badges.js'
import { syncBadgesFromAppSheet } from '../modules/fleet/controllers/badge-appsheet-sync.controller.js'

/**
 * Webhook endpoint cho AppSheet
 * AppSheet sẽ POST data đến đây khi có thay đổi
 * 
 * Endpoint: POST /api/webhooks/appsheet/badges
 */
export const appsheetBadgesWebhook = async (req: Request, res: Response) => {
  try {
    // Verify webhook secret (nếu AppSheet hỗ trợ)
    const webhookSecret = process.env.APPSHEET_WEBHOOK_SECRET
    const receivedSecret = req.headers['x-appsheet-secret']
    
    if (webhookSecret && receivedSecret !== webhookSecret) {
      return res.status(401).json({ error: 'Invalid webhook secret' })
    }

    // AppSheet có thể gửi data theo format khác nhau
    // Cần kiểm tra format thực tế từ AppSheet
    const payload = req.body

    // Transform AppSheet webhook format → sync format
    const badges = Array.isArray(payload) 
      ? payload 
      : payload.data || payload.badges || []

    if (!Array.isArray(badges) || badges.length === 0) {
      return res.status(400).json({ error: 'Invalid payload format' })
    }

    // Sử dụng lại logic sync hiện có
    const syncReq = {
      body: { badges },
    } as Request

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

    await syncBadgesFromAppSheet(syncReq, syncRes)
  } catch (error) {
    console.error('[Webhook] Error processing badges webhook:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}

/**
 * Webhook endpoint cho routes
 */
export const appsheetRoutesWebhook = async (req: Request, res: Response) => {
  // Tương tự như badges webhook
  // ...
}
```

### 2. Webhook Routes

**File:** `server/src/routes/webhook.routes.ts`

```typescript
import { Router } from 'express'
import {
  appsheetBadgesWebhook,
  appsheetRoutesWebhook,
} from '../controllers/webhook.controller.js'

const router = Router()

// Webhook endpoints KHÔNG cần authentication (AppSheet gọi từ bên ngoài)
// Nhưng cần verify webhook secret để bảo mật

router.post('/appsheet/badges', appsheetBadgesWebhook)
router.post('/appsheet/routes', appsheetRoutesWebhook)
router.post('/appsheet/vehicles', appsheetVehiclesWebhook)
router.post('/appsheet/operators', appsheetOperatorsWebhook)

export default router
```

### 3. Thêm vào index.ts

```typescript
import webhookRoutes from './routes/webhook.routes.js'

// ...

app.use('/api/webhooks', webhookRoutes)
```

## Cấu hình AppSheet Webhook

### Bước 1: Kiểm tra AppSheet có hỗ trợ webhook không

AppSheet có thể hỗ trợ webhook qua:
- **AppSheet Automation** (nếu có)
- **Third-party integration** (Zapier, Make.com, etc.)
- **Custom API calls** từ AppSheet

### Bước 2: Cấu hình Webhook URL

Nếu AppSheet hỗ trợ, cấu hình:
```
Webhook URL: https://your-domain.com/api/webhooks/appsheet/badges
Method: POST
Headers:
  Content-Type: application/json
  X-AppSheet-Secret: {webhook_secret}
```

### Bước 3: Test Webhook

```bash
# Test với curl
curl -X POST http://localhost:3000/api/webhooks/appsheet/badges \
  -H "Content-Type: application/json" \
  -H "X-AppSheet-Secret: your-secret" \
  -d '{
    "badges": [
      {
        "badgeNumber": "TEST-001",
        "plateNumber": "99H01234",
        "badgeType": "Buýt",
        "status": "active"
      }
    ]
  }'
```

## Hybrid Approach (Polling + Webhook)

Có thể kết hợp cả hai:

1. **Webhook** cho real-time updates (nếu AppSheet hỗ trợ)
2. **Polling** làm backup/fallback nếu webhook fail

```typescript
// Trong useAppSheetPolling hook
useEffect(() => {
  // Nếu có webhook, giảm tần suất polling
  const interval = webhookEnabled ? 300_000 : 10_000 // 5 phút vs 10 giây
  
  // ...
}, [webhookEnabled])
```

## Lưu ý bảo mật

1. **Webhook Secret**: Luôn verify secret để tránh fake requests
2. **Rate Limiting**: Giới hạn số lượng requests/giờ
3. **IP Whitelist**: Chỉ cho phép IP của AppSheet (nếu có)
4. **HTTPS**: Luôn dùng HTTPS cho webhook endpoint

## Kết luận

- **Hiện tại**: Hệ thống dùng polling (hoạt động tốt)
- **Tương lai**: Có thể thêm webhook nếu AppSheet hỗ trợ
- **Khuyến nghị**: Giữ polling làm fallback, thêm webhook nếu cần real-time hơn
