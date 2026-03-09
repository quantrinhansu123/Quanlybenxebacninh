/**
 * Cleanup Script: Remove seed/test data from Firebase RTDB
 * 
 * Removes:
 * - Vehicles with plate numbers like 51B-xxx.xx (seed format)
 * - Vehicles with is_active = false
 * - Test operators (FUTA, THANHBUOI, KUMHO)
 * - Test drivers associated with test operators
 * - Test vehicle badges
 * 
 * Run with: npx tsx src/scripts/cleanup-seed-data.ts
 * 
 * Optional flags:
 * --dry-run    (show what would be deleted without deleting)
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getDatabase, Database } from 'firebase-admin/database'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'

dotenv.config()

const RTDB_URL = process.env.RTDB_URL || 'https://benxe-management-20251218-default-rtdb.asia-southeast1.firebasedatabase.app'
const SERVICE_ACCOUNT_PATH = process.env.SERVICE_ACCOUNT_PATH

let app: App | null = null
let db: Database | null = null

// Seed vehicle plate patterns (from seed-firebase-rest.ts)
const SEED_PLATE_PATTERNS = [
  /^51B-\d{3}\.\d{2}$/,  // 51B-123.45, 51B-678.90, etc.
  /^51B-\d{3}\.\d{2}$/,
  /^212121A$/i,
  /^98H07480$/i,
]

// Seed operator codes
const SEED_OPERATOR_CODES = ['FUTA', 'THANHBUOI', 'KUMHO', 'TEST']

function initializeFirebase() {
  if (app) return

  if (!getApps().length) {
    if (SERVICE_ACCOUNT_PATH) {
      const absolutePath = resolve(process.cwd(), SERVICE_ACCOUNT_PATH)
      const serviceAccount = JSON.parse(readFileSync(absolutePath, 'utf-8'))
      app = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: RTDB_URL
      })
    } else {
      app = initializeApp({
        databaseURL: RTDB_URL
      })
    }
  } else {
    app = getApps()[0]
  }

  db = getDatabase(app)
}

function isSeedPlate(plateNumber: string): boolean {
  if (!plateNumber) return false
  return SEED_PLATE_PATTERNS.some(pattern => pattern.test(plateNumber))
}

function isSeedOperatorCode(code: string): boolean {
  if (!code) return false
  return SEED_OPERATOR_CODES.includes(code.toUpperCase())
}

async function cleanupCollection(
  collectionPath: string,
  shouldDelete: (key: string, data: any) => boolean,
  dryRun: boolean
): Promise<{ deleted: number; kept: number; deletedKeys: string[] }> {
  const stats = { deleted: 0, kept: 0, deletedKeys: [] as string[] }
  
  const snapshot = await db!.ref(collectionPath).once('value')
  const data = snapshot.val()
  
  if (!data) {
    console.log(`    No data in ${collectionPath}`)
    return stats
  }
  
  const keys = Object.keys(data)
  console.log(`    Found ${keys.length} records`)
  
  for (const key of keys) {
    const record = data[key]
    if (shouldDelete(key, record)) {
      stats.deletedKeys.push(key)
      stats.deleted++
      
      if (!dryRun) {
        await db!.ref(`${collectionPath}/${key}`).remove()
      }
    } else {
      stats.kept++
    }
  }
  
  return stats
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  CLEANUP SEED/TEST DATA')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')
  console.log(`  Target: ${RTDB_URL}`)
  console.log(`  Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE DELETE'}`)
  console.log('')
  
  initializeFirebase()
  
  // Collect seed operator IDs first
  console.log('  Step 1: Finding seed operators...')
  const operatorsSnap = await db!.ref('operators').once('value')
  const operatorsData = operatorsSnap.val() || {}
  const seedOperatorIds = new Set<string>()
  
  for (const [key, op] of Object.entries(operatorsData) as [string, any][]) {
    if (op && isSeedOperatorCode(op.code)) {
      seedOperatorIds.add(key)
      console.log(`    Found seed operator: ${op.code} (${key})`)
    }
  }
  
  // 1. Clean up vehicles
  console.log('\n  Step 2: Cleaning vehicles...')
  const vehicleStats = await cleanupCollection(
    'vehicles',
    (_key, vehicle) => {
      // Delete if: seed plate pattern, inactive, or belongs to seed operator
      if (!vehicle) return true
      if (isSeedPlate(vehicle.plate_number || vehicle.plateNumber)) return true
      if (vehicle.is_active === false) return true
      if (seedOperatorIds.has(vehicle.operator_id || vehicle.operatorId)) return true
      return false
    },
    dryRun
  )
  console.log(`    ${dryRun ? 'Would delete' : 'Deleted'}: ${vehicleStats.deleted}, Kept: ${vehicleStats.kept}`)
  if (vehicleStats.deletedKeys.length > 0 && vehicleStats.deletedKeys.length <= 20) {
    console.log(`    Deleted plates: ${vehicleStats.deletedKeys.slice(0, 10).join(', ')}${vehicleStats.deletedKeys.length > 10 ? '...' : ''}`)
  }
  
  // 2. Clean up drivers
  console.log('\n  Step 3: Cleaning drivers...')
  const driverStats = await cleanupCollection(
    'drivers',
    (_key, driver) => {
      if (!driver) return true
      if (driver.is_active === false) return true
      // Check if driver's operator is a seed operator
      const driverOperators = driver.operators || []
      if (Array.isArray(driverOperators)) {
        for (const op of driverOperators) {
          if (seedOperatorIds.has(op.operatorId || op.operator_id)) return true
        }
      }
      return false
    },
    dryRun
  )
  console.log(`    ${dryRun ? 'Would delete' : 'Deleted'}: ${driverStats.deleted}, Kept: ${driverStats.kept}`)
  
  // 3. Clean up vehicle badges with seed plates
  console.log('\n  Step 4: Cleaning vehicle badges...')
  const badgeStats = await cleanupCollection(
    'vehicle_badges',
    (_key, badge) => {
      if (!badge) return true
      const plateNumber = badge.BienSoXe || badge.plate_number || ''
      if (isSeedPlate(plateNumber)) return true
      if (badge.TrangThai === 'Hết hiệu lực' || badge.status === 'expired') return true
      return false
    },
    dryRun
  )
  console.log(`    ${dryRun ? 'Would delete' : 'Deleted'}: ${badgeStats.deleted}, Kept: ${badgeStats.kept}`)
  
  // 4. Clean up seed operators
  console.log('\n  Step 5: Cleaning operators...')
  const operatorStats = await cleanupCollection(
    'operators',
    (_key, operator) => {
      if (!operator) return true
      if (isSeedOperatorCode(operator.code)) return true
      if (operator.is_active === false) return true
      return false
    },
    dryRun
  )
  console.log(`    ${dryRun ? 'Would delete' : 'Deleted'}: ${operatorStats.deleted}, Kept: ${operatorStats.kept}`)
  
  // 5. Clean up driver_operators junction
  console.log('\n  Step 6: Cleaning driver_operators junction...')
  const junctionStats = await cleanupCollection(
    'driver_operators',
    (_key, junction) => {
      if (!junction) return true
      if (seedOperatorIds.has(junction.operator_id || junction.operatorId)) return true
      return false
    },
    dryRun
  )
  console.log(`    ${dryRun ? 'Would delete' : 'Deleted'}: ${junctionStats.deleted}, Kept: ${junctionStats.kept}`)
  
  // Summary
  const totalDeleted = vehicleStats.deleted + driverStats.deleted + badgeStats.deleted + operatorStats.deleted + junctionStats.deleted
  const totalKept = vehicleStats.kept + driverStats.kept + badgeStats.kept + operatorStats.kept + junctionStats.kept
  
  console.log('')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`  Total ${dryRun ? 'would delete' : 'deleted'}: ${totalDeleted}`)
  console.log(`  Total kept: ${totalKept}`)
  console.log('')
  
  if (dryRun) {
    console.log('  Dry run complete. Run without --dry-run to actually delete.')
  } else {
    console.log('  Cleanup complete!')
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
