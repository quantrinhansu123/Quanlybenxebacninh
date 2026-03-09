# Hướng Dẫn Cấu Hình AppSheet Webhook

## ✅ Webhook Endpoints Đã Tạo

Hệ thống đã có các webhook endpoints sau:

### 1. Badges (Phù hiệu xe)
```
POST http://your-domain.com/api/webhooks/appsheet/badges
```

### 2. Vehicles (Xe)
```
POST http://your-domain.com/api/webhooks/appsheet/vehicles
```

### 3. Routes (Tuyến)
```
POST http://your-domain.com/api/webhooks/appsheet/routes
```

### 4. Operators (Đơn vị vận tải)
```
POST http://your-domain.com/api/webhooks/appsheet/operators
```

## Cách Cấu Hình AppSheet

### Bước 1: Kiểm tra AppSheet có hỗ trợ Webhook

AppSheet có thể gửi webhook qua:
- **AppSheet Automation** (nếu có)
- **Zapier/Make.com integration**
- **Custom API calls** từ AppSheet Actions

### Bước 2: Tạo Webhook Secret

**⚠️ QUAN TRỌNG:** `APPSHEET_WEBHOOK_SECRET` **KHÔNG phải** lấy từ AppSheet API.

Đây là **secret key tự tạo** để bảo mật webhook endpoint. Bạn có 2 lựa chọn:

#### Lựa chọn 1: Tạo Secret Mới (Khuyến nghị)

Thêm vào file `server/.env`:

```env
APPSHEET_WEBHOOK_SECRET=your-very-secure-random-secret-key-here
```

Tạo secret mạnh:
```bash
# Generate random secret (32 bytes = 64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Lựa chọn 2: Dùng AppSheet API Key (Đơn giản nhưng ít an toàn hơn)

Nếu muốn dùng AppSheet API key hiện có:

```env
# Dùng API key làm webhook secret (không khuyến nghị cho production)
APPSHEET_WEBHOOK_SECRET=${GTVT_APPSHEET_API_KEY}
```

**Lưu ý:** 
- AppSheet API key (`GTVT_APPSHEET_API_KEY`) dùng để **gọi AppSheet API** (lấy data)
- Webhook secret (`APPSHEET_WEBHOOK_SECRET`) dùng để **verify webhook requests** (nhận data từ AppSheet)
- Nên tạo secret riêng để bảo mật tốt hơn

### Bước 3: Cấu Hình AppSheet Automation

#### Cách 1: Sử dụng AppSheet Automation (nếu có)

1. Vào **AppSheet** → **Automation**
2. Tạo **New Automation**
3. Chọn trigger: **When data changes** → Chọn table (ví dụ: PHUHIEUXE)
4. Chọn action: **HTTP Request** hoặc **Webhook**
5. Cấu hình:

```
Method: POST
URL: https://your-domain.com/api/webhooks/appsheet/badges
Headers:
  Content-Type: application/json
  X-AppSheet-Secret: {your-webhook-secret}
Body: 
  {
    "badges": [{{ChangedRows}}]
  }
```

#### Cách 2: Sử dụng Zapier/Make.com

1. Tạo Zap/Scenario mới
2. Trigger: **AppSheet** → **New/Updated Row**
3. Action: **Webhook** → **POST**
4. Cấu hình URL và headers như trên

#### Cách 3: Sử dụng AppSheet Actions (Custom)

Nếu AppSheet hỗ trợ custom actions, tạo action:

```javascript
// AppSheet Action Code
function OnSubmit() {
  var webhookUrl = "https://your-domain.com/api/webhooks/appsheet/badges";
  var secret = "your-webhook-secret";
  var data = [CurrentRow];
  
  var response = HTTPRequest(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AppSheet-Secret": secret
    },
    body: JSON.stringify({ badges: data })
  });
  
  return response;
}
```

### Bước 4: Test Webhook

#### Test bằng curl:

```bash
# Test badges webhook
curl -X POST http://localhost:3000/api/webhooks/appsheet/badges \
  -H "Content-Type: application/json" \
  -H "X-AppSheet-Secret: your-webhook-secret" \
  -d '{
    "badges": [
      {
        "badgeNumber": "TEST-001",
        "plateNumber": "99H01234",
        "badgeType": "Buýt",
        "status": "active",
        "issueDate": "2024-01-01",
        "expiryDate": "2025-01-01"
      }
    ]
  }'
```

#### Test bằng Postman:

1. Method: **POST**
2. URL: `http://localhost:3000/api/webhooks/appsheet/badges`
3. Headers:
   - `Content-Type: application/json`
   - `X-AppSheet-Secret: your-webhook-secret`
4. Body (raw JSON):
```json
{
  "badges": [
    {
      "badgeNumber": "TEST-001",
      "plateNumber": "99H01234",
      "badgeType": "Buýt",
      "status": "active"
    }
  ]
}
```

### Bước 5: Xác minh Webhook hoạt động

1. **Check server logs:**
   ```
   [Webhook] Received badges webhook: ...
   [Webhook] Processing 1 badges
   [Webhook] Sync successful: { upserted: 1, errors: [] }
   ```

2. **Check database:**
   - Data đã được insert/update vào `vehicle_badges` table
   - Check bằng: `SELECT * FROM vehicle_badges WHERE badge_number = 'TEST-001'`

## Format Data AppSheet Gửi

### Format 1: Array trực tiếp
```json
[
  {
    "badgeNumber": "001",
    "plateNumber": "99H01234",
    ...
  }
]
```

### Format 2: Object với key
```json
{
  "badges": [
    {
      "badgeNumber": "001",
      ...
    }
  ]
}
```

### Format 3: AppSheet API format
```json
{
  "Rows": [
    {
      "SoPhuHieu": "001",
      "BienSo": "99H01234",
      ...
    }
  ]
}
```

**Lưu ý:** Webhook controller đã hỗ trợ cả 3 formats trên.

## Cấu Hình Production

### 1. Domain và HTTPS

Webhook URL production:
```
https://your-production-domain.com/api/webhooks/appsheet/badges
```

**Bắt buộc dùng HTTPS** để bảo mật.

### 2. Environment Variables

Thêm vào `server/.env` (production):
```env
APPSHEET_WEBHOOK_SECRET=production-secret-key-here
NODE_ENV=production
```

### 3. CORS Configuration

Webhook endpoints không cần CORS (server-to-server), nhưng nếu cần:

```typescript
// Trong server/src/index.ts
app.use(cors({
  origin: (origin, callback) => {
    // Allow AppSheet IPs (nếu có)
    if (!origin || origin.includes('appsheet.com')) {
      return callback(null, true)
    }
    // ... existing logic
  }
}))
```

## Troubleshooting

### Lỗi 401 Unauthorized
- Kiểm tra `X-AppSheet-Secret` header có đúng không
- Kiểm tra `APPSHEET_WEBHOOK_SECRET` trong `.env`

### Lỗi 400 Bad Request
- Kiểm tra format data AppSheet gửi
- Xem server logs để biết format cụ thể

### Data không sync vào DB
- Kiểm tra server logs: `[Webhook] Sync successful`
- Kiểm tra database connection
- Kiểm tra data format có đúng schema không

### Webhook không nhận được
- Kiểm tra firewall/network
- Kiểm tra URL có đúng không
- Test bằng curl/Postman trước

## Monitoring

### Logs để theo dõi:

```bash
# Xem webhook logs
tail -f server.log | grep "\[Webhook\]"

# Hoặc trong server console
[Webhook] Received badges webhook
[Webhook] Processing X badges
[Webhook] Sync successful: { upserted: X, errors: [] }
```

## Kết Hợp Polling + Webhook

Có thể dùng cả hai:

1. **Webhook** cho real-time updates
2. **Polling** làm backup (giảm tần suất xuống 5 phút)

```typescript
// Trong useAppSheetPolling
const interval = webhookEnabled ? 300_000 : 10_000 // 5 phút vs 10 giây
```

## Tóm Tắt

✅ **Webhook endpoints đã tạo:**
- `/api/webhooks/appsheet/badges`
- `/api/webhooks/appsheet/vehicles`
- `/api/webhooks/appsheet/routes`
- `/api/webhooks/appsheet/operators`

✅ **Cần làm:**
1. Thêm `APPSHEET_WEBHOOK_SECRET` vào `.env`
2. Cấu hình AppSheet Automation/Webhook
3. Test webhook
4. Deploy và cấu hình production URL

✅ **Lợi ích:**
- Real-time data sync
- Tiết kiệm tài nguyên
- Giảm delay
