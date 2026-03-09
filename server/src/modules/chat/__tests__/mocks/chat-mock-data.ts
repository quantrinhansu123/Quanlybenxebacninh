/**
 * Mock Data for Chat Module Tests
 * Contains sample data for all collections used in chatbot testing
 */

// Vehicle mock data with Vietnamese fields (matching RTDB structure)
export const mockVehicles = [
  {
    id: 'vehicle-1',
    BienSo: '98H07480',
    plate_number: '98H07480',
    LoaiXe: 'Xe khach 45 cho',
    vehicle_type: 'Xe khach 45 cho',
    SoCho: 45,
    seat_capacity: 45,
    TrangThai: 'active',
    status: 'active',
    MaDonVi: 'operator-1',
    operator_id: 'operator-1',
  },
  {
    id: 'vehicle-2',
    BienSo: '51B12345',
    plate_number: '51B12345',
    LoaiXe: 'Xe khach 29 cho',
    vehicle_type: 'Xe khach 29 cho',
    SoCho: 29,
    seat_capacity: 29,
    TrangThai: 'active',
    status: 'active',
    MaDonVi: 'operator-2',
    operator_id: 'operator-2',
  },
  {
    id: 'vehicle-3',
    BienSo: '29A-12345',
    plate_number: '29A-12345',
    LoaiXe: 'Xe giuong nam',
    vehicle_type: 'Xe giuong nam',
    SoCho: 40,
    seat_capacity: 40,
    TrangThai: 'inactive',
    status: 'inactive',
    MaDonVi: 'operator-1',
    operator_id: 'operator-1',
  },
];

// Driver mock data
export const mockDrivers = [
  {
    id: 'driver-1',
    full_name: 'Nguyen Van An',
    fullName: 'Nguyen Van An',
    license_number: 'B2-123456',
    licenseNumber: 'B2-123456',
    phone: '0901234567',
    status: 'active',
  },
  {
    id: 'driver-2',
    full_name: 'Tran Thi Binh',
    fullName: 'Tran Thi Binh',
    license_number: 'C-654321',
    licenseNumber: 'C-654321',
    phone: '0907654321',
    status: 'active',
  },
  {
    id: 'driver-3',
    full_name: 'Le Van Cuong',
    fullName: 'Le Van Cuong',
    license_number: 'D-111222',
    licenseNumber: 'D-111222',
    phone: '0909111222',
    status: 'inactive',
  },
];

// Operator mock data (transport companies)
export const mockOperators = [
  {
    id: 'operator-1',
    TenDonVi: 'Cong ty Phuong Trang',
    name: 'Cong ty Phuong Trang',
    MaDonVi: 'PHUONGTRANG',
    code: 'PHUONGTRANG',
    DiaChi: '123 Nguyen Hue, Q.1, TP.HCM',
    address: '123 Nguyen Hue, Q.1, TP.HCM',
    DienThoai: '02838123456',
    phone: '02838123456',
  },
  {
    id: 'operator-2',
    TenDonVi: 'Nha xe Mai Linh',
    name: 'Nha xe Mai Linh',
    MaDonVi: 'MAILINH',
    code: 'MAILINH',
    DiaChi: '456 Le Loi, Q.1, TP.HCM',
    address: '456 Le Loi, Q.1, TP.HCM',
    DienThoai: '02838654321',
    phone: '02838654321',
  },
  {
    id: 'operator-3',
    TenDonVi: 'Xe Thanh Buoi',
    name: 'Xe Thanh Buoi',
    MaDonVi: 'THANHBUOI',
    code: 'THANHBUOI',
    DiaChi: '789 CMT8, Q.3, TP.HCM',
    address: '789 CMT8, Q.3, TP.HCM',
    DienThoai: '02838999888',
    phone: '02838999888',
  },
];

// Route mock data
export const mockRoutes = [
  {
    id: 'route-1',
    MaSoTuyen: 'TPHCM-DALAT-001',
    route_code: 'TPHCM-DALAT-001',
    BenDi: 'TP.HCM',
    departure_station: 'TP.HCM',
    BenDen: 'Da Lat',
    arrival_station: 'Da Lat',
    KhoangCach: 310,
    distance: 310,
  },
  {
    id: 'route-2',
    MaSoTuyen: 'TPHCM-CANTHO-002',
    route_code: 'TPHCM-CANTHO-002',
    BenDi: 'TP.HCM',
    departure_station: 'TP.HCM',
    BenDen: 'Can Tho',
    arrival_station: 'Can Tho',
    KhoangCach: 170,
    distance: 170,
  },
  {
    id: 'route-3',
    MaSoTuyen: 'HANOI-HAIPHONG-003',
    route_code: 'HANOI-HAIPHONG-003',
    BenDi: 'Ha Noi',
    departure_station: 'Ha Noi',
    BenDen: 'Hai Phong',
    arrival_station: 'Hai Phong',
    KhoangCach: 120,
    distance: 120,
  },
];

// Badge mock data
export const mockBadges = [
  {
    id: 'badge-1',
    SoPhuHieu: 'PH-12345',
    badge_number: 'PH-12345',
    BienSoXe: '98H07480',
    plate_number: '98H07480',
    NgayCap: '2024-01-15',
    issue_date: '2024-01-15',
    NgayHetHan: '2026-01-15',
    expiry_date: '2026-01-15',
    TrangThai: 'active',
    status: 'active',
  },
  {
    id: 'badge-2',
    SoPhuHieu: 'PH-67890',
    badge_number: 'PH-67890',
    BienSoXe: '51B12345',
    plate_number: '51B12345',
    NgayCap: '2024-06-01',
    issue_date: '2024-06-01',
    NgayHetHan: '2026-06-01',
    expiry_date: '2026-06-01',
    TrangThai: 'active',
    status: 'active',
  },
];

// Dispatch records mock data
export const mockDispatchRecords = [
  {
    id: 'dispatch-1',
    plate_number: '98H07480',
    driver_id: 'driver-1',
    entry_time: '2025-12-25T08:00:00Z',
    entryTime: '2025-12-25T08:00:00Z',
    exit_time: '2025-12-25T10:30:00Z',
    exitTime: '2025-12-25T10:30:00Z',
    status: 'departed',
  },
  {
    id: 'dispatch-2',
    plate_number: '51B12345',
    driver_id: 'driver-2',
    entry_time: '2025-12-25T09:00:00Z',
    entryTime: '2025-12-25T09:00:00Z',
    status: 'entered',
  },
  {
    id: 'dispatch-3',
    plate_number: '29A-12345',
    driver_id: 'driver-3',
    entry_time: '2025-12-24T14:00:00Z',
    entryTime: '2025-12-24T14:00:00Z',
    exit_time: '2025-12-24T16:00:00Z',
    exitTime: '2025-12-24T16:00:00Z',
    status: 'departed',
  },
];

// Schedule mock data
export const mockSchedules = [
  {
    id: 'schedule-1',
    schedule_code: 'SCH-001',
    scheduleCode: 'SCH-001',
    route_id: 'route-1',
    departure_time: '06:00',
    arrival_time: '12:00',
  },
  {
    id: 'schedule-2',
    schedule_code: 'SCH-002',
    scheduleCode: 'SCH-002',
    route_id: 'route-2',
    departure_time: '07:30',
    arrival_time: '10:30',
  },
];

// Service mock data
export const mockServices = [
  {
    id: 'service-1',
    name: 'Rua xe',
    service_name: 'Rua xe',
    code: 'SV-RX',
    service_code: 'SV-RX',
    price: 50000,
  },
  {
    id: 'service-2',
    name: 'Bao duong',
    service_name: 'Bao duong',
    code: 'SV-BD',
    service_code: 'SV-BD',
    price: 500000,
  },
];

// Shift mock data
export const mockShifts = [
  {
    id: 'shift-1',
    date: '2025-12-25',
    shift_date: '2025-12-25',
    shift_name: 'Ca sang',
    staff: ['staff-1', 'staff-2'],
  },
  {
    id: 'shift-2',
    date: '2025-12-25',
    shift_date: '2025-12-25',
    shift_name: 'Ca chieu',
    staff: ['staff-3', 'staff-4'],
  },
];

// Invoice mock data
export const mockInvoices = [
  {
    id: 'invoice-1',
    date: '2025-12-25',
    invoice_date: '2025-12-25',
    amount: 150000,
    status: 'paid',
    vehicle_id: 'vehicle-1',
  },
  {
    id: 'invoice-2',
    date: '2025-12-24',
    invoice_date: '2025-12-24',
    amount: 200000,
    status: 'pending',
    vehicle_id: 'vehicle-2',
  },
];

// Violation mock data
export const mockViolations = [
  {
    id: 'violation-1',
    plate_number: '98H07480',
    plateNumber: '98H07480',
    violation_type: 'Qua tai',
    fine_amount: 2000000,
    date: '2025-12-20',
  },
  {
    id: 'violation-2',
    plate_number: '51B12345',
    plateNumber: '51B12345',
    violation_type: 'Vi pham toc do',
    fine_amount: 1500000,
    date: '2025-12-22',
  },
];

// Service charges mock data
export const mockServiceCharges = [
  {
    id: 'charge-1',
    service_name: 'Phi vao ben',
    name: 'Phi vao ben',
    price: 30000,
    unit: 'luot',
  },
  {
    id: 'charge-2',
    service_name: 'Phi dau xe qua dem',
    name: 'Phi dau xe qua dem',
    price: 100000,
    unit: 'dem',
  },
];

// Helper to create Firebase-like snapshot
export const createMockSnapshot = (data: any[]) => {
  const dataObject: Record<string, any> = {};
  data.forEach((item) => {
    dataObject[item.id] = item;
  });
  return {
    val: () => dataObject,
    exists: () => data.length > 0,
  };
};

// All collections combined
export const mockCollections = {
  vehicles: mockVehicles,
  badges: mockBadges,
  operators: mockOperators,
  routes: mockRoutes,
  drivers: mockDrivers,
  dispatch_records: mockDispatchRecords,
  schedules: mockSchedules,
  services: mockServices,
  shifts: mockShifts,
  invoices: mockInvoices,
  violations: mockViolations,
  service_charges: mockServiceCharges,
};

// Plate number variations for testing
export const plateVariations = {
  '98H07480': ['98H07480', '98H-07480', '98H 07480', '98h07480', '98h-07480'],
  '51B12345': ['51B12345', '51B-12345', '51B 12345', '51b12345', '51b-12345'],
  '29A-12345': ['29A12345', '29A-12345', '29A 12345', '29a12345', '29a-12345'],
};
