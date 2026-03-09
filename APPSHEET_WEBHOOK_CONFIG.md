# Hướng Dẫn Cấu Hình Webhook AppSheet - PHUHIEUXE

## Các Trường Cần Điền

### 1. **Table: PHUHIEUXE**
✅ **Đã có sẵn** - Không cần thay đổi

---

### 2. **Preset**
✅ **Giữ nguyên: Custom**

---

### 3. **Url**
📝 **Điền URL webhook của bạn:**

```
https://your-domain.com/api/webhooks/appsheet/badges
```

**Ví dụ cho localhost (test):**
```
http://localhost:3000/api/webhooks/appsheet/badges
```

**Ví dụ cho production:**
```
https://quanlybenxe.example.com/api/webhooks/appsheet/badges
```

> 💡 **Lưu ý:** Thay `your-domain.com` bằng domain thực tế của bạn

---

### 4. **HTTP Verb**
📝 **Chọn: `POST`**

Trong dropdown, chọn:
```
POST
```

---

### 5. **HTTP Content Type**
✅ **Đã đúng: `JSON`**

Giữ nguyên giá trị này.

---

### 6. **Body**
📝 **Copy và paste đoạn code sau:**

```json
{
  "badges": [
    {
      "id": "[id]",
      "badgeNumber": "[SoPhuHieu]",
      "plateNumber": "[BienSo]",
      "badgeType": "[LoaiPH]",
      "fileNumber": "[MaHoSo]",
      "operatorRef": "[Ref_DonViCapPhuHieu]",
      "issueDate": "[NgayCap]",
      "expiryDate": "[NgayHetHan]",
      "status": "[TrangThai]",
      "badgeColor": "[MauPhuHieu]",
      "issueType": "[LoaiCap]",
      "routeRef": "[Ref_Tuyen]",
      "busRouteRef": "[Ref_TuyenBuyt]",
      "routeCode": "[MaSoTuyen]",
      "routeName": "[TenTuyen]",
      "oldBadgeNumber": "[SoPhuHieuCu]",
      "renewalReason": "[LyDoCapLai]",
      "revokeDecision": "[QDThuHoi]",
      "revokeReason": "[LyDoThuHoi]",
      "revokeDate": "[NgayThuHoi]",
      "notes": "[GhiChu]"
    }
  ]
}
```

**Hoặc nếu AppSheet gửi nhiều records cùng lúc:**

```json
{
  "badges": [
    {
      "id": "[id]",
      "badgeNumber": "[SoPhuHieu]",
      "plateNumber": "[BienSo]",
      "badgeType": "[LoaiPH]",
      "issueDate": "[NgayCap]",
      "expiryDate": "[NgayHetHan]",
      "status": "[TrangThai]"
    }
  ]
}
```

> 💡 **Lưu ý:** 
> - `[id]` là AppSheet's internal ID (bắt buộc)
> - Các trường trong `[...]` là tên cột trong AppSheet table PHUHIEUXE
> - AppSheet sẽ tự động thay thế `[SoPhuHieu]`, `[BienSo]`, etc. bằng giá trị thực tế

---

### 7. **HTTP Headers**
📝 **Click "Add" và thêm header sau (format: Name: Value):**

**Header 1:**
```
X-AppSheet-Secret: 52dbeb9e92fd4fe8f6ee4189919cfeb700d56506350e4ff679b6e3562901e2e1
```

> ⚠️ **Quan trọng:** 
> - **Format phải là:** `Name: Value` (có dấu hai chấm `:` giữa tên và giá trị)
> - **KHÔNG phải** 2 trường riêng biệt (Name và Value)
> - Secret này phải khớp với giá trị `APPSHEET_WEBHOOK_SECRET` trong file `.env` của server
> - Đã tạo secret key: `52dbeb9e92fd4fe8f6ee4189919cfeb700d56506350e4ff679b6e3562901e2e1`
> - Thêm vào file `server/.env`: `APPSHEET_WEBHOOK_SECRET=52dbeb9e92fd4fe8f6ee4189919cfeb700d56506350e4ff679b6e3562901e2e1`

**Header 2 (Tùy chọn):**
```
Content-Type: application/json
```

> 💡 Thường AppSheet tự động thêm header này, nhưng nếu không có thì thêm vào

---

### 8. **Body Template** (Tùy chọn)
📝 **Có thể để trống hoặc sử dụng template file**

Nếu bạn muốn sử dụng file template riêng, tạo file `.txt` hoặc `.json` với nội dung tương tự như Body ở trên.

---

## Mapping: AppSheet Columns → Webhook Body

| AppSheet Column | Webhook Field | Bắt Buộc | Ghi Chú |
|----------------|---------------|----------|---------|
| `[id]` | `id` | ✅ | AppSheet internal ID |
| `[SoPhuHieu]` hoặc `[ID_PhuHieu]` | `badgeNumber` | ✅ | Số phù hiệu |
| `[BienSo]` | `plateNumber` | ✅ | Biển số xe |
| `[LoaiPH]` | `badgeType` | ❌ | Loại phù hiệu (Buýt, Tuyến cố định) |
| `[MaHoSo]` | `fileNumber` | ❌ | Mã hồ sơ |
| `[Ref_DonViCapPhuHieu]` | `operatorRef` | ❌ | Reference đến đơn vị cấp phù hiệu |
| `[NgayCap]` | `issueDate` | ❌ | Ngày cấp (YYYY-MM-DD) |
| `[NgayHetHan]` | `expiryDate` | ❌ | Ngày hết hạn (YYYY-MM-DD) |
| `[TrangThai]` | `status` | ❌ | Trạng thái |
| `[MauPhuHieu]` | `badgeColor` | ❌ | Màu phù hiệu |
| `[LoaiCap]` | `issueType` | ❌ | Loại cấp (Cấp mới, Cấp lại) |
| `[Ref_Tuyen]` | `routeRef` | ❌ | Reference đến tuyến cố định |
| `[Ref_TuyenBuyt]` | `busRouteRef` | ❌ | Reference đến tuyến buýt |
| `[MaSoTuyen]` | `routeCode` | ❌ | Mã số tuyến |
| `[TenTuyen]` | `routeName` | ❌ | Tên tuyến |
| `[SoPhuHieuCu]` | `oldBadgeNumber` | ❌ | Số phù hiệu cũ |
| `[LyDoCapLai]` | `renewalReason` | ❌ | Lý do cấp lại |
| `[QDThuHoi]` | `revokeDecision` | ❌ | Quyết định thu hồi |
| `[LyDoThuHoi]` | `revokeReason` | ❌ | Lý do thu hồi |
| `[NgayThuHoi]` | `revokeDate` | ❌ | Ngày thu hồi |
| `[GhiChu]` | `notes` | ❌ | Ghi chú |

---

## Ví Dụ Body Đơn Giản (Chỉ Các Trường Bắt Buộc)

Nếu bạn chỉ muốn gửi các trường cơ bản:

```json
{
  "badges": [
    {
      "id": "[id]",
      "badgeNumber": "[SoPhuHieu]",
      "plateNumber": "[BienSo]",
      "badgeType": "[LoaiPH]",
      "issueDate": "[NgayCap]",
      "expiryDate": "[NgayHetHan]",
      "status": "[TrangThai]"
    }
  ]
}
```

---

## Ví Dụ Body Đầy Đủ

```json
{
  "badges": [
    {
      "id": "[id]",
      "badgeNumber": "[SoPhuHieu]",
      "plateNumber": "[BienSo]",
      "badgeType": "[LoaiPH]",
      "fileNumber": "[MaHoSo]",
      "operatorRef": "[Ref_DonViCapPhuHieu]",
      "issueDate": "[NgayCap]",
      "expiryDate": "[NgayHetHan]",
      "status": "[TrangThai]",
      "badgeColor": "[MauPhuHieu]",
      "issueType": "[LoaiCap]",
      "routeRef": "[Ref_Tuyen]",
      "busRouteRef": "[Ref_TuyenBuyt]",
      "routeCode": "[MaSoTuyen]",
      "routeName": "[TenTuyen]",
      "oldBadgeNumber": "[SoPhuHieuCu]",
      "renewalReason": "[LyDoCapLai]",
      "revokeDecision": "[QDThuHoi]",
      "revokeReason": "[LyDoThuHoi]",
      "revokeDate": "[NgayThuHoi]",
      "notes": "[GhiChu]"
    }
  ]
}
```

---

## Kiểm Tra Sau Khi Cấu Hình

### 1. Test Webhook

Sau khi cấu hình, test bằng cách:

1. **Tạo hoặc sửa một record trong AppSheet table PHUHIEUXE**
2. **Kiểm tra logs trên server:**
   ```bash
   # Xem logs để kiểm tra webhook có nhận được request không
   npm run dev:server
   ```

3. **Kiểm tra response:**
   - Nếu thành công: Server trả về `200 OK` với `{ upserted: 1, errors: [] }`
   - Nếu lỗi: Server trả về `400` hoặc `500` với thông báo lỗi

### 2. Kiểm Tra Database

```sql
-- Kiểm tra record mới được tạo/cập nhật
SELECT id, firebase_id, badge_number, plate_number, updated_at
FROM vehicle_badges
ORDER BY updated_at DESC
LIMIT 10;
```

---

## Troubleshooting

### Lỗi: `401 Unauthorized`
**Nguyên nhân:** Secret không khớp
**Giải pháp:** 
- Kiểm tra `X-AppSheet-Secret` header trong AppSheet
- Kiểm tra `APPSHEET_WEBHOOK_SECRET` trong file `.env` của server
- Đảm bảo cả hai giá trị giống nhau

### Lỗi: `400 Bad Request - Invalid payload format`
**Nguyên nhân:** Body format không đúng
**Giải pháp:**
- Đảm bảo body là JSON hợp lệ
- Đảm bảo có trường `badges` là array
- Kiểm tra các trường bắt buộc: `id`, `badgeNumber`, `plateNumber`

### Lỗi: `500 Internal Server Error`
**Nguyên nhân:** Lỗi server
**Giải pháp:**
- Kiểm tra logs trên server để xem chi tiết lỗi
- Đảm bảo database đang chạy
- Kiểm tra kết nối database

---

## Lưu Ý Quan Trọng

1. **`id` là bắt buộc:** AppSheet phải gửi `id` để webhook có thể match với database
2. **Secret bảo mật:** Không chia sẻ `APPSHEET_WEBHOOK_SECRET` với người khác
3. **HTTPS cho production:** Luôn dùng HTTPS cho webhook URL trong production
4. **Test trước:** Test kỹ trên localhost trước khi deploy lên production

---

## Tóm Tắt Nhanh

1. ✅ **Url:** `https://your-domain.com/api/webhooks/appsheet/badges`
2. ✅ **HTTP Verb:** `POST`
3. ✅ **HTTP Content Type:** `JSON`
4. ✅ **Body:** Copy template ở trên
5. ✅ **HTTP Headers:** Thêm `X-AppSheet-Secret: 52dbeb9e92fd4fe8f6ee4189919cfeb700d56506350e4ff679b6e3562901e2e1`

Sau khi điền xong, **Save** và test bằng cách tạo/sửa một record trong AppSheet!
