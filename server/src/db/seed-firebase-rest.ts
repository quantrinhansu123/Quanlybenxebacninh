import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

// Use RTDB_URL instead of FIREBASE_DATABASE_URL (reserved prefix in Firebase Functions)
const RTDB_URL = process.env.RTDB_URL || 'https://benxe-management-20251218-default-rtdb.asia-southeast1.firebasedatabase.app/'
// Remove trailing slash if present
const baseUrl = RTDB_URL.replace(/\/$/, '')

// Helper function to generate ID
function generateId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${randomPart}`
}

// Helper function to get current timestamp
function now(): string {
  return new Date().toISOString()
}

// Helper function to get date string
function dateString(daysFromNow: number = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0]
}

// Helper function to get time string
function timeString(hours: number, minutes: number = 0): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
}

// Firebase REST API helper
async function firebaseSet(path: string, data: any): Promise<void> {
  const url = `${baseUrl}/${path}.json`
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Firebase REST API error: ${response.status} ${response.statusText} - ${errorText}`)
  }
}

async function seedFirebaseRest() {
  try {
    console.log('🌱 Bắt đầu seed data vào Firebase qua REST API...\n')
    console.log(`📡 Database URL: ${baseUrl}\n`)

    // ============================================
    // 1. VEHICLE TYPES
    // ============================================
    console.log('📦 Đang tạo Vehicle Types...')
    const vehicleTypes = [
      { id: generateId(), name: 'Xe khách 16 chỗ', description: 'Xe khách loại nhỏ', created_at: now() },
      { id: generateId(), name: 'Xe khách 29 chỗ', description: 'Xe khách trung bình', created_at: now() },
      { id: generateId(), name: 'Xe khách 45 chỗ', description: 'Xe khách lớn', created_at: now() },
      { id: generateId(), name: 'Xe giường nằm', description: 'Xe khách giường nằm', created_at: now() },
    ]

    const vehicleTypeIds: Record<string, string> = {}
    for (const vt of vehicleTypes) {
      await firebaseSet(`vehicle_types/${vt.id}`, vt)
      vehicleTypeIds[vt.name] = vt.id
    }
    console.log(`✅ Đã tạo ${vehicleTypes.length} vehicle types\n`)

    // ============================================
    // 2. USERS
    // ============================================
    console.log('👥 Đang tạo Users...')
    const passwordHash = await bcrypt.hash('123456', 10)
    
    const users = [
      {
        id: generateId(),
        username: 'admin',
        password_hash: passwordHash,
        full_name: 'System Administrator',
        email: 'admin@benxe.com',
        role: 'admin',
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        username: 'dieudo',
        password_hash: passwordHash,
        full_name: 'Nguyễn Văn Điều Độ',
        email: 'dieudo@benxe.com',
        role: 'dispatcher',
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        username: 'ketoan',
        password_hash: passwordHash,
        full_name: 'Trần Thị Kế Toán',
        email: 'ketoan@benxe.com',
        role: 'accountant',
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        username: 'baocao',
        password_hash: passwordHash,
        full_name: 'Lê Văn Báo Cáo',
        email: 'baocao@benxe.com',
        role: 'reporter',
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
    ]

    const userIds: Record<string, string> = {}
    for (const user of users) {
      await firebaseSet(`users/${user.id}`, user)
      userIds[user.username] = user.id
    }
    console.log(`✅ Đã tạo ${users.length} users\n`)

    // ============================================
    // 3. OPERATORS
    // ============================================
    console.log('🚌 Đang tạo Operators...')
    const operators = [
      {
        id: generateId(),
        name: 'Công ty CP Xe khách Phương Trang',
        code: 'FUTA',
        tax_code: '0301234567',
        phone: '19006067',
        email: 'lienhe@futabus.vn',
        address: '80 Trần Hưng Đạo, Q.1, TP.HCM',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        representative_name: 'Nguyễn Hữu Luân',
        representative_position: 'Giám đốc',
        is_ticket_delegated: false,
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        name: 'Công ty TNHH Thành Bưởi',
        code: 'THANHBUOI',
        tax_code: '0309876543',
        phone: '19006079',
        email: 'lienhe@thanhbuoi.com.vn',
        address: '266 Lê Hồng Phong, Q.5, TP.HCM',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 5',
        representative_name: 'Lê Đức Thành',
        representative_position: 'Giám đốc',
        is_ticket_delegated: false,
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        name: 'Công ty TNHH Vận tải Kumho Samco',
        code: 'KUMHO',
        tax_code: '0305556667',
        phone: '19006065',
        email: 'lienhe@kumhosamco.com.vn',
        address: '292 Đinh Bộ Lĩnh, Q.Bình Thạnh, TP.HCM',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận Bình Thạnh',
        representative_name: 'Park Song Hwa',
        representative_position: 'Giám đốc',
        is_ticket_delegated: false,
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
    ]

    const operatorIds: Record<string, string> = {}
    for (const op of operators) {
      await firebaseSet(`operators/${op.id}`, op)
      operatorIds[op.code] = op.id
    }
    console.log(`✅ Đã tạo ${operators.length} operators\n`)

    // ============================================
    // 4. VEHICLES
    // ============================================
    console.log('🚗 Đang tạo Vehicles...')
    const vehicles = [
      {
        id: generateId(),
        plate_number: '51B-123.45',
        vehicle_type_id: vehicleTypeIds['Xe giường nằm'],
        operator_id: operatorIds['FUTA'],
        seat_capacity: 0,
        bed_capacity: 40,
        province: 'TP. Hồ Chí Minh',
        insurance_expiry_date: dateString(180),
        inspection_expiry_date: dateString(90),
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        plate_number: '51B-678.90',
        vehicle_type_id: vehicleTypeIds['Xe giường nằm'],
        operator_id: operatorIds['FUTA'],
        seat_capacity: 0,
        bed_capacity: 44,
        province: 'TP. Hồ Chí Minh',
        insurance_expiry_date: dateString(200),
        inspection_expiry_date: dateString(120),
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        plate_number: '51B-111.22',
        vehicle_type_id: vehicleTypeIds['Xe giường nằm'],
        operator_id: operatorIds['THANHBUOI'],
        seat_capacity: 0,
        bed_capacity: 34,
        province: 'TP. Hồ Chí Minh',
        insurance_expiry_date: dateString(150),
        inspection_expiry_date: dateString(60),
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        plate_number: '51B-333.44',
        vehicle_type_id: vehicleTypeIds['Xe khách 45 chỗ'],
        operator_id: operatorIds['KUMHO'],
        seat_capacity: 45,
        bed_capacity: 0,
        province: 'TP. Hồ Chí Minh',
        insurance_expiry_date: dateString(100),
        inspection_expiry_date: dateString(30),
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
    ]

    const vehicleIds: string[] = []
    for (const veh of vehicles) {
      await firebaseSet(`vehicles/${veh.id}`, veh)
      vehicleIds.push(veh.id)
    }
    console.log(`✅ Đã tạo ${vehicles.length} vehicles\n`)

    // ============================================
    // 5. VEHICLE DOCUMENTS
    // ============================================
    console.log('📄 Đang tạo Vehicle Documents...')
    const vehicleDocuments = [
      {
        id: generateId(),
        vehicle_id: vehicleIds[0],
        document_type: 'registration',
        document_number: 'DK-12345',
        issue_date: dateString(-365),
        expiry_date: dateString(365),
        issuing_authority: 'Cục Đăng kiểm Việt Nam',
        updated_by: userIds['admin'],
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        vehicle_id: vehicleIds[0],
        document_type: 'inspection',
        document_number: 'DK-12345-2024',
        issue_date: dateString(-90),
        expiry_date: dateString(90),
        issuing_authority: 'Trung tâm Đăng kiểm',
        updated_by: userIds['admin'],
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        vehicle_id: vehicleIds[0],
        document_type: 'insurance',
        document_number: 'BH-12345',
        issue_date: dateString(-180),
        expiry_date: dateString(180),
        issuing_authority: 'Bảo Việt',
        updated_by: userIds['admin'],
        created_at: now(),
        updated_at: now()
      },
    ]

    for (const doc of vehicleDocuments) {
      await firebaseSet(`vehicle_documents/${doc.id}`, doc)
    }
    console.log(`✅ Đã tạo ${vehicleDocuments.length} vehicle documents\n`)

    // ============================================
    // 5B. VEHICLE BADGES (Phù hiệu xe)
    // ============================================
    console.log('🏷️  Đang tạo Vehicle Badges...')
    const vehicleBadges = [
      {
        ID_PhuHieu: generateId(),
        SoPhuHieu: 'PH-2024-001',
        BienSoXe: '51B-123.45',
        LoaiPH: 'Xe buýt tuyến cố định',
        MauPhuHieu: 'Xanh',
        NgayCap: dateString(-180),
        NgayHetHan: dateString(180),
        TrangThai: 'Còn hiệu lực',
        MaHoSo: 'HS-001',
        LoaiCap: 'Cấp mới',
        Ref_GPKD: 'GPKD-FUTA-001',
        Ref_DonViCapPhuHieu: 'Sở GTVT TP.HCM',
        TuyenDuong: 'TP.HCM - Đà Lạt',
        LoaiXe: 'Xe buýt',
        created_at: now()
      },
      {
        ID_PhuHieu: generateId(),
        SoPhuHieu: 'PH-2024-002',
        BienSoXe: '51B-678.90',
        LoaiPH: 'Xe buýt tuyến cố định',
        MauPhuHieu: 'Xanh',
        NgayCap: dateString(-120),
        NgayHetHan: dateString(240),
        TrangThai: 'Còn hiệu lực',
        MaHoSo: 'HS-002',
        LoaiCap: 'Cấp mới',
        Ref_GPKD: 'GPKD-FUTA-001',
        Ref_DonViCapPhuHieu: 'Sở GTVT TP.HCM',
        TuyenDuong: 'TP.HCM - Vũng Tàu',
        LoaiXe: 'Xe buýt',
        created_at: now()
      },
      {
        ID_PhuHieu: generateId(),
        SoPhuHieu: 'PH-2024-003',
        BienSoXe: '51B-111.22',
        LoaiPH: 'Xe buýt tuyến cố định',
        MauPhuHieu: 'Vàng',
        NgayCap: dateString(-90),
        NgayHetHan: dateString(270),
        TrangThai: 'Còn hiệu lực',
        MaHoSo: 'HS-003',
        LoaiCap: 'Cấp mới',
        Ref_GPKD: 'GPKD-TB-001',
        Ref_DonViCapPhuHieu: 'Sở GTVT TP.HCM',
        TuyenDuong: 'TP.HCM - Đà Lạt',
        LoaiXe: 'Xe buýt',
        created_at: now()
      },
      {
        ID_PhuHieu: generateId(),
        SoPhuHieu: 'PH-2024-004',
        BienSoXe: '51B-333.44',
        LoaiPH: 'Xe buýt tuyến cố định',
        MauPhuHieu: 'Xanh',
        NgayCap: dateString(-60),
        NgayHetHan: dateString(25),
        TrangThai: 'Còn hiệu lực',
        MaHoSo: 'HS-004',
        LoaiCap: 'Gia hạn',
        Ref_GPKD: 'GPKD-KUMHO-001',
        Ref_DonViCapPhuHieu: 'Sở GTVT TP.HCM',
        TuyenDuong: 'TP.HCM - Cần Thơ',
        LoaiXe: 'Xe buýt',
        created_at: now()
      },
      {
        ID_PhuHieu: generateId(),
        SoPhuHieu: 'PH-2023-099',
        BienSoXe: '51B-999.88',
        LoaiPH: 'Xe buýt tuyến cố định',
        MauPhuHieu: 'Đỏ',
        NgayCap: dateString(-400),
        NgayHetHan: dateString(-30),
        TrangThai: 'Hết hiệu lực',
        MaHoSo: 'HS-099',
        LoaiCap: 'Cấp mới',
        Ref_GPKD: 'GPKD-FUTA-001',
        Ref_DonViCapPhuHieu: 'Sở GTVT TP.HCM',
        TuyenDuong: 'TP.HCM - Đà Lạt',
        LoaiXe: 'Xe buýt',
        created_at: now()
      },
    ]

    for (const badge of vehicleBadges) {
      await firebaseSet(`vehicle_badges/${badge.ID_PhuHieu}`, badge)
    }
    console.log(`✅ Đã tạo ${vehicleBadges.length} vehicle badges\n`)

    // ============================================
    // 6. DRIVERS
    // ============================================
    console.log('👨‍✈️ Đang tạo Drivers...')
    const drivers = [
      {
        id: generateId(),
        operator_id: operatorIds['FUTA'],
        full_name: 'Nguyễn Văn Tài',
        id_number: '079090123456',
        phone: '0909123456',
        email: 'nguyenvantai@example.com',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        address: '123 Nguyễn Huệ, Q.1',
        license_number: '790123456789',
        license_class: 'E',
        license_issue_date: dateString(-365 * 2),
        license_expiry_date: dateString(365 * 4),
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        operator_id: operatorIds['FUTA'],
        full_name: 'Trần Văn Xế',
        id_number: '079090654321',
        phone: '0909654321',
        email: 'tranvanxe@example.com',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 2',
        address: '456 Võ Văn Tần, Q.2',
        license_number: '790987654321',
        license_class: 'E',
        license_issue_date: dateString(-365 * 3),
        license_expiry_date: dateString(365 * 3),
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        operator_id: operatorIds['THANHBUOI'],
        full_name: 'Lê Văn Lái',
        id_number: '079090112233',
        phone: '0909112233',
        email: 'levanlai@example.com',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 3',
        address: '789 Điện Biên Phủ, Q.3',
        license_number: '790112233445',
        license_class: 'E',
        license_issue_date: dateString(-365 * 4),
        license_expiry_date: dateString(365 * 5),
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
    ]

    const driverIds: string[] = []
    for (const driver of drivers) {
      await firebaseSet(`drivers/${driver.id}`, driver)
      driverIds.push(driver.id)
    }
    console.log(`✅ Đã tạo ${drivers.length} drivers\n`)

    // ============================================
    // 7. LOCATIONS
    // ============================================
    console.log('📍 Đang tạo Locations...')
    const locations = [
      {
        id: generateId(),
        name: 'Bến xe Miền Đông Mới',
        code: 'BXMDI',
        station_type: 'Bến xe khách loại 1',
        province: 'TP. Hồ Chí Minh',
        district: 'TP. Thủ Đức',
        address: '501 Hoàng Hữu Nam, P. Long Bình',
        phone: '02838488888',
        email: 'info@benxemiendong.vn',
        latitude: 10.8416,
        longitude: 106.8099,
        is_active: true,
        created_at: now()
      },
      {
        id: generateId(),
        name: 'Bến xe Liên tỉnh Đà Lạt',
        code: 'BXDL',
        station_type: 'Bến xe khách loại 2',
        province: 'Lâm Đồng',
        district: 'TP. Đà Lạt',
        address: '01 Tô Hiến Thành, P.3',
        phone: '02633822222',
        email: 'info@benxedalat.vn',
        latitude: 11.9404,
        longitude: 108.4583,
        is_active: true,
        created_at: now()
      },
      {
        id: generateId(),
        name: 'Bến xe Vũng Tàu',
        code: 'BXVT',
        station_type: 'Bến xe khách loại 2',
        province: 'Bà Rịa - Vũng Tàu',
        district: 'TP. Vũng Tàu',
        address: '192 Nam Kỳ Khởi Nghĩa, P. Thắng Tam',
        phone: '02543855555',
        email: 'info@benxevungtau.vn',
        latitude: 10.3460,
        longitude: 107.0843,
        is_active: true,
        created_at: now()
      },
      {
        id: generateId(),
        name: 'Bến xe Trung tâm Cần Thơ',
        code: 'BXCT',
        station_type: 'Bến xe khách loại 1',
        province: 'Cần Thơ',
        district: 'Q. Cái Răng',
        address: 'QL1A, P. Hưng Thạnh',
        phone: '02923833333',
        email: 'info@benxecantho.vn',
        latitude: 10.0452,
        longitude: 105.7469,
        is_active: true,
        created_at: now()
      },
      {
        id: generateId(),
        name: 'Bến xe Miền Tây',
        code: 'BXMT',
        station_type: 'Bến xe khách loại 1',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận Bình Tân',
        address: '395 Kinh Dương Vương, P. An Lạc',
        phone: '02838766666',
        email: 'info@benxemientay.vn',
        latitude: 10.7289,
        longitude: 106.6034,
        is_active: true,
        created_at: now()
      },
    ]

    const locationIds: Record<string, string> = {}
    for (const loc of locations) {
      await firebaseSet(`locations/${loc.id}`, loc)
      locationIds[loc.code] = loc.id
    }
    console.log(`✅ Đã tạo ${locations.length} locations\n`)

    // ============================================
    // 8. ROUTES
    // ============================================
    console.log('🛣️  Đang tạo Routes...')
    const routes = [
      {
        id: generateId(),
        route_code: 'HCM-DL',
        route_name: 'TP.HCM - Đà Lạt',
        origin_id: locationIds['BXMDI'],
        destination_id: locationIds['BXDL'],
        distance_km: 308,
        estimated_duration_minutes: 480,
        route_type: 'Intercity',
        planned_frequency: '30 phút/chuyến',
        boarding_point: 'Bến xe Miền Đông',
        journey_description: 'Tuyến đường cao tốc, qua các tỉnh Đồng Nai, Bình Thuận, Lâm Đồng',
        departure_times_description: 'Từ 5:00 đến 23:00 hàng ngày',
        rest_stops: 'Trạm dừng nghỉ tại Bình Thuận',
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        route_code: 'HCM-VT',
        route_name: 'TP.HCM - Vũng Tàu',
        origin_id: locationIds['BXMDI'],
        destination_id: locationIds['BXVT'],
        distance_km: 96,
        estimated_duration_minutes: 150,
        route_type: 'Intercity',
        planned_frequency: '15 phút/chuyến',
        boarding_point: 'Bến xe Miền Đông',
        journey_description: 'Tuyến đường quốc lộ 51',
        departure_times_description: 'Từ 4:00 đến 22:00 hàng ngày',
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        route_code: 'HCM-CT',
        route_name: 'TP.HCM - Cần Thơ',
        origin_id: locationIds['BXMT'],
        destination_id: locationIds['BXCT'],
        distance_km: 169,
        estimated_duration_minutes: 240,
        route_type: 'Intercity',
        planned_frequency: '30 phút/chuyến',
        boarding_point: 'Bến xe Miền Tây',
        journey_description: 'Tuyến đường quốc lộ 1A',
        departure_times_description: 'Từ 4:30 đến 23:30 hàng ngày',
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
    ]

    const routeIds: Record<string, string> = {}
    for (const route of routes) {
      await firebaseSet(`routes/${route.id}`, route)
      routeIds[route.route_code] = route.id
    }
    console.log(`✅ Đã tạo ${routes.length} routes\n`)

    // ============================================
    // 9. ROUTE STOPS
    // ============================================
    console.log('🚏 Đang tạo Route Stops...')
    const routeStops = [
      {
        id: generateId(),
        route_id: routeIds['HCM-DL'],
        location_id: locationIds['BXMDI'],
        stop_order: 1,
        distance_from_origin_km: 0,
        estimated_minutes_from_origin: 0,
        created_at: now()
      },
      {
        id: generateId(),
        route_id: routeIds['HCM-DL'],
        location_id: locationIds['BXDL'],
        stop_order: 2,
        distance_from_origin_km: 308,
        estimated_minutes_from_origin: 480,
        created_at: now()
      },
      {
        id: generateId(),
        route_id: routeIds['HCM-VT'],
        location_id: locationIds['BXMDI'],
        stop_order: 1,
        distance_from_origin_km: 0,
        estimated_minutes_from_origin: 0,
        created_at: now()
      },
      {
        id: generateId(),
        route_id: routeIds['HCM-VT'],
        location_id: locationIds['BXVT'],
        stop_order: 2,
        distance_from_origin_km: 96,
        estimated_minutes_from_origin: 150,
        created_at: now()
      },
    ]

    for (const stop of routeStops) {
      await firebaseSet(`route_stops/${stop.id}`, stop)
    }
    console.log(`✅ Đã tạo ${routeStops.length} route stops\n`)

    // ============================================
    // 10. SHIFTS
    // ============================================
    console.log('⏰ Đang tạo Shifts...')
    const shifts = [
      { 
        id: generateId(), 
        name: 'Ca 1', 
        start_time: timeString(6, 0), 
        end_time: timeString(14, 0),
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      { 
        id: generateId(), 
        name: 'Ca 2', 
        start_time: timeString(14, 0), 
        end_time: timeString(22, 0),
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      { 
        id: generateId(), 
        name: 'Ca 3', 
        start_time: timeString(22, 0), 
        end_time: timeString(6, 0),
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      { 
        id: generateId(), 
        name: 'Hành chính', 
        start_time: timeString(7, 30), 
        end_time: timeString(17, 0),
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
    ]

    const shiftIds: Record<string, string> = {}
    for (const shift of shifts) {
      await firebaseSet(`shifts/${shift.id}`, shift)
      shiftIds[shift.name] = shift.id
    }
    console.log(`✅ Đã tạo ${shifts.length} shifts\n`)

    // ============================================
    // 11. SERVICES
    // ============================================
    console.log('💼 Đang tạo Services...')
    const services = [
      {
        id: generateId(),
        code: 'STOP_FEE',
        name: 'Phí dừng đỗ',
        base_price: 50000,
        unit: 'per_trip',
        material_type: 'Dịch vụ',
        tax_percentage: 0,
        display_order: 1,
        is_default: false,
        use_quantity_formula: false,
        use_price_formula: false,
        auto_calculate_quantity: false,
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        code: 'CLEANING',
        name: 'Phí vệ sinh',
        base_price: 20000,
        unit: 'per_trip',
        material_type: 'Dịch vụ',
        tax_percentage: 0,
        display_order: 2,
        is_default: false,
        use_quantity_formula: false,
        use_price_formula: false,
        auto_calculate_quantity: false,
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        code: 'MANAGEMENT',
        name: 'Phí quản lý',
        base_price: 30000,
        unit: 'per_trip',
        material_type: 'Dịch vụ',
        tax_percentage: 0,
        display_order: 3,
        is_default: false,
        use_quantity_formula: false,
        use_price_formula: false,
        auto_calculate_quantity: false,
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
    ]

    const serviceIds: Record<string, string> = {}
    for (const service of services) {
      await firebaseSet(`services/${service.id}`, service)
      serviceIds[service.code] = service.id
    }
    console.log(`✅ Đã tạo ${services.length} services\n`)

    // ============================================
    // 12. VIOLATION TYPES
    // ============================================
    console.log('⚠️  Đang tạo Violation Types...')
    const violationTypes = [
      {
        id: generateId(),
        code: 'OVERLOAD',
        name: 'Chở quá số lượng khách quy định',
        description: 'Xe chở vượt quá số lượng khách được phép',
        severity: 'high',
        created_at: now()
      },
      {
        id: generateId(),
        code: 'NO_LICENSE',
        name: 'Thiếu giấy tờ xe/lái xe',
        description: 'Xe hoặc lái xe thiếu giấy tờ hợp lệ',
        severity: 'critical',
        created_at: now()
      },
      {
        id: generateId(),
        code: 'LATE_DEPARTURE',
        name: 'Xuất bến trễ giờ',
        description: 'Xe xuất bến sau giờ quy định',
        severity: 'low',
        created_at: now()
      },
    ]

    for (const vt of violationTypes) {
      await firebaseSet(`violation_types/${vt.id}`, vt)
    }
    console.log(`✅ Đã tạo ${violationTypes.length} violation types\n`)

    // ============================================
    // 13. SCHEDULES
    // ============================================
    console.log('📅 Đang tạo Schedules...')
    const schedules = [
      {
        id: generateId(),
        schedule_code: 'FUTA-HCM-DL-08:00',
        route_id: routeIds['HCM-DL'],
        operator_id: operatorIds['FUTA'],
        departure_time: timeString(8, 0),
        frequency_type: 'daily',
        effective_from: dateString(0),
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
      {
        id: generateId(),
        schedule_code: 'TB-HCM-DL-09:00',
        route_id: routeIds['HCM-DL'],
        operator_id: operatorIds['THANHBUOI'],
        departure_time: timeString(9, 0),
        frequency_type: 'daily',
        effective_from: dateString(0),
        is_active: true,
        created_at: now(),
        updated_at: now()
      },
    ]

    const scheduleIds: string[] = []
    for (const schedule of schedules) {
      await firebaseSet(`schedules/${schedule.id}`, schedule)
      scheduleIds.push(schedule.id)
    }
    console.log(`✅ Đã tạo ${schedules.length} schedules\n`)

    // ============================================
    // 14. DISPATCH RECORDS
    // ============================================
    console.log('📋 Đang tạo Dispatch Records...')
    const nowTime = new Date()
    const fourHoursAgo = new Date(nowTime.getTime() - 4 * 60 * 60 * 1000)
    const threeHoursAgo = new Date(nowTime.getTime() - 3 * 60 * 60 * 1000)
    const oneHourAgo = new Date(nowTime.getTime() - 1 * 60 * 60 * 1000)
    const tenMinutesAgo = new Date(nowTime.getTime() - 10 * 60 * 1000)

    const dispatchRecords = [
      {
        id: generateId(),
        vehicle_id: vehicleIds[0],
        driver_id: driverIds[0],
        schedule_id: scheduleIds[0],
        route_id: routeIds['HCM-DL'],
        entry_time: fourHoursAgo.toISOString(),
        entry_by: userIds['dieudo'],
        entry_shift_id: shiftIds['Ca 1'],
        passenger_drop_time: new Date(fourHoursAgo.getTime() + 10 * 60 * 1000).toISOString(),
        passengers_arrived: 15,
        passenger_drop_by: userIds['dieudo'],
        boarding_permit_time: new Date(fourHoursAgo.getTime() + 30 * 60 * 1000).toISOString(),
        planned_departure_time: new Date(fourHoursAgo.getTime() + 60 * 60 * 1000).toISOString(),
        transport_order_code: 'LENH-001',
        seat_count: 40,
        permit_status: 'approved',
        boarding_permit_by: userIds['dieudo'],
        permit_shift_id: shiftIds['Ca 1'],
        payment_time: new Date(fourHoursAgo.getTime() + 40 * 60 * 1000).toISOString(),
        payment_amount: 150000,
        payment_method: 'cash',
        invoice_number: 'HD-001',
        payment_by: userIds['ketoan'],
        payment_shift_id: shiftIds['Ca 1'],
        departure_order_time: new Date(fourHoursAgo.getTime() + 55 * 60 * 1000).toISOString(),
        passengers_departing: 35,
        departure_order_by: userIds['dieudo'],
        departure_order_shift_id: shiftIds['Ca 1'],
        exit_time: threeHoursAgo.toISOString(),
        exit_by: userIds['dieudo'],
        exit_shift_id: shiftIds['Ca 1'],
        current_status: 'departed',
        created_at: fourHoursAgo.toISOString(),
        updated_at: threeHoursAgo.toISOString()
      },
      {
        id: generateId(),
        vehicle_id: vehicleIds[2],
        driver_id: driverIds[2],
        schedule_id: scheduleIds[1],
        route_id: routeIds['HCM-DL'],
        entry_time: oneHourAgo.toISOString(),
        entry_by: userIds['dieudo'],
        entry_shift_id: shiftIds['Ca 2'],
        passenger_drop_time: new Date(oneHourAgo.getTime() + 10 * 60 * 1000).toISOString(),
        passengers_arrived: 10,
        passenger_drop_by: userIds['dieudo'],
        boarding_permit_time: new Date(oneHourAgo.getTime() + 30 * 60 * 1000).toISOString(),
        planned_departure_time: new Date(nowTime.getTime() + 30 * 60 * 1000).toISOString(),
        transport_order_code: 'LENH-002',
        seat_count: 34,
        permit_status: 'approved',
        boarding_permit_by: userIds['dieudo'],
        permit_shift_id: shiftIds['Ca 2'],
        current_status: 'permit_issued',
        created_at: oneHourAgo.toISOString(),
        updated_at: new Date(oneHourAgo.getTime() + 30 * 60 * 1000).toISOString()
      },
      {
        id: generateId(),
        vehicle_id: vehicleIds[1],
        driver_id: driverIds[1],
        route_id: routeIds['HCM-VT'],
        entry_time: tenMinutesAgo.toISOString(),
        entry_by: userIds['dieudo'],
        entry_shift_id: shiftIds['Ca 2'],
        current_status: 'entered',
        created_at: tenMinutesAgo.toISOString(),
        updated_at: tenMinutesAgo.toISOString()
      },
    ]

    const dispatchRecordIds: string[] = []
    for (const dr of dispatchRecords) {
      await firebaseSet(`dispatch_records/${dr.id}`, dr)
      dispatchRecordIds.push(dr.id)
    }
    console.log(`✅ Đã tạo ${dispatchRecords.length} dispatch records\n`)

    // ============================================
    // 15. SERVICE CHARGES
    // ============================================
    console.log('💰 Đang tạo Service Charges...')
    const serviceCharges = [
      {
        id: generateId(),
        dispatch_record_id: dispatchRecordIds[0],
        service_id: serviceIds['STOP_FEE'],
        quantity: 1,
        unit_price: 50000,
        total_amount: 50000,
        created_at: now()
      },
      {
        id: generateId(),
        dispatch_record_id: dispatchRecordIds[0],
        service_id: serviceIds['CLEANING'],
        quantity: 1,
        unit_price: 20000,
        total_amount: 20000,
        created_at: now()
      },
      {
        id: generateId(),
        dispatch_record_id: dispatchRecordIds[0],
        service_id: serviceIds['MANAGEMENT'],
        quantity: 1,
        unit_price: 30000,
        total_amount: 30000,
        created_at: now()
      },
    ]

    for (const sc of serviceCharges) {
      await firebaseSet(`service_charges/${sc.id}`, sc)
    }
    console.log(`✅ Đã tạo ${serviceCharges.length} service charges\n`)

    // ============================================
    // 16. INVOICES
    // ============================================
    console.log('🧾 Đang tạo Invoices...')
    const invoices = [
      {
        id: generateId(),
        invoice_number: 'HD-001',
        dispatch_record_id: dispatchRecordIds[0],
        operator_id: operatorIds['FUTA'],
        shift_id: shiftIds['Ca 1'],
        issue_date: dateString(0),
        due_date: dateString(30),
        subtotal: 100000,
        tax_amount: 0,
        total_amount: 100000,
        payment_status: 'paid',
        payment_date: dateString(0),
        notes: 'Thanh toán đầy đủ',
        created_at: now(),
        updated_at: now()
      },
    ]

    for (const invoice of invoices) {
      await firebaseSet(`invoices/${invoice.id}`, invoice)
    }
    console.log(`✅ Đã tạo ${invoices.length} invoices\n`)

    // ============================================
    // 17. SYSTEM SETTINGS
    // ============================================
    console.log('⚙️  Đang tạo System Settings...')
    const systemSettings = [
      {
        key: 'station_name',
        value: 'Bến xe Miền Đông Mới',
        data_type: 'string',
        description: 'Tên bến xe',
        updated_at: now(),
        updated_by: userIds['admin']
      },
      {
        key: 'station_address',
        value: '501 Hoàng Hữu Nam, P. Long Bình, TP. Thủ Đức, TP.HCM',
        data_type: 'string',
        description: 'Địa chỉ bến xe',
        updated_at: now(),
        updated_by: userIds['admin']
      },
      {
        key: 'default_currency',
        value: 'VND',
        data_type: 'string',
        description: 'Đơn vị tiền tệ mặc định',
        updated_at: now(),
        updated_by: userIds['admin']
      },
    ]

    for (const setting of systemSettings) {
      await firebaseSet(`system_settings/${setting.key}`, setting)
    }
    console.log(`✅ Đã tạo ${systemSettings.length} system settings\n`)

    console.log('🎉 Hoàn thành seed data đầy đủ vào Firebase!')
    console.log('\n📝 Thông tin đăng nhập:')
    console.log('   - Username: admin | Password: 123456 (Admin)')
    console.log('   - Username: dieudo | Password: 123456 (Dispatcher)')
    console.log('   - Username: ketoan | Password: 123456 (Accountant)')
    console.log('   - Username: baocao | Password: 123456 (Reporter)')
    console.log('\n📊 Tổng kết dữ liệu đã tạo:')
    console.log(`   - ${vehicleTypes.length} vehicle types`)
    console.log(`   - ${users.length} users`)
    console.log(`   - ${operators.length} operators`)
    console.log(`   - ${vehicles.length} vehicles`)
    console.log(`   - ${vehicleDocuments.length} vehicle documents`)
    console.log(`   - ${vehicleBadges.length} vehicle badges`)
    console.log(`   - ${drivers.length} drivers`)
    console.log(`   - ${locations.length} locations`)
    console.log(`   - ${routes.length} routes`)
    console.log(`   - ${routeStops.length} route stops`)
    console.log(`   - ${shifts.length} shifts`)
    console.log(`   - ${services.length} services`)
    console.log(`   - ${violationTypes.length} violation types`)
    console.log(`   - ${schedules.length} schedules`)
    console.log(`   - ${dispatchRecords.length} dispatch records`)
    console.log(`   - ${serviceCharges.length} service charges`)
    console.log(`   - ${invoices.length} invoices`)
    console.log(`   - ${systemSettings.length} system settings`)

  } catch (error: any) {
    console.error('❌ Lỗi khi seed data:', error.message)
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('\n⚠️  Lỗi authentication!')
      console.error('Vui lòng kiểm tra Firebase Database Rules:')
      console.error('1. Vào Firebase Console > Realtime Database > Rules')
      console.error('2. Đảm bảo rules cho phép đọc/ghi (chỉ cho development):')
      console.error('   {')
      console.error('     "rules": {')
      console.error('       ".read": true,')
      console.error('       ".write": true')
      console.error('     }')
      console.error('   }')
    }
    process.exit(1)
  }
}

seedFirebaseRest()

