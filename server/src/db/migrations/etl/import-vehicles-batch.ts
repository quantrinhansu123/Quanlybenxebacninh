/**
 * Batch Import Vehicles from Firebase Export
 * OPTIMIZED VERSION: 10-50x faster than single-record inserts
 *
 * Optimizations:
 * 1. Pre-load all operator/vehicle_type ID mappings into memory
 * 2. Pre-filter duplicates before insert
 * 3. Batch insert (100 records per batch)
 * 4. Batch store ID mappings
 */
import { db } from '../../drizzle'
import { vehicles, idMappings } from '../../schema'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { eq } from 'drizzle-orm'
import { parseBoolean, parseDate, ensureDbInitialized } from './etl-helpers'

const BATCH_SIZE = 100

interface FirebaseVehicle {
  _firebase_id: string
  id: string
  plate_number?: string
  operator_id?: string
  vehicle_type_id?: string
  seat_capacity?: number
  seat_count?: number
  bed_capacity?: number
  load_capacity?: number
  manufacturer?: string
  brand?: string
  model?: string
  manufacture_year?: number
  year_of_manufacture?: number
  color?: string
  chassis_number?: string
  engine_number?: string
  insurance_expiry_date?: string
  inspection_expiry_date?: string
  image_url?: string
  cargo_length?: number
  cargo_width?: number
  cargo_height?: number
  gps_provider?: string
  gps_username?: string
  gps_password?: string
  province?: string
  notes?: string
  registration_info?: string
  is_active?: boolean | string
  operational_status?: string
  operator_name?: string
  operator_code?: string
  owner_name?: string
  metadata?: Record<string, unknown>
  synced_at?: string
  source?: string
  created_at?: string
  updated_at?: string
}

function normalizePlateNumber(plate: string): string {
  return plate.trim().toUpperCase().replace(/[\s.\-]/g, '')
}

/**
 * Pre-load all ID mappings for a given entity type into a Map
 */
async function loadIdMappings(entityType: string): Promise<Map<string, string>> {
  const mappings = await db!.select().from(idMappings).where(eq(idMappings.entityType, entityType))
  const map = new Map<string, string>()
  for (const m of mappings) {
    map.set(m.firebaseId, m.postgresId)
  }
  console.log(`  Loaded ${map.size} ${entityType} ID mappings into memory`)
  return map
}

/**
 * Get existing plate numbers from database
 */
async function getExistingPlates(): Promise<Set<string>> {
  const existing = await db!.select({ plateNumber: vehicles.plateNumber }).from(vehicles)
  const set = new Set<string>()
  for (const v of existing) {
    set.add(v.plateNumber)
  }
  console.log(`  Found ${set.size} existing plates in database`)
  return set
}

/**
 * Get existing firebase IDs from database
 */
async function getExistingFirebaseIds(): Promise<Set<string>> {
  const existing = await db!.select({ firebaseId: vehicles.firebaseId }).from(vehicles)
  const set = new Set<string>()
  for (const v of existing) {
    if (v.firebaseId) set.add(v.firebaseId)
  }
  console.log(`  Found ${set.size} existing firebase IDs in database`)
  return set
}

export async function importVehiclesBatch(exportDir: string): Promise<number> {
  ensureDbInitialized()

  const vehiclesFile = join(exportDir, 'vehicles.json')
  const datasheetFile = join(exportDir, 'datasheet_vehicles.json')

  let data: FirebaseVehicle[] = []

  // Load all data
  if (existsSync(vehiclesFile)) {
    try {
      const appVehicles = JSON.parse(readFileSync(vehiclesFile, 'utf-8'))
      data = data.concat(appVehicles)
      console.log(`  Loaded ${appVehicles.length} vehicles from vehicles.json`)
    } catch {
      console.log('  ⚠ Failed to read vehicles.json')
    }
  }

  if (existsSync(datasheetFile)) {
    try {
      const datasheetVehicles = JSON.parse(readFileSync(datasheetFile, 'utf-8'))
      data = data.concat(datasheetVehicles)
      console.log(`  Loaded ${datasheetVehicles.length} vehicles from datasheet_vehicles.json`)
    } catch (error) {
      console.log('  ⚠ Failed to read datasheet_vehicles.json:', error)
    }
  }

  if (data.length === 0) {
    console.log('  ⚠ No vehicles data found, skipping...')
    return 0
  }

  console.log(`\n  Total: ${data.length} vehicles to process`)

  // OPTIMIZATION 1: Pre-load all ID mappings
  console.log('\n  Pre-loading ID mappings...')
  const operatorMappings = await loadIdMappings('operators')
  const vehicleTypeMappings = await loadIdMappings('vehicle_types')

  // OPTIMIZATION 2: Get existing plates to filter duplicates
  console.log('\n  Loading existing data...')
  const existingPlates = await getExistingPlates()
  const existingFirebaseIds = await getExistingFirebaseIds()

  // OPTIMIZATION 3: Pre-filter and transform all records
  console.log('\n  Pre-filtering duplicates...')
  type VehicleInsert = typeof vehicles.$inferInsert
  const toInsert: Array<{ firebaseId: string; record: VehicleInsert }> = []
  let skippedNoPlate = 0
  let skippedDuplicate = 0

  for (const item of data) {
    const plateNumber = item.plate_number
    if (!plateNumber) {
      skippedNoPlate++
      continue
    }

    const normalizedPlate = normalizePlateNumber(plateNumber)
    const firebaseId = item._firebase_id || item.id

    // Skip if already exists
    if (existingPlates.has(normalizedPlate) || existingFirebaseIds.has(firebaseId)) {
      skippedDuplicate++
      continue
    }

    // Mark as processed to avoid duplicates within batch
    existingPlates.add(normalizedPlate)
    existingFirebaseIds.add(firebaseId)

    // Resolve FKs from pre-loaded maps
    const operatorId = item.operator_id ? operatorMappings.get(item.operator_id) || null : null
    const vehicleTypeId = item.vehicle_type_id ? vehicleTypeMappings.get(item.vehicle_type_id) || null : null

    const seatCount = item.seat_count ?? item.seat_capacity ?? 0
    let notes = item.notes || ''
    if (item.registration_info) {
      notes = notes ? `${notes}\n\n${item.registration_info}` : item.registration_info
    }

    toInsert.push({
      firebaseId,
      record: {
        firebaseId: firebaseId,
        plateNumber: normalizedPlate.substring(0, 20),
        operatorId: operatorId,
        vehicleTypeId: vehicleTypeId,
        seatCount: seatCount,
        bedCapacity: item.bed_capacity || item.load_capacity || 0,
        brand: (item.brand || item.manufacturer)?.substring(0, 100) || null,
        model: item.model?.substring(0, 100) || null,
        yearOfManufacture: item.manufacture_year || item.year_of_manufacture || null,
        color: item.color?.substring(0, 50) || null,
        chassisNumber: item.chassis_number?.substring(0, 50) || null,
        engineNumber: item.engine_number?.substring(0, 50) || null,
        registrationExpiry: null,
        insuranceExpiry: item.insurance_expiry_date || null,
        roadWorthinessExpiry: item.inspection_expiry_date || null,
        imageUrl: item.image_url?.substring(0, 500) || null,
        cargoLength: item.cargo_length || null,
        cargoWidth: item.cargo_width || null,
        cargoHeight: item.cargo_height || null,
        gpsProvider: item.gps_provider?.substring(0, 100) || null,
        gpsUsername: item.gps_username?.substring(0, 100) || null,
        gpsPassword: item.gps_password?.substring(0, 100) || null,
        province: item.province?.substring(0, 100) || null,
        notes: notes?.substring(0, 500) || null,
        isActive: parseBoolean(item.is_active),
        operationalStatus: item.operational_status?.substring(0, 50) || 'active',
        operatorName: (item.operator_name || item.owner_name)?.substring(0, 255) || null,
        operatorCode: item.operator_code?.substring(0, 50) || null,
        metadata: item.metadata || null,
        syncedAt: parseDate(item.synced_at),
        source: item.source?.substring(0, 50) || 'firebase_migration',
        createdAt: parseDate(item.created_at) || new Date(),
        updatedAt: parseDate(item.updated_at) || new Date(),
      },
    })
  }

  console.log(`  Skipped ${skippedNoPlate} (no plate) + ${skippedDuplicate} (duplicates)`)
  console.log(`  Ready to insert: ${toInsert.length} vehicles`)

  if (toInsert.length === 0) {
    console.log('  ✓ No new vehicles to import')
    return 0
  }

  // OPTIMIZATION 4: Batch insert
  console.log(`\n  Batch inserting (${BATCH_SIZE} per batch)...`)
  let imported = 0
  let failed = 0
  const startTime = Date.now()

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    const records = batch.map(b => b.record)

    try {
      const inserted = await db!.insert(vehicles).values(records).returning({ id: vehicles.id })

      // Batch store ID mappings
      const mappingsToInsert = inserted.map((ins, idx) => ({
        firebaseId: batch[idx].firebaseId,
        postgresId: ins.id,
        entityType: 'vehicles' as const,
      }))
      await db!.insert(idMappings).values(mappingsToInsert)

      imported += inserted.length
    } catch (error) {
      // Fallback: try one by one
      for (const item of batch) {
        try {
          const [ins] = await db!.insert(vehicles).values(item.record).returning({ id: vehicles.id })
          await db!.insert(idMappings).values({
            firebaseId: item.firebaseId,
            postgresId: ins.id,
            entityType: 'vehicles',
          })
          imported++
        } catch {
          failed++
        }
      }
    }

    // Progress
    const progress = Math.round(((i + batch.length) / toInsert.length) * 100)
    const elapsed = (Date.now() - startTime) / 1000
    const rate = imported / elapsed
    process.stdout.write(`\r  [${progress}%] ${imported}/${toInsert.length} imported (${rate.toFixed(1)}/sec)`)
  }

  const totalTime = (Date.now() - startTime) / 1000
  console.log(`\n\n  ✓ Vehicles: ${imported} imported, ${failed} failed in ${totalTime.toFixed(1)}s`)
  console.log(`  Rate: ${(imported / totalTime).toFixed(1)} records/second`)

  return imported
}

// CLI entry
if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.log('Usage: npx tsx import-vehicles-batch.ts <export-dir>')
    process.exit(1)
  }
  importVehiclesBatch(args[0])
    .then(count => {
      console.log(`Done: ${count} vehicles imported`)
      process.exit(0)
    })
    .catch(err => {
      console.error('Failed:', err)
      process.exit(1)
    })
}
