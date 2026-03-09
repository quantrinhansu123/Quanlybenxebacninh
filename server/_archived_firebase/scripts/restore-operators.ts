import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'

dotenv.config()

const serviceAccount = JSON.parse(readFileSync(resolve(process.cwd(), process.env.SERVICE_ACCOUNT_PATH!), 'utf-8'))

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.RTDB_URL
  })
}
const db = getDatabase()

const now = () => new Date().toISOString()
const generateId = () => Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 12)

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
    address: '292 Đinh Bộ Lĩnh, Q. Bình Thạnh, TP.HCM',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận Bình Thạnh',
    representative_name: 'Kim Young Ho',
    representative_position: 'Tổng Giám đốc',
    is_ticket_delegated: true,
    is_active: true,
    created_at: now(),
    updated_at: now()
  },
]

async function restore() {
  console.log('Restoring operators...')
  
  // Check existing
  const existingSnap = await db.ref('operators').once('value')
  const existing = existingSnap.val()
  console.log('Existing operators:', existing ? Object.keys(existing).length : 0)
  
  // Restore
  for (const op of operators) {
    await db.ref('operators/' + op.id).set(op)
    console.log('Restored:', op.name, '(' + op.code + ')')
  }
  
  // Verify
  const afterSnap = await db.ref('operators').once('value')
  const after = afterSnap.val()
  console.log('Total operators now:', after ? Object.keys(after).length : 0)
  
  console.log('Done!')
  process.exit(0)
}

restore().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
