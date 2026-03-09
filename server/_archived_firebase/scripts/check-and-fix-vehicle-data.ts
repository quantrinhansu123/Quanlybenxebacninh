/**
 * Script to check and fix vehicle data links to operators and vehicle_types
 * 
 * Usage:
 *   npx tsx src/scripts/check-and-fix-vehicle-data.ts          # Check only
 *   npx tsx src/scripts/check-and-fix-vehicle-data.ts --fix    # Check and fix
 */

import admin from 'firebase-admin'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { readFileSync, existsSync } from 'fs'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Initialize Firebase Admin
function initializeFirebase() {
  if (admin.apps.length > 0) return admin.database()
  
  // Try to find service account file
  const possiblePaths = [
    resolve(__dirname, '../../firebase-service-account.json'),
    resolve(__dirname, '../../../server/firebase-service-account.json'),
    resolve(process.cwd(), 'firebase-service-account.json'),
  ]
  
  let serviceAccountPath = ''
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      serviceAccountPath = p
      break
    }
  }
  
  if (!serviceAccountPath) {
    throw new Error('Service account file not found. Please ensure benxe-management-20251218-firebase-adminsdk.json exists.')
  }
  
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
  const databaseURL = process.env.RTDB_URL || 'https://benxe-management-20251218-default-rtdb.asia-southeast1.firebasedatabase.app/'
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL
  })
  
  return admin.database()
}

// Helper function to generate ID
function generateId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${randomPart}`
}

function now(): string {
  return new Date().toISOString()
}

async function main() {
  const shouldFix = process.argv.includes('--fix')
  
  console.log('🔍 Checking vehicle data in Firebase...\n')
  
  const db = initializeFirebase()
  console.log('✅ Firebase Admin initialized\n')
  
  // 1. Get all operators
  console.log('📋 Loading operators...')
  const operatorsSnapshot = await db.ref('operators').once('value')
  const operatorsData = operatorsSnapshot.val()
  const operators = operatorsData ? Object.entries(operatorsData).map(([id, data]: [string, any]) => ({
    id,
    name: data.name,
    code: data.code
  })) : []
  console.log(`   Found ${operators.length} operators:`)
  operators.forEach(op => console.log(`   - ${op.name} (${op.code})`))
  
  // 2. Get all vehicle_types
  console.log('\n📋 Loading vehicle_types...')
  const vehicleTypesSnapshot = await db.ref('vehicle_types').once('value')
  const vehicleTypesData = vehicleTypesSnapshot.val()
  const vehicleTypes = vehicleTypesData ? Object.entries(vehicleTypesData).map(([id, data]: [string, any]) => ({
    id,
    name: data.name,
    defaultSeatCapacity: data.default_seat_capacity,
    defaultBedCapacity: data.default_bed_capacity
  })) : []
  console.log(`   Found ${vehicleTypes.length} vehicle types:`)
  vehicleTypes.forEach(vt => console.log(`   - ${vt.name} (seats: ${vt.defaultSeatCapacity ?? 'N/A'}, beds: ${vt.defaultBedCapacity ?? 'N/A'})`))
  
  // 3. Get all vehicles
  console.log('\n📋 Loading vehicles...')
  const vehiclesSnapshot = await db.ref('vehicles').once('value')
  const vehiclesData = vehiclesSnapshot.val()
  const vehicles = vehiclesData ? Object.entries(vehiclesData).map(([id, data]: [string, any]) => ({
    id,
    plateNumber: data.plate_number,
    vehicleTypeId: data.vehicle_type_id,
    operatorId: data.operator_id,
    seatCapacity: data.seat_capacity,
    bedCapacity: data.bed_capacity
  })) : []
  console.log(`   Found ${vehicles.length} vehicles`)
  
  // 4. Check for issues
  console.log('\n🔍 Checking for data issues...\n')
  
  const vehiclesWithoutOperator = vehicles.filter(v => !v.operatorId || !operators.find(op => op.id === v.operatorId))
  const vehiclesWithoutType = vehicles.filter(v => !v.vehicleTypeId || !vehicleTypes.find(vt => vt.id === v.vehicleTypeId))
  
  console.log(`⚠️  Vehicles without valid operator: ${vehiclesWithoutOperator.length}`)
  vehiclesWithoutOperator.forEach(v => console.log(`   - ${v.plateNumber} (operatorId: ${v.operatorId || 'null'})`))
  
  console.log(`\n⚠️  Vehicles without valid vehicle type: ${vehiclesWithoutType.length}`)
  vehiclesWithoutType.forEach(v => console.log(`   - ${v.plateNumber} (vehicleTypeId: ${v.vehicleTypeId || 'null'})`))
  
  // 5. Create missing vehicle_types if needed
  if (vehicleTypes.length === 0 && shouldFix) {
    console.log('\n🔧 Creating default vehicle types...')
    const defaultTypes = [
      { name: 'Xe khách 16 chỗ', default_seat_capacity: 16, default_bed_capacity: 0 },
      { name: 'Xe khách 29 chỗ', default_seat_capacity: 29, default_bed_capacity: 0 },
      { name: 'Xe khách 45 chỗ', default_seat_capacity: 45, default_bed_capacity: 0 },
      { name: 'Xe giường nằm 34 chỗ', default_seat_capacity: 0, default_bed_capacity: 34 },
      { name: 'Xe giường nằm 40 chỗ', default_seat_capacity: 0, default_bed_capacity: 40 },
      { name: 'Xe giường nằm 44 chỗ', default_seat_capacity: 0, default_bed_capacity: 44 },
    ]
    
    for (const vt of defaultTypes) {
      const id = generateId()
      await db.ref(`vehicle_types/${id}`).set({
        ...vt,
        description: vt.name,
        created_at: now()
      })
      vehicleTypes.push({ id, name: vt.name, defaultSeatCapacity: vt.default_seat_capacity, defaultBedCapacity: vt.default_bed_capacity })
      console.log(`   ✅ Created: ${vt.name}`)
    }
  }
  
  // 6. Create missing operators if needed
  if (operators.length === 0 && shouldFix) {
    console.log('\n🔧 Creating default operators...')
    const defaultOperators = [
      { name: 'Công ty CP Xe khách Phương Trang', code: 'FUTA' },
      { name: 'Công ty TNHH Thành Bưởi', code: 'THANHBUOI' },
      { name: 'Công ty TNHH Vận tải Kumho Samco', code: 'KUMHO' },
    ]
    
    for (const op of defaultOperators) {
      const id = generateId()
      await db.ref(`operators/${id}`).set({
        ...op,
        is_active: true,
        created_at: now(),
        updated_at: now()
      })
      operators.push({ id, name: op.name, code: op.code })
      console.log(`   ✅ Created: ${op.name}`)
    }
  }
  
  // 7. Summary and suggestion
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total vehicles: ${vehicles.length}`)
  console.log(`Vehicles without operator: ${vehiclesWithoutOperator.length}`)
  console.log(`Vehicles without vehicle type: ${vehiclesWithoutType.length}`)
  console.log(`Available operators: ${operators.length}`)
  console.log(`Available vehicle types: ${vehicleTypes.length}`)
  
  if (!shouldFix && (vehiclesWithoutOperator.length > 0 || vehiclesWithoutType.length > 0 || operators.length === 0 || vehicleTypes.length === 0)) {
    console.log('\n💡 To fix issues, run:')
    console.log('   npx tsx src/scripts/check-and-fix-vehicle-data.ts --fix')
  }
  
  if (shouldFix) {
    console.log('\n✅ Fix completed!')
    console.log('\n📝 NOTE: Vehicles still need to be manually linked to operators/vehicle_types')
    console.log('   through the UI or by updating the database directly.')
  }
  
  // Terminate Firebase connection
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
