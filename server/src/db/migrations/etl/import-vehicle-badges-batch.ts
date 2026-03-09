/**
 * Batch Import Vehicle Badges from Firebase Export
 * OPTIMIZED VERSION: Pre-load mappings, batch insert
 */
import { db } from '../../drizzle'
import { vehicleBadges, vehicles, idMappings, routes } from '../../schema'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { eq } from 'drizzle-orm'
import { parseBoolean, parseDate, ensureDbInitialized } from './etl-helpers'

const BATCH_SIZE = 100

interface FirebaseVehicleBadge {
  _firebase_id: string
  id: string
  badge_number?: string
  vehicle_id?: string
  expiry_date?: string
  issue_date?: string
  is_active?: boolean | string
  metadata?: Record<string, unknown>
  synced_at?: string
  source?: string
  created_at?: string
  updated_at?: string
}

interface DatasheetVehicleBadge {
  _firebase_id: string
  id: string
  badge_number?: string
  badge_type?: string
  badge_color?: string
  vehicle_id?: string
  route_ref?: string
  business_license_ref?: string
  issuing_authority_ref?: string
  expiry_date?: string
  issue_date?: string
  issue_type?: string
  status?: string
  revoke_date?: string
  revoke_decision?: string
  revoke_reason?: string
  file_number?: string
  old_badge_number?: string
  replacement_vehicle?: string
  vehicle_replaced?: string
  notes?: string
  synced_at?: string
  source?: string
}

/**
 * Parse DD/MM/YYYY format to ISO string
 */
function parseDDMMYYYY(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/**
 * Pre-load all vehicle ID mappings into memory
 */
async function loadVehicleMappings(): Promise<Map<string, string>> {
  const mappings = await db!.select().from(idMappings).where(eq(idMappings.entityType, 'vehicles'))
  const map = new Map<string, string>()
  for (const m of mappings) {
    map.set(m.firebaseId, m.postgresId)
  }
  console.log(`  Loaded ${map.size} vehicle ID mappings into memory`)
  return map
}

/**
 * Pre-load all vehicle plate numbers into memory
 */
async function loadVehiclePlates(): Promise<Map<string, string>> {
  const vList = await db!.select({ id: vehicles.id, plateNumber: vehicles.plateNumber }).from(vehicles)
  const map = new Map<string, string>()
  for (const v of vList) {
    map.set(v.id, v.plateNumber)
  }
  console.log(`  Loaded ${map.size} vehicle plate numbers into memory`)
  return map
}

/**
 * Pre-load route code -> ID mappings
 */
async function loadRouteMappings(): Promise<Map<string, string>> {
  const routeList = await db!.select({
    id: routes.id,
    routeCode: routes.routeCode
  }).from(routes)
  const map = new Map<string, string>()
  for (const r of routeList) {
    if (r.routeCode) map.set(r.routeCode, r.id)
  }
  console.log(`  Loaded ${map.size} route code mappings into memory`)
  return map
}

/**
 * Get existing badge numbers from database
 */
async function getExistingBadges(): Promise<Set<string>> {
  const existing = await db!.select({ badgeNumber: vehicleBadges.badgeNumber }).from(vehicleBadges)
  const set = new Set<string>()
  for (const b of existing) {
    set.add(b.badgeNumber)
  }
  console.log(`  Found ${set.size} existing badges in database`)
  return set
}

/**
 * Get existing firebase IDs from database
 */
async function getExistingFirebaseIds(): Promise<Set<string>> {
  const existing = await db!.select({ firebaseId: vehicleBadges.firebaseId }).from(vehicleBadges)
  const set = new Set<string>()
  for (const b of existing) {
    if (b.firebaseId) set.add(b.firebaseId)
  }
  console.log(`  Found ${set.size} existing firebase IDs in database`)
  return set
}

export async function importVehicleBadgesBatch(exportDir: string): Promise<number> {
  ensureDbInitialized()

  const regularFile = join(exportDir, 'vehicle_badges.json')
  const datasheetFile = join(exportDir, 'datasheet_vehicle_badges.json')

  let regularData: FirebaseVehicleBadge[] = []
  let datasheetData: DatasheetVehicleBadge[] = []

  // Load all data
  if (existsSync(regularFile)) {
    try {
      regularData = JSON.parse(readFileSync(regularFile, 'utf-8'))
      console.log(`  Loaded ${regularData.length} badges from vehicle_badges.json`)
    } catch {
      console.log('  ⚠ Failed to read vehicle_badges.json')
    }
  }

  if (existsSync(datasheetFile)) {
    try {
      datasheetData = JSON.parse(readFileSync(datasheetFile, 'utf-8'))
      console.log(`  Loaded ${datasheetData.length} badges from datasheet_vehicle_badges.json`)
    } catch {
      console.log('  ⚠ Failed to read datasheet_vehicle_badges.json')
    }
  }

  const totalCount = regularData.length + datasheetData.length
  if (totalCount === 0) {
    console.log('  ⚠ No vehicle badges data found, skipping...')
    return 0
  }

  console.log(`\n  Total: ${totalCount} badges to process`)

  // Pre-load all mappings
  console.log('\n  Pre-loading ID mappings...')
  const vehicleMappings = await loadVehicleMappings()
  const vehiclePlates = await loadVehiclePlates()
  const routeMappings = await loadRouteMappings()

  // Pre-load existing data
  console.log('\n  Loading existing data...')
  const existingBadges = await getExistingBadges()
  const existingFirebaseIds = await getExistingFirebaseIds()

  // Prepare records for batch insert
  console.log('\n  Pre-filtering duplicates...')
  type BadgeInsert = typeof vehicleBadges.$inferInsert
  const toInsert: Array<{ firebaseId: string; record: BadgeInsert }> = []
  let skippedDuplicate = 0

  // Process regular badges
  for (const item of regularData) {
    const firebaseId = item._firebase_id || item.id
    const badgeNumber = (item.badge_number || item.id).substring(0, 50)

    // Skip if already exists
    if (existingBadges.has(badgeNumber) || existingFirebaseIds.has(firebaseId)) {
      skippedDuplicate++
      continue
    }

    // Mark as processed
    existingBadges.add(badgeNumber)
    existingFirebaseIds.add(firebaseId)

    // Resolve FK from pre-loaded map
    const vehicleId = item.vehicle_id ? vehicleMappings.get(item.vehicle_id) || null : null
    const plateNumber = vehicleId ? (vehiclePlates.get(vehicleId) || `UNKNOWN_${item.id}`) : `UNKNOWN_${item.id}`

    toInsert.push({
      firebaseId,
      record: {
        firebaseId,
        badgeNumber,
        plateNumber: plateNumber.substring(0, 20),
        vehicleId,
        expiryDate: item.expiry_date || null,
        issueDate: item.issue_date || null,
        isActive: parseBoolean(item.is_active),
        metadata: item.metadata || null,
        syncedAt: parseDate(item.synced_at),
        source: item.source?.substring(0, 50) || 'firebase_migration',
        createdAt: parseDate(item.created_at) || new Date(),
        updatedAt: parseDate(item.updated_at) || new Date(),
      },
    })
  }

  // Process datasheet badges
  for (const item of datasheetData) {
    const firebaseId = item._firebase_id || item.id
    const badgeNumber = (item.badge_number || item.id).substring(0, 50)

    // Skip if already exists
    if (existingBadges.has(badgeNumber) || existingFirebaseIds.has(firebaseId)) {
      skippedDuplicate++
      continue
    }

    // Mark as processed
    existingBadges.add(badgeNumber)
    existingFirebaseIds.add(firebaseId)

    // Resolve FK from pre-loaded map
    const vehicleId = item.vehicle_id ? vehicleMappings.get(item.vehicle_id) || null : null
    const plateNumber = vehicleId ? (vehiclePlates.get(vehicleId) || `UNKNOWN_${item.id}`) : `UNKNOWN_${item.id}`

    // Build metadata from datasheet fields
    const metadata: Record<string, unknown> = {}
    if (item.badge_type) metadata.badge_type = item.badge_type
    if (item.badge_color) metadata.badge_color = item.badge_color
    if (item.route_ref) metadata.route_ref = item.route_ref
    if (item.business_license_ref) metadata.business_license_ref = item.business_license_ref
    if (item.issuing_authority_ref) metadata.issuing_authority_ref = item.issuing_authority_ref
    if (item.issue_type) metadata.issue_type = item.issue_type
    if (item.status) metadata.status = item.status
    if (item.revoke_date) metadata.revoke_date = item.revoke_date
    if (item.revoke_decision) metadata.revoke_decision = item.revoke_decision
    if (item.revoke_reason) metadata.revoke_reason = item.revoke_reason
    if (item.file_number) metadata.file_number = item.file_number
    if (item.old_badge_number) metadata.old_badge_number = item.old_badge_number
    if (item.replacement_vehicle) metadata.replacement_vehicle = item.replacement_vehicle
    if (item.vehicle_replaced) metadata.vehicle_replaced = item.vehicle_replaced
    if (item.notes) metadata.notes = item.notes

    // Resolve route from route_ref
    const routeRef = item.route_ref || ''
    const routeCode = routeRef || null
    const routeId = routeRef ? (routeMappings.get(routeRef) || null) : null

    toInsert.push({
      firebaseId,
      record: {
        firebaseId,
        badgeNumber,
        plateNumber: plateNumber.substring(0, 20),
        vehicleId,
        expiryDate: parseDDMMYYYY(item.expiry_date),
        issueDate: parseDDMMYYYY(item.issue_date),
        isActive: item.status !== 'Thu hồi',
        routeCode,
        routeId,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        syncedAt: parseDate(item.synced_at),
        source: item.source?.substring(0, 50) || 'google_sheets',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  console.log(`  Skipped ${skippedDuplicate} (duplicates)`)
  console.log(`  Ready to insert: ${toInsert.length} badges`)

  if (toInsert.length === 0) {
    console.log('  ✓ No new badges to import')
    return 0
  }

  // Batch insert
  console.log(`\n  Batch inserting (${BATCH_SIZE} per batch)...`)
  let imported = 0
  let failed = 0
  const startTime = Date.now()

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    const records = batch.map(b => b.record)

    try {
      const inserted = await db!.insert(vehicleBadges).values(records).returning({ id: vehicleBadges.id })

      // Batch store ID mappings
      const mappingsToInsert = inserted.map((ins, idx) => ({
        firebaseId: batch[idx].firebaseId,
        postgresId: ins.id,
        entityType: 'vehicle_badges' as const,
      }))
      await db!.insert(idMappings).values(mappingsToInsert)

      imported += inserted.length
    } catch {
      // Fallback: try one by one
      for (const item of batch) {
        try {
          const [ins] = await db!.insert(vehicleBadges).values(item.record).returning({ id: vehicleBadges.id })
          await db!.insert(idMappings).values({
            firebaseId: item.firebaseId,
            postgresId: ins.id,
            entityType: 'vehicle_badges',
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
  console.log(`\n\n  ✓ Vehicle Badges: ${imported} imported, ${failed} failed in ${totalTime.toFixed(1)}s`)
  console.log(`  Rate: ${(imported / totalTime).toFixed(1)} records/second`)

  return imported
}

// CLI entry
if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.log('Usage: npx tsx import-vehicle-badges-batch.ts <export-dir>')
    process.exit(1)
  }
  importVehicleBadgesBatch(args[0])
    .then(count => {
      console.log(`Done: ${count} badges imported`)
      process.exit(0)
    })
    .catch(err => {
      console.error('Failed:', err)
      process.exit(1)
    })
}
