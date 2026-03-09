# AppSheet ID Matching - Cách Khớp Dữ Liệu Bằng ID

## Tổng Quan

Khi AppSheet gửi webhook, mỗi record sẽ có một **`id`** (AppSheet's internal ID). Webhook cần khớp record này với database bằng cách sử dụng `id` hoặc các trường khác.

## Cách AppSheet Truyền ID

### Format Payload từ AppSheet

AppSheet có thể gửi data theo các format sau:

#### Format 1: Array trực tiếp với `id`
```json
[
  {
    "id": "abc123xyz",           // ← AppSheet ID
    "badgeNumber": "PH-001",
    "plateNumber": "99H01234",
    "badgeType": "Buýt",
    "status": "active"
  },
  {
    "id": "def456uvw",
    "badgeNumber": "PH-002",
    "plateNumber": "99H05678",
    "badgeType": "Xe khách",
    "status": "active"
  }
]
```

#### Format 2: Object với `data` array
```json
{
  "data": [
    {
      "id": "abc123xyz",
      "badgeNumber": "PH-001",
      ...
    }
  ]
}
```

#### Format 3: AppSheet API Format (với `Rows`)
```json
{
  "Rows": [
    {
      "_RowNumber": 1,
      "id": "abc123xyz",
      "badgeNumber": "PH-001",
      ...
    }
  ]
}
```

## Cách Webhook Khớp Dữ Liệu

### Chiến Lược Matching

Hiện tại, webhook sử dụng các trường **unique** để khớp:

| Loại Dữ Liệu | Trường Khớp (Unique) | Giải Thích |
|-------------|---------------------|------------|
| **Badges** | `firebaseId` | Lưu AppSheet `id` vào `firebaseId` |
| **Vehicles** | `plateNumber` | Khớp bằng biển số xe |
| **Operators** | `firebaseId` | Lưu AppSheet `id` vào `firebaseId` |
| **Routes** | `routeCode` | Khớp bằng mã tuyến |

### Logic Matching trong Code

#### 1. Badges Webhook

```typescript
// AppSheet gửi:
{
  "id": "abc123xyz",        // ← AppSheet ID
  "badgeNumber": "PH-001",
  "plateNumber": "99H01234"
}

// Webhook xử lý:
const badge = {
  firebaseId: req.body.id,  // ← Lưu AppSheet ID vào firebaseId
  badgeNumber: req.body.badgeNumber,
  plateNumber: req.body.plateNumber,
  ...
}

// Database upsert:
await db
  .insert(vehicleBadges)
  .values(badge)
  .onConflictDoUpdate({
    target: vehicleBadges.firebaseId,  // ← Match bằng firebaseId
    set: { ... }
  })
```

**Câu lệnh SQL tương đương:**
```sql
-- Nếu firebaseId đã tồn tại → UPDATE
UPDATE vehicle_badges 
SET badge_number = excluded.badge_number,
    plate_number = excluded.plate_number,
    ...
WHERE firebase_id = 'abc123xyz';

-- Nếu chưa tồn tại → INSERT
INSERT INTO vehicle_badges (firebase_id, badge_number, ...)
VALUES ('abc123xyz', 'PH-001', ...);
```

#### 2. Vehicles Webhook

```typescript
// AppSheet gửi:
{
  "id": "xyz789abc",
  "plateNumber": "99H01234",
  "seatCapacity": 45
}

// Webhook xử lý:
const vehicle = {
  firebaseId: req.body.id,      // ← Lưu AppSheet ID
  plateNumber: normalize(req.body.plateNumber),  // ← Normalize: "99H-01234" → "99H01234"
  ...
}

// Database upsert:
await db
  .insert(vehicles)
  .values(vehicle)
  .onConflictDoUpdate({
    target: vehicles.plateNumber,  // ← Match bằng plateNumber (đã normalize)
    set: { ... }
  })
```

**Câu lệnh SQL:**
```sql
-- Match bằng plate_number (đã normalize)
UPDATE vehicles 
SET seat_count = excluded.seat_count,
    firebase_id = COALESCE(excluded.firebase_id, vehicles.firebase_id),
    ...
WHERE plate_number = '99H01234';
```

#### 3. Operators Webhook

```typescript
// AppSheet gửi:
{
  "id": "op123",
  "code": "DV001",
  "name": "Công ty ABC"
}

// Webhook xử lý:
const operator = {
  firebaseId: req.body.id,  // ← AppSheet ID
  code: req.body.code,
  name: req.body.name,
  ...
}

// Database upsert:
await db
  .insert(operators)
  .values(operator)
  .onConflictDoUpdate({
    target: operators.firebaseId,  // ← Match bằng firebaseId
    set: { ... }
  })
```

#### 4. Routes Webhook

```typescript
// AppSheet gửi:
{
  "id": "route456",
  "routeCode": "HN-HCM-001",
  "departureStation": "Hà Nội",
  "arrivalStation": "TP.HCM"
}

// Webhook xử lý:
const route = {
  firebaseId: req.body.id,  // ← AppSheet ID
  routeCode: req.body.routeCode,
  ...
}

// Database upsert:
await db
  .insert(routes)
  .values(route)
  .onConflictDoUpdate({
    target: routes.routeCode,  // ← Match bằng routeCode
    set: { ... }
  })
```

## Mapping Table: AppSheet ID → Database

### Badges
```
AppSheet ID (id) → vehicle_badges.firebase_id
```

### Vehicles
```
AppSheet ID (id) → vehicles.firebase_id
Match Key: vehicles.plate_number (normalized)
```

### Operators
```
AppSheet ID (id) → operators.firebase_id
```

### Routes
```
AppSheet ID (id) → routes.firebase_id
Match Key: routes.route_code
```

## Ví Dụ Thực Tế

### Scenario: AppSheet gửi webhook khi cập nhật badge

**Request từ AppSheet:**
```http
POST /api/webhooks/appsheet/badges
Content-Type: application/json
X-AppSheet-Secret: your-secret-key

{
  "id": "badge_abc123",
  "badgeNumber": "PH-001",
  "plateNumber": "99H-01234",
  "badgeType": "Buýt",
  "status": "active",
  "expiryDate": "2025-12-31"
}
```

**Webhook xử lý:**
1. Verify secret: `X-AppSheet-Secret` === `APPSHEET_WEBHOOK_SECRET`
2. Extract data: `id = "badge_abc123"`
3. Normalize: `plateNumber = "99H01234"` (remove dashes)
4. Lookup: Tìm record có `firebase_id = "badge_abc123"`
5. Upsert:
   - Nếu tồn tại → UPDATE các trường
   - Nếu chưa tồn tại → INSERT mới

**SQL thực thi:**
```sql
-- PostgreSQL ON CONFLICT
INSERT INTO vehicle_badges (
  firebase_id,
  badge_number,
  plate_number,
  badge_type,
  status,
  expiry_date
) VALUES (
  'badge_abc123',
  'PH-001',
  '99H01234',
  'Buýt',
  'active',
  '2025-12-31'
)
ON CONFLICT (firebase_id) 
DO UPDATE SET
  badge_number = EXCLUDED.badge_number,
  plate_number = EXCLUDED.plate_number,
  badge_type = EXCLUDED.badge_type,
  status = EXCLUDED.status,
  expiry_date = EXCLUDED.expiry_date,
  updated_at = NOW();
```

## Cấu Hình AppSheet Webhook

### Bước 1: Tạo Webhook Action trong AppSheet

Trong AppSheet, tạo **Automation** hoặc **Action**:

```
When: Record Updated
Action: HTTP Request
Method: POST
URL: https://your-domain.com/api/webhooks/appsheet/badges
Headers:
  Content-Type: application/json
  X-AppSheet-Secret: {APPSHEET_WEBHOOK_SECRET}
Body:
{
  "id": [id],
  "badgeNumber": [badgeNumber],
  "plateNumber": [plateNumber],
  "badgeType": [badgeType],
  "status": [status],
  "expiryDate": [expiryDate]
}
```

### Bước 2: Test Webhook

```bash
# Test với curl
curl -X POST http://localhost:3000/api/webhooks/appsheet/badges \
  -H "Content-Type: application/json" \
  -H "X-AppSheet-Secret: your-secret-key" \
  -d '{
    "id": "test_badge_123",
    "badgeNumber": "TEST-001",
    "plateNumber": "99H01234",
    "badgeType": "Buýt",
    "status": "active"
  }'
```

## Lưu Ý Quan Trọng

1. **AppSheet `id` là unique**: Mỗi record trong AppSheet có một `id` duy nhất
2. **Lưu `id` vào `firebaseId`**: Để dễ dàng match lại sau này
3. **Normalize data**: Chuẩn hóa `plateNumber`, `routeCode` trước khi match
4. **Upsert logic**: Sử dụng `ON CONFLICT` để tự động INSERT hoặc UPDATE
5. **Preserve user edits**: Không ghi đè các trường user đã chỉnh sửa (nếu có logic bảo vệ)

## Troubleshooting

### Vấn đề: Record không được update

**Nguyên nhân:**
- `id` từ AppSheet không khớp với `firebaseId` trong database
- Trường match key (plateNumber, routeCode) bị thay đổi

**Giải pháp:**
```sql
-- Kiểm tra firebaseId
SELECT id, firebase_id, badge_number 
FROM vehicle_badges 
WHERE firebase_id = 'badge_abc123';

-- Nếu không có, kiểm tra bằng badgeNumber
SELECT id, firebase_id, badge_number 
FROM vehicle_badges 
WHERE badge_number = 'PH-001';
```

### Vấn đề: Duplicate records

**Nguyên nhân:**
- AppSheet gửi `id` khác nhau cho cùng một record
- Match key không unique

**Giải pháp:**
- Đảm bảo `firebaseId` là unique trong database
- Sử dụng `ON CONFLICT` với đúng target column
