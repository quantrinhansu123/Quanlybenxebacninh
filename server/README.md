# Backend API - Hệ thống Quản lý Bến Xe

Backend API sử dụng **Node.js + Express.js + Firebase Realtime Database**.

## Cài đặt nhanh

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo file `.env`:
```env
PORT=3000
NODE_ENV=development
FIREBASE_DATABASE_URL=https://webbenxe-default-rtdb.asia-southeast1.firebasedatabase.app/
JWT_SECRET=your_very_secure_random_secret_key_here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

3. Seed dữ liệu mẫu:
```bash
npm run seed
```

4. Chạy server:
```bash
npm run dev
```

## Thông tin đăng nhập mặc định

- Username: `admin` | Password: `123456` (Admin)
- Username: `dieudo` | Password: `123456` (Dispatcher)
- Username: `ketoan` | Password: `123456` (Accountant)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Drivers
- `GET /api/drivers` - Lấy danh sách lái xe
- `GET /api/drivers/:id` - Lấy thông tin lái xe
- `POST /api/drivers` - Tạo lái xe mới
- `PUT /api/drivers/:id` - Cập nhật lái xe
- `DELETE /api/drivers/:id` - Xóa lái xe

### Vehicles
- `GET /api/vehicles` - Lấy danh sách xe
- `GET /api/vehicles/:id` - Lấy thông tin xe
- `POST /api/vehicles` - Tạo xe mới
- `PUT /api/vehicles/:id` - Cập nhật xe
- `DELETE /api/vehicles/:id` - Xóa xe

### Dispatch
- `GET /api/dispatch` - Lấy danh sách điều độ
- `GET /api/dispatch/:id` - Lấy thông tin điều độ
- `POST /api/dispatch` - Tạo bản ghi điều độ
- `PATCH /api/dispatch/:id/status` - Cập nhật trạng thái
- `POST /api/dispatch/:id/permit` - Cấp phép
- `POST /api/dispatch/:id/payment` - Xử lý thanh toán
- `POST /api/dispatch/:id/depart` - Ghi nhận xuất bến

### Reports
- `GET /api/reports/invoices` - Báo cáo hóa đơn
- `GET /api/reports/vehicle-logs` - Nhật ký xe
- `GET /api/reports/station-activity` - Hoạt động bến
- `GET /api/reports/invalid-vehicles` - Xe không hợp lệ
- `GET /api/reports/revenue` - Báo cáo doanh thu
- `GET /api/reports/export/:type` - Xuất Excel (chưa implement)

## Database

Firebase Realtime Database tự động tạo collections khi sử dụng API:
- `users` - Người dùng
- `operators` - Đơn vị vận tải
- `drivers` - Lái xe
- `vehicles` - Xe
- `vehicle_documents` - Giấy tờ xe
- `dispatch_records` - Bản ghi điều độ
- `routes` - Tuyến đường
- `locations` - Bến xe
- `shifts` - Ca trực
- `services` - Dịch vụ
- `invoices` - Hóa đơn

## Authentication

API sử dụng JWT để xác thực. Sau khi đăng nhập thành công, client cần gửi token trong header:
```
Authorization: Bearer <token>
```

Tất cả các endpoint (trừ `/api/auth/login`) đều yêu cầu authentication.

## Scripts

- `npm run dev` - Development mode với hot reload
- `npm run build` - Build cho production
- `npm start` - Chạy production build
- `npm run seed` - Seed dữ liệu mẫu vào Firebase
- `npm run create-admin [user] [pass] [name]` - Tạo admin user

## Lưu ý

- Database được tạo tự động, không cần migration
- JWT_SECRET nên là chuỗi mạnh trong production (tạo bằng: `openssl rand -base64 32`)
- CORS_ORIGIN phải khớp với URL frontend
- Xem file `SETUP.md` để biết chi tiết

