# Hệ Thống Quản Lý Bến Xe - Frontend

Frontend application cho hệ thống quản lý bến xe được xây dựng với React, TypeScript, và TailwindCSS.

## Công nghệ sử dụng

- **React 18+** với Vite
- **TypeScript** (strict mode)
- **TailwindCSS 3+** cho styling
- **shadcn/ui** components
- **Lucide React** cho icons
- **Zustand** cho state management
- **React Router v6** cho routing
- **React Hook Form + Zod** cho form validation
- **date-fns** cho xử lý ngày tháng
- **Recharts** cho biểu đồ
- **Axios** cho HTTP requests

## Cài đặt

1. Cài đặt dependencies:

```bash
npm install
```

2. Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

3. Cấu hình API URL trong file `.env`:

```
VITE_API_URL=http://localhost:3000/api
```

## Chạy ứng dụng

### Development

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Cấu trúc thư mục

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components (Sidebar, Header, MainLayout)
│   ├── dispatch/        # Dispatch module components
│   ├── vehicles/        # Vehicle management components
│   ├── drivers/         # Driver management components
│   └── reports/         # Report components
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Dispatch.tsx
│   ├── Vehicles.tsx
│   ├── Drivers.tsx
│   └── Reports.tsx
├── hooks/               # Custom hooks
├── lib/                 # Utilities (api, utils)
├── services/            # API services
├── types/               # TypeScript types
├── store/               # Zustand stores
└── App.tsx
```

## Tính năng chính

### 1. Đăng nhập
- Form đăng nhập với validation
- Remember me functionality
- Error handling

### 2. Dashboard
- Thống kê tổng quan (xe trong bến, xe xuất bến, doanh thu)
- Biểu đồ lượt xe theo giờ
- Cảnh báo giấy tờ sắp hết hạn
- Hoạt động gần đây

### 3. Điều độ xe
- Quản lý quy trình xe ra vào bến
- Tabs theo trạng thái (Trong bến, Đã cấp nốt, Đã thanh toán, Đã xuất bến)
- Các thao tác: Cho vào bến, Cấp phép, Thanh toán, Xuất bến
- Search và filter

### 4. Quản lý xe
- CRUD xe
- Quản lý giấy tờ (đăng kiểm, phù hiệu, bảo hiểm)
- Lịch sử hoạt động

### 5. Quản lý lái xe
- CRUD lái xe
- Quản lý bằng lái và hợp đồng
- Lịch sử điều độ

### 6. Báo cáo & Thống kê
- Bảng kê hóa đơn
- Nhật trình xe
- Xe ra vào bến
- Xe không đủ điều kiện
- Doanh thu
- Export Excel

## Design System

### Màu sắc
- **Primary**: Blue (#3B82F6)
- **Success**: Green (#10B981)
- **Warning**: Yellow/Amber (#F59E0B)
- **Danger**: Red (#EF4444)
- **Background**: White/Light Gray (#F9FAFB)

### Typography
- Font: Inter hoặc System fonts
- Clear hierarchy với font sizes và weights

### Spacing
- Consistent padding/margin (4, 8, 12, 16, 24, 32px)

### Border Radius
- Moderate (4-8px)

## API Integration

Tất cả API calls được định nghĩa trong `src/services/`:
- `auth.service.ts` - Authentication
- `vehicle.service.ts` - Vehicle management
- `driver.service.ts` - Driver management
- `dispatch.service.ts` - Dispatch operations
- `report.service.ts` - Reports

API client được cấu hình trong `src/lib/api.ts` với:
- Base URL từ environment variable
- Request interceptor để thêm auth token
- Response interceptor để xử lý errors

## State Management

Sử dụng Zustand cho state management:
- `auth.store.ts` - Authentication state
- `dispatch.store.ts` - Dispatch state

## Validation

Sử dụng Zod schemas cho validation:
- Form validation với React Hook Form
- Type-safe với TypeScript

## Responsive Design

- Mobile First approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- Sidebar collapsible trên mobile
- Tables responsive với horizontal scroll

## Linting

```bash
npm run lint
```

## Notes

- Tất cả components sử dụng TypeScript strict mode
- Icons từ Lucide React (không dùng emoji)
- Không sử dụng gradients, chỉ solid colors
- Loading states và error handling đầy đủ
- Accessibility support (ARIA labels, keyboard navigation)

