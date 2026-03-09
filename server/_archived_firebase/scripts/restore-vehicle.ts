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

async function restore() {
  console.log('Restoring vehicle 98H07480...')
  
  // Get operator ID (use FUTA for now)
  const opSnap = await db.ref('operators').orderByChild('code').equalTo('FUTA').once('value')
  const opData = opSnap.val()
  const operatorId = opData ? Object.keys(opData)[0] : null
  
  // Get vehicle type ID
  const vtSnap = await db.ref('vehicle_types').once('value')
  const vtData = vtSnap.val()
  let vehicleTypeId = null
  if (vtData) {
    for (const [key, _vt] of Object.entries(vtData)) {
      vehicleTypeId = key
      break
    }
  }
  
  const vehicle = {
    id: generateId(),
    plate_number: '98H07480',
    vehicle_type_id: vehicleTypeId,
    operator_id: operatorId,
    seat_capacity: 1,
    bed_capacity: 0,
    province: 'Bắc Giang',
    manufacturer: 'CNHTC',
    manufacture_year: 2025,
    color: 'Bạc',
    chassis_number: 'LZZ1CCND1SJ407542',
    engine_number: 'MC073150250507828527',
    owner_name: 'CÔNG TY TNHH HP BẮC GIANG',
    is_active: true,
    created_at: now(),
    updated_at: now()
  }
  
  await db.ref('vehicles/' + vehicle.id).set(vehicle)
  console.log('Restored:', vehicle.plate_number)
  console.log('ID:', vehicle.id)
  console.log('Operator ID:', operatorId)
  
  process.exit(0)
}

restore().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
