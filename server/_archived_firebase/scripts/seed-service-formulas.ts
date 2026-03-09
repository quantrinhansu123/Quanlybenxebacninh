import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getDatabase, Database } from 'firebase-admin/database'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'

dotenv.config()

// Use RTDB_URL instead of FIREBASE_DATABASE_URL (reserved prefix in Firebase Functions)
const firebaseDatabaseURL = process.env.RTDB_URL || 'https://benxe-management-20251218-default-rtdb.asia-southeast1.firebasedatabase.app/'

function generateId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${randomPart}`
}

function now(): string {
  return new Date().toISOString()
}

async function initializeFirebase(): Promise<Database> {
  if (!getApps().length) {
    // Use SERVICE_ACCOUNT_PATH instead of FIREBASE_SERVICE_ACCOUNT_PATH (reserved prefix in Firebase Functions)
    const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH

    if (serviceAccountPath) {
      const absolutePath = resolve(process.cwd(), serviceAccountPath)
      const serviceAccount = JSON.parse(readFileSync(absolutePath, 'utf-8'))
      initializeApp({
        credential: cert(serviceAccount),
        databaseURL: firebaseDatabaseURL
      })
    } else {
      throw new Error('SERVICE_ACCOUNT_PATH environment variable is required')
    }
  }

  return getDatabase()
}

async function seedServiceFormulas() {
  try {
    console.log('🌱 Bắt đầu seed service formulas...\n')

    const db = await initializeFirebase()
    console.log('✅ Firebase initialized successfully\n')

    // ============================================
    // SERVICE FORMULAS - Biểu thức tính toán
    // ============================================
    console.log('📐 Đang tạo Service Formulas...')

    const serviceFormulas = [
      // Biểu thức tính số lượng (quantity)
      {
        id: generateId(),
        code: 'QTY_SEAT',
        name: 'Số ghế/giường',
        description: 'Tính theo số ghế hoặc số giường của xe',
        formula_type: 'quantity',
        formula_expression: 'vehicle.seatCount',
        is_active: true,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: generateId(),
        code: 'QTY_TRIP',
        name: 'Số chuyến',
        description: 'Tính theo số chuyến xe đã thực hiện',
        formula_type: 'quantity',
        formula_expression: 'dispatch.tripCount',
        is_active: true,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: generateId(),
        code: 'QTY_PASSENGER',
        name: 'Số khách',
        description: 'Tính theo số lượng hành khách',
        formula_type: 'quantity',
        formula_expression: 'dispatch.passengerCount',
        is_active: true,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: generateId(),
        code: 'QTY_TICKET',
        name: 'Số vé',
        description: 'Tính theo số vé đã bán',
        formula_type: 'quantity',
        formula_expression: 'dispatch.ticketCount',
        is_active: true,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: generateId(),
        code: 'QTY_FIXED',
        name: 'Cố định = 1',
        description: 'Số lượng cố định bằng 1 (cho phí cố định)',
        formula_type: 'quantity',
        formula_expression: '1',
        is_active: true,
        created_at: now(),
        updated_at: now(),
      },

      // Biểu thức tính đơn giá (price)
      {
        id: generateId(),
        code: 'PRICE_ROUTE',
        name: 'Giá theo tuyến',
        description: 'Đơn giá lấy từ cấu hình giá của tuyến đường',
        formula_type: 'price',
        formula_expression: 'route.basePrice',
        is_active: true,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: generateId(),
        code: 'PRICE_TICKET',
        name: 'Giá vé',
        description: 'Đơn giá theo giá vé cơ bản',
        formula_type: 'price',
        formula_expression: 'ticket.price',
        is_active: true,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: generateId(),
        code: 'PRICE_PARKING',
        name: 'Phí đỗ xe',
        description: 'Phí đỗ xe theo cấu hình bến',
        formula_type: 'price',
        formula_expression: 'station.parkingFee',
        is_active: true,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: generateId(),
        code: 'PRICE_SERVICE',
        name: 'Phí dịch vụ',
        description: 'Phí dịch vụ theo cấu hình',
        formula_type: 'price',
        formula_expression: 'service.unitPrice',
        is_active: true,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: generateId(),
        code: 'PRICE_COMMISSION',
        name: 'Hoa hồng bán vé',
        description: 'Phần trăm hoa hồng trên doanh thu bán vé',
        formula_type: 'price',
        formula_expression: 'ticket.price * service.commissionRate',
        is_active: true,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: generateId(),
        code: 'PRICE_PENALTY',
        name: 'Phí phạt',
        description: 'Mức phạt theo quy định',
        formula_type: 'price',
        formula_expression: 'penalty.amount',
        is_active: true,
        created_at: now(),
        updated_at: now(),
      },
    ]

    for (const formula of serviceFormulas) {
      await db.ref(`service_formulas/${formula.id}`).set(formula)
      console.log(`  ✅ Created: ${formula.code} - ${formula.name} (${formula.formula_type})`)
    }

    console.log(`\n✅ Đã tạo ${serviceFormulas.length} service formulas`)
    console.log('\n🎉 Seed service formulas hoàn tất!')

    process.exit(0)

  } catch (error) {
    console.error('❌ Lỗi khi seed service formulas:', error)
    process.exit(1)
  }
}

seedServiceFormulas()
