# AppSheet Data Flow - Quản Lý Phù Hiệu Xe

## Tổng quan

Data từ AppSheet API được truyền vào bảng `/quan-ly-phu-hieu-xe` qua một hệ thống polling và sync tự động.

## Flow Diagram

```
AppSheet API
    ↓
SharedWorker (polling + caching)
    ↓
Normalize Data (appsheet-normalize-badges.ts)
    ↓
Detect Changes (hash diff)
    ↓
React Component (useAppSheetPolling hook)
    ↓
Merge với Backend Data
    ↓
Sync to Database (POST /api/vehicles/badges/appsheet-sync)
    ↓
Backend Upsert (vehicle_badges table)
    ↓
Hiển thị trong bảng
```

## Chi tiết từng bước

### 1. AppSheet API Polling

**File:** `client/src/hooks/use-appsheet-polling.ts`

- **SharedWorker** tự động poll AppSheet API theo interval
- Sử dụng **adaptive interval** (tự điều chỉnh tần suất)
- **Caching** để tránh poll không cần thiết
- **Hash diff** để chỉ sync data thay đổi

```typescript
useAppSheetPolling({
  endpointKey: 'badges',  // Key trong appsheetConfig
  normalize: normalizeBadgeRows,  // Transform raw data
  onData: (data) => setAppSheetBadges(data),  // Update state
  onSyncToDb: (data) => vehicleBadgeFeatService.syncFromAppSheet(data),  // Sync to DB
  enabled: true,
})
```

### 2. Normalize Data

**File:** `client/src/services/appsheet-normalize-badges.ts`

Transform raw AppSheet rows thành format chuẩn:

```typescript
// AppSheet columns → Normalized fields
'SoPhuHieu' / 'ID_PhuHieu' → badgeNumber
'BienSo' → plateNumber
'LoaiPH' → badgeType
'MaHoSo' → fileNumber
'Ref_DonViCapPhuHieu' → operatorRef
'NgayCap' → issueDate
'NgayHetHan' → expiryDate
'TrangThai' → status
'MauPhuHieu' → badgeColor
// ... và nhiều field khác
```

### 3. React Component nhận data

**File:** `client/src/pages/QuanLyPhuHieuXe.tsx`

```typescript
// State để lưu AppSheet data
const [appSheetBadges, setAppSheetBadges] = useState<NormalizedAppSheetBadge[]>([])

// Hook tự động nhận data từ SharedWorker
useAppSheetPolling({
  endpointKey: 'badges',
  normalize: normalizeBadgeRows,
  onData: (data) => setAppSheetBadges(data),  // ← Data được set vào state
  onSyncToDb: (data) => vehicleBadgeFeatService.syncFromAppSheet(data),
  enabled: true,
})
```

### 4. Merge với Backend Data

**File:** `client/src/pages/QuanLyPhuHieuXe.tsx` (dòng 223-265)

```typescript
const mergedBadges = useMemo((): VehicleBadge[] => {
  if (appSheetBadges.length === 0) return badges // Fallback to backend-only
  
  // Merge AppSheet data (primary) với backend enrichment
  return appSheetBadges.map(b => ({
    id: b.badgeNumber,
    badge_number: b.badgeNumber,
    license_plate_sheet: b.plateNumber || '',
    badge_type: b.badgeType || '',
    // ... map tất cả fields
    // Backend enrichment (itinerary từ routes JOIN)
    itinerary: enrichmentMap.get(b.badgeNumber)?.itinerary || '',
  }))
}, [appSheetBadges, badges, enrichmentMap])
```

**Logic:**
- **AppSheet data là primary** (ưu tiên)
- **Backend data** chỉ dùng để enrich (thêm itinerary từ routes)
- Nếu không có AppSheet data → fallback về backend data

### 5. Sync to Database

**File:** `client/src/features/fleet/vehicle-badges/api/vehicleBadgeApi.ts`

Khi có data thay đổi, chỉ **leader tab** (tab đầu tiên) mới sync:

```typescript
syncFromAppSheet: async (badges: unknown[]): Promise<void> => {
  // Chunk data thành batches 500 records
  for (let i = 0; i < badges.length; i += 500) {
    const chunk = badges.slice(i, i + 500)
    // POST to backend
    await api.post('/vehicles/badges/appsheet-sync', { badges: chunk })
  }
}
```

### 6. Backend Upsert

**File:** `server/src/modules/fleet/controllers/badge-appsheet-sync.controller.ts`

**Endpoint:** `POST /api/vehicles/badges/appsheet-sync`

```typescript
// 1. Validate và sanitize data
// 2. Resolve operatorId từ operatorRef
// 3. Resolve routeId từ routeRef
// 4. Batch upsert vào vehicle_badges table

await db
  .insert(vehicleBadges)
  .values(chunk)
  .onConflictDoUpdate({
    target: vehicleBadges.firebaseId,  // badge_number là unique key
    set: {
      badgeNumber: sql`excluded.badge_number`,
      plateNumber: sql`excluded.plate_number`,
      // ... update các fields
      syncedAt: sql`now()`,
      updatedAt: sql`now()`,
    },
  })
```

### 7. Hiển thị trong bảng

**File:** `client/src/pages/QuanLyPhuHieuXe.tsx` (dòng 873-920)

```typescript
// Filter và paginate mergedBadges
const filteredBadges = mergedBadges.filter(...)
const paginatedBadges = filteredBadges.slice(startIndex, endIndex)

// Render trong table
{paginatedBadges.map((badge) => (
  <TableRow key={badge.id}>
    <TableCell>{badge.badge_number}</TableCell>
    <TableCell>{badge.license_plate_sheet}</TableCell>
    <TableCell>{badge.badge_type}</TableCell>
    <TableCell>{badge.badge_color}</TableCell>
    <TableCell>{formatDate(badge.issue_date)}</TableCell>
    <TableCell>{formatDate(badge.expiry_date)}</TableCell>
    <TableCell>
      <StatusBadge status={getStatusVariant(badge.status)} />
    </TableCell>
    {/* ... */}
  </TableRow>
))}
```

## Các điểm quan trọng

### 1. Real-time Polling
- SharedWorker tự động poll AppSheet API
- Adaptive interval (tự điều chỉnh)
- Chỉ sync data thay đổi (hash diff)

### 2. Leader Election
- Chỉ **1 tab** (leader) sync data vào DB
- Tránh duplicate requests
- Các tab khác chỉ nhận data để hiển thị

### 3. Data Priority
- **AppSheet data** là primary source
- **Backend data** chỉ để enrich (itinerary)
- Nếu AppSheet không có data → fallback về backend

### 4. Batch Processing
- Sync data theo batches (500 records/batch)
- Tránh overload server
- Error handling cho từng batch

### 5. Upsert Logic
- Sử dụng `onConflictDoUpdate` để update nếu đã tồn tại
- Preserve existing data (operatorId, routeId) nếu new data là null
- JSONB metadata được merge (shallow merge)

## Cấu hình AppSheet

**File:** `client/src/config/appsheet.config.ts`

```typescript
endpoints: {
  badges: {
    tableId: 'PHUHIEUXE',
    // ... config
  }
}
```

## Debug

### Xem data trong console:
```typescript
// Trong QuanLyPhuHieuXe.tsx
console.log('AppSheet badges:', appSheetBadges)
console.log('Merged badges:', mergedBadges)
```

### Xem sync status:
```typescript
const { isPolling, lastPollAt, error } = useAppSheetPolling({...})
console.log('Polling:', isPolling, 'Last poll:', lastPollAt)
```

### Xem backend sync:
- Check Network tab → POST `/api/vehicles/badges/appsheet-sync`
- Check server logs → `[badge-appsheet-sync]`

## Tóm tắt

1. **AppSheet API** → Raw data
2. **SharedWorker** → Poll + Cache + Hash diff
3. **Normalize** → Transform to app format
4. **React Hook** → Receive data + Update state
5. **Merge** → AppSheet data + Backend enrichment
6. **Sync** → POST to backend (chỉ leader tab)
7. **Backend** → Upsert to database
8. **Display** → Render trong bảng

Tất cả tự động, không cần manual refresh!
