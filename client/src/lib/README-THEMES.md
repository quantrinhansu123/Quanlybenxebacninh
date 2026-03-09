# Icon Theme System

Hệ thống này cho phép thay đổi màu sắc của tất cả icon trong ứng dụng một cách đồng bộ.

## Cách sử dụng

### 1. Thay đổi theme toàn bộ ứng dụng

Mở file `theme-variants.ts` và thay đổi giá trị `ACTIVE_THEME`:

```typescript
// Thay đổi từ 'default' sang theme khác
export const ACTIVE_THEME: keyof typeof colorThemes = 'professional' // hoặc 'vibrant', 'minimal'
```

### 2. Các theme có sẵn

- **default**: Theme xanh dương chuyên nghiệp (mặc định)
- **professional**: Theme xám sang trọng
- **vibrant**: Theme màu sắc rực rỡ
- **minimal**: Theme tối giản đen trắng

### 3. Tạo theme mới

Thêm theme mới vào `colorThemes` trong `theme-variants.ts`:

```typescript
export const colorThemes = {
  // ... existing themes
  
  myCustomTheme: {
    edit: "text-pink-600 hover:text-pink-700",
    view: "text-cyan-600 hover:text-cyan-700", 
    delete: "text-red-600 hover:text-red-700",
    history: "text-teal-600 hover:text-teal-700",
    warning: "text-yellow-600",
    danger: "text-red-600",
    success: "text-green-600",
    info: "text-blue-600",
    navigation: "text-gray-600 hover:text-gray-700",
    default: "text-gray-500 hover:text-gray-600",
    muted: "text-gray-400",
  }
}
```

### 4. Sử dụng trong component

```typescript
import { iconStyles } from "@/lib/icon-theme"

// Sử dụng style có sẵn
<Edit className={iconStyles.editButton} />
<History className={iconStyles.historyButton} />

// Hoặc sử dụng function helper
import { getIconClasses } from "@/lib/icon-theme"
<Edit className={getIconClasses('edit', 'lg')} />
```

### 5. Các style có sẵn

- `iconStyles.editButton` - Nút chỉnh sửa
- `iconStyles.viewButton` - Nút xem
- `iconStyles.deleteButton` - Nút xóa
- `iconStyles.historyButton` - Nút lịch sử
- `iconStyles.warningIcon` - Icon cảnh báo
- `iconStyles.dangerIcon` - Icon nguy hiểm
- `iconStyles.successIcon` - Icon thành công
- `iconStyles.infoIcon` - Icon thông tin
- `iconStyles.navigationIcon` - Icon điều hướng

## Thư viện Icon

Dự án sử dụng **Lucide React** (https://lucide.dev/) cho tất cả các icon.

### Cài đặt thêm icon:
```bash
npm install lucide-react
```

### Import và sử dụng:
```typescript
import { IconName } from "lucide-react"
<IconName className={iconStyles.editButton} />
```