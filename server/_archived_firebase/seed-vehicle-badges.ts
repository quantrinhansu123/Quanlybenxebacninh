import { firebaseDb } from '../config/database.js'
import dotenv from 'dotenv'

dotenv.config()

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

async function seedVehicleBadges() {
  try {
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

    // First, clear existing vehicle_badges
    await firebaseDb.remove('vehicle_badges')
    console.log('🗑️  Đã xóa dữ liệu vehicle_badges cũ')

    // Add new badges
    for (const badge of vehicleBadges) {
      await firebaseDb.set(`vehicle_badges/${badge.ID_PhuHieu}`, badge)
    }

    console.log(`✅ Đã tạo ${vehicleBadges.length} vehicle badges thành công!`)
    console.log('\n📋 Danh sách phù hiệu:')
    vehicleBadges.forEach((badge, index) => {
      console.log(`   ${index + 1}. ${badge.SoPhuHieu} - ${badge.BienSoXe} (${badge.TrangThai})`)
    })

    process.exit(0)
  } catch (error: unknown) {
    console.error('❌ Lỗi khi seed vehicle badges:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

seedVehicleBadges()
