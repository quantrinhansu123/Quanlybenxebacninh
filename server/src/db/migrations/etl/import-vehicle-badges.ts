/**
 * Import Vehicle Badges from Firebase Export
 * Level 3: Depends on vehicles
 */
import { db } from '../../drizzle'
import { vehicleBadges, vehicles } from '../../schema'
import { eq } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  storeIdMapping,
  getPostgresId,
  parseBoolean,
  parseDate,
  logProgress,
  ensureDbInitialized,
  logInvalidFK,
} from './etl-helpers'

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

async function importRegularBadges(exportDir: string): Promise<number> {
  const filePath = join(exportDir, 'vehicle_badges.json')
  let data: FirebaseVehicleBadge[]

  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    console.log('  ⚠ vehicle_badges.json not found, skipping...')
    return 0
  }

  console.log(`  Importing ${data.length} regular vehicle badges...`)

  let imported = 0
  let skipped = 0

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    try {
      const vehicleId = await getPostgresId(item.vehicle_id, 'vehicles')

      if (item.vehicle_id && !vehicleId) {
        await logInvalidFK(exportDir, 'vehicle_badges', item.id, 'vehicle_id', item.vehicle_id, 'vehicles')
      }

      let plateNumber = `UNKNOWN_${item.id}`
      if (vehicleId) {
        const [vehicle] = await db!.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1)
        if (vehicle?.plateNumber) {
          plateNumber = vehicle.plateNumber
        }
      }

      const [inserted] = await db!.insert(vehicleBadges).values({
        firebaseId: item._firebase_id || item.id,
        badgeNumber: (item.badge_number || item.id).substring(0, 50),
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
      }).returning()

      await storeIdMapping(item._firebase_id || item.id, inserted.id, 'vehicle_badges')
      imported++
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (!message.includes('duplicate')) {
        console.log(`\n  ✗ Failed: ${item.id} - ${message}`)
      }
      skipped++
    }

    if (i % 500 === 0) {
      logProgress(i + 1, data.length, 'vehicle_badges')
    }
  }

  console.log(`\n  ✓ Regular Badges: ${imported} imported, ${skipped} skipped`)
  return imported
}

async function importDatasheetBadges(exportDir: string): Promise<number> {
  const filePath = join(exportDir, 'datasheet_vehicle_badges.json')
  let data: DatasheetVehicleBadge[]

  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    console.log('  ⚠ datasheet_vehicle_badges.json not found, skipping...')
    return 0
  }

  console.log(`  Importing ${data.length} datasheet vehicle badges...`)

  let imported = 0
  let skipped = 0

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    try {
      const vehicleId = await getPostgresId(item.vehicle_id, 'vehicles')

      if (item.vehicle_id && !vehicleId) {
        await logInvalidFK(exportDir, 'datasheet_vehicle_badges', item.id, 'vehicle_id', item.vehicle_id, 'vehicles')
      }

      let plateNumber = `UNKNOWN_${item.id}`
      if (vehicleId) {
        const [vehicle] = await db!.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1)
        if (vehicle?.plateNumber) {
          plateNumber = vehicle.plateNumber
        }
      }

      // Build metadata from datasheet fields
      const metadata: Record<string, unknown> = {
        badge_type: item.badge_type,
        badge_color: item.badge_color,
        route_ref: item.route_ref,
        business_license_ref: item.business_license_ref,
        issuing_authority_ref: item.issuing_authority_ref,
        issue_type: item.issue_type,
        status: item.status,
        revoke_date: item.revoke_date,
        revoke_decision: item.revoke_decision,
        revoke_reason: item.revoke_reason,
        file_number: item.file_number,
        old_badge_number: item.old_badge_number,
        replacement_vehicle: item.replacement_vehicle,
        vehicle_replaced: item.vehicle_replaced,
        notes: item.notes,
      }

      // Remove empty values
      Object.keys(metadata).forEach(key => {
        if (!metadata[key] || metadata[key] === '') {
          delete metadata[key]
        }
      })

      const [inserted] = await db!.insert(vehicleBadges).values({
        firebaseId: item._firebase_id || item.id,
        badgeNumber: (item.badge_number || item.id).substring(0, 50),
        plateNumber: plateNumber.substring(0, 20),
        vehicleId,
        expiryDate: parseDDMMYYYY(item.expiry_date),
        issueDate: parseDDMMYYYY(item.issue_date),
        isActive: item.status !== 'Thu hồi',
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        syncedAt: parseDate(item.synced_at),
        source: item.source?.substring(0, 50) || 'google_sheets',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning()

      await storeIdMapping(item._firebase_id || item.id, inserted.id, 'vehicle_badges')
      imported++
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (!message.includes('duplicate')) {
        console.log(`\n  ✗ Failed: ${item.id} - ${message}`)
      }
      skipped++
    }

    if (i % 500 === 0) {
      logProgress(i + 1, data.length, 'datasheet_vehicle_badges')
    }
  }

  console.log(`\n  ✓ Datasheet Badges: ${imported} imported, ${skipped} skipped`)
  return imported
}

export async function importVehicleBadges(exportDir: string): Promise<number> {
  ensureDbInitialized()

  const regularCount = await importRegularBadges(exportDir)
  const datasheetCount = await importDatasheetBadges(exportDir)

  const total = regularCount + datasheetCount
  console.log(`\n  ✓ Total Vehicle Badges: ${total}`)
  return total
}
