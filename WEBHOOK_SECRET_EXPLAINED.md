# Giải Thích: APPSHEET_WEBHOOK_SECRET

## ❓ Câu hỏi: Secret này lấy từ AppSheet API không?

**Trả lời: KHÔNG** ❌

`APPSHEET_WEBHOOK_SECRET` **KHÔNG phải** lấy từ AppSheet API. Đây là secret key mà **bạn tự tạo** để bảo mật webhook endpoint.

## 🔑 Phân Biệt 2 Loại Key

### 1. AppSheet API Key (`GTVT_APPSHEET_API_KEY`)
- **Mục đích:** Dùng để **gọi AppSheet API** (lấy data từ AppSheet)
- **Nơi lấy:** AppSheet Settings → Security → Application Access Key
- **Format:** `V2-xxxx-xxxx-xxxx` hoặc `{V2-xxxx-xxxx-xxxx}`
- **Dùng ở đâu:** 
  - Frontend polling AppSheet API
  - Backend sync từ AppSheet
- **Header:** `ApplicationAccessKey: {apiKey}`

### 2. Webhook Secret (`APPSHEET_WEBHOOK_SECRET`)
- **Mục đích:** Dùng để **verify webhook requests** (xác thực request từ AppSheet)
- **Nơi lấy:** **Bạn tự tạo** (không có trong AppSheet)
- **Format:** Bất kỳ string nào (nên dùng random hex)
- **Dùng ở đâu:**
  - Webhook endpoint verify incoming requests
- **Header:** `X-AppSheet-Secret: {secret}`

## 📋 So Sánh

| | AppSheet API Key | Webhook Secret |
|---|---|---|
| **Lấy từ đâu** | AppSheet Settings | Tự tạo |
| **Mục đích** | Gọi AppSheet API | Verify webhook |
| **Hướng** | App → AppSheet | AppSheet → App |
| **Bắt buộc** | ✅ Có | ⚠️ Tùy chọn (nhưng nên có) |

## 🔐 Cách Tạo Webhook Secret

### Cách 1: Tạo Secret Mới (Khuyến nghị)

```bash
# Tạo random secret (32 bytes = 64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Kết quả ví dụ: `a1b2c3d4e5f6...` (64 ký tự)

Thêm vào `server/.env`:
```env
APPSHEET_WEBHOOK_SECRET=a1b2c3d4e5f6...
```

### Cách 2: Dùng AppSheet API Key (Đơn giản)

Nếu muốn dùng API key hiện có:

```env
# Trong server/.env
APPSHEET_WEBHOOK_SECRET=${GTVT_APPSHEET_API_KEY}
```

**Lưu ý:** Cách này ít an toàn hơn vì API key có thể bị lộ.

## ⚙️ Cấu Hình Trong AppSheet

Khi cấu hình webhook trong AppSheet, bạn cần:

1. **Webhook URL:** `https://your-domain.com/api/webhooks/appsheet/badges`
2. **Header:** `X-AppSheet-Secret: {secret}` (dùng secret bạn vừa tạo)
3. **Body:** `{"badges": [{{ChangedRows}}]}`

**Lưu ý:** Secret này phải **giống nhau** ở 2 nơi:
- `server/.env`: `APPSHEET_WEBHOOK_SECRET=xxx`
- AppSheet webhook config: Header `X-AppSheet-Secret: xxx`

## 🔄 Flow Hoạt Động

### 1. AppSheet → Webhook (Có Secret)
```
AppSheet gửi:
POST /api/webhooks/appsheet/badges
Headers:
  X-AppSheet-Secret: your-secret-key
Body:
  {"badges": [...]}

Server verify:
if (receivedSecret === APPSHEET_WEBHOOK_SECRET) {
  ✅ Accept và xử lý
} else {
  ❌ Reject (401 Unauthorized)
}
```

### 2. App → AppSheet API (Có API Key)
```
App gửi:
POST https://api.appsheet.com/...
Headers:
  ApplicationAccessKey: V2-xxxx-xxxx
Body:
  {"Action": "Find", ...}

AppSheet verify API key → Trả về data
```

## ✅ Tóm Tắt

1. **`APPSHEET_WEBHOOK_SECRET`** = Secret **tự tạo**, KHÔNG lấy từ AppSheet
2. **`GTVT_APPSHEET_API_KEY`** = API key **lấy từ AppSheet Settings**
3. Có thể dùng API key làm webhook secret, nhưng nên tạo secret riêng
4. Secret phải **giống nhau** ở `.env` và AppSheet webhook config

## 🎯 Khuyến Nghị

**Tạo secret riêng** cho webhook để:
- ✅ Bảo mật tốt hơn
- ✅ Có thể rotate secret độc lập
- ✅ Không ảnh hưởng đến API key nếu secret bị lộ
