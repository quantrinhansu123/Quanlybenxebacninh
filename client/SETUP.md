# Hướng dẫn Setup

## Bước 1: Cài đặt Dependencies

```bash
cd client
npm install
```

## Bước 2: Cấu hình Environment

Tạo file `.env` trong thư mục `client`:

```env
VITE_API_URL=http://localhost:3000/api
```

Thay đổi URL này theo địa chỉ API backend của bạn.

## Bước 3: Chạy Development Server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:5173`

## Cấu trúc đã được tạo

### ✅ Pages
- **Login** - Trang đăng nhập với validation
- **Dashboard** - Tổng quan với stats cards và charts
- **Dispatch** - Điều độ xe (tính năng chính)
- **Vehicles** - Quản lý xe (CRUD)
- **Drivers** - Quản lý lái xe (CRUD)
- **Reports** - Báo cáo và thống kê

### ✅ Components
- **UI Components** (shadcn/ui style):
  - Button, Input, Card, Label, Dialog, Table, Badge, Tabs, Checkbox, Select
- **Layout Components**:
  - Sidebar (responsive, collapsible)
  - Header (với user menu)
  - MainLayout
- **Reusable Components**:
  - DashboardCard
  - StatusBadge

### ✅ Services
- `auth.service.ts` - Authentication
- `vehicle.service.ts` - Vehicle management
- `driver.service.ts` - Driver management
- `dispatch.service.ts` - Dispatch operations
- `report.service.ts` - Reports

### ✅ State Management (Zustand)
- `auth.store.ts` - Authentication state
- `dispatch.store.ts` - Dispatch state

### ✅ Types
- Đầy đủ TypeScript types trong `src/types/index.ts`

### ✅ Configuration
- Vite config với path aliases (@/)
- TypeScript strict mode
- TailwindCSS với design system
- ESLint configuration

## Lưu ý

1. **API Integration**: Hiện tại các service đã được setup nhưng cần kết nối với backend API thực tế. Các API calls sẽ tự động thêm auth token từ localStorage.

2. **Mock Data**: Một số trang (Dashboard, Dispatch) đang sử dụng mock data. Cần thay thế bằng API calls thực tế.

3. **Date Formatting**: Đang sử dụng `date-fns` cho format ngày tháng. Có thể thêm locale Vietnamese nếu cần.

4. **Error Handling**: Đã có error handling cơ bản. Có thể mở rộng thêm error boundaries và toast notifications.

5. **Loading States**: Đã có loading states cơ bản. Có thể thêm skeleton loaders cho UX tốt hơn.

## Next Steps

1. Kết nối với backend API
2. Thêm error boundaries
3. Thêm toast notifications (có thể dùng react-hot-toast hoặc sonner)
4. Thêm pagination cho tables
5. Thêm advanced filters
6. Thêm export Excel functionality (đã có structure)
7. Thêm image upload cho giấy tờ
8. Thêm real-time updates (WebSocket nếu cần)

## Tech Stack Summary

- React 18+ với Vite
- TypeScript (strict mode)
- TailwindCSS 3+
- shadcn/ui components
- Lucide React icons
- Zustand (state management)
- React Router v6
- React Hook Form + Zod
- date-fns
- Recharts
- Axios

## Design System

- **Colors**: Blue primary (#3B82F6), Green success, Yellow warning, Red danger
- **No Gradients**: Chỉ sử dụng solid colors
- **Icons**: Chỉ Lucide React, không emoji
- **Responsive**: Mobile-first approach
- **Accessibility**: ARIA labels, keyboard navigation

