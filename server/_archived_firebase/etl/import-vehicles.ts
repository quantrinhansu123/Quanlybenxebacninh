/**
 * Import Vehicles from Firebase Export
 * Level 2: Depends on operators, vehicle_types
 */
import { db } from '../../drizzle'
import { vehicles } from '../../schema'
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

interface FirebaseVehicle {
  _firebase_id: string
  id: string
  plate_number?: string
  biensoxe?: string // Alternative field name
  operator_id?: string
  vehicle_type_id?: string
  seat_count?: number
  soghe?: number // Alternative field name
  registration_expiry?: string
  insurance_expiry?: string
  is_active?: boolean | string
  metadata?: Record<string, unknown>
  synced_at?: string
  source?: string
  created_at?: string
  updated_at?: string
}

export async function importVehicles(exportDir: string): Promise<number> {
  ensureDbInitialized()

  const filePath = join(exportDir, 'vehicles.json')
  let data: FirebaseVehicle[]

  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    console.log('  ⚠ vehicles.json not found, skipping...')
    return 0
  }

  console.log(`  Importing ${data.length} vehicles...`)

  let imported = 0
  let skipped = 0

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    // Skip legacy/badge vehicles
    if (item.id.startsWith('legacy_') || item.id.startsWith('badge_')) {
      skipped++
      continue
    }

    try {
      const operatorId = await getPostgresId(item.operator_id, 'operators')
      const vehicleTypeId = await getPostgresId(item.vehicle_type_id, 'vehicle_types')

      // Log invalid FKs
      if (item.operator_id && !operatorId) {
        await logInvalidFK(exportDir, 'vehicles', item.id, 'operator_id', item.operator_id, 'operators')
      }
      if (item.vehicle_type_id && !vehicleTypeId) {
        await logInvalidFK(exportDir, 'vehicles', item.id, 'vehicle_type_id', item.vehicle_type_id, 'vehicle_types')
      }

      const plateNumber = item.plate_number || item.biensoxe || item.id

      const [inserted] = await db!.insert(vehicles).values({
        firebaseId: item._firebase_id || item.id,
        plateNumber: plateNumber.substring(0, 20),
        operatorId,
        vehicleTypeId,
        seatCount: item.seat_count || item.soghe || null,
        registrationExpiry: item.registration_expiry?.substring(0, 20) || null,
        insuranceExpiry: item.insurance_expiry?.substring(0, 20) || null,
        isActive: parseBoolean(item.is_active),
        metadata: item.metadata || null,
        syncedAt: parseDate(item.synced_at),
        source: item.source?.substring(0, 50) || 'firebase_migration',
        createdAt: parseDate(item.created_at) || new Date(),
        updatedAt: parseDate(item.updated_at) || new Date(),
      }).returning()

      await storeIdMapping(item._firebase_id || item.id, inserted.id, 'vehicles')
      imported++
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (!message.includes('duplicate')) {
        console.log(`\n  ✗ Failed: ${item.id} - ${message}`)
      }
      skipped++
    }

    if (i % 500 === 0) {
      logProgress(i + 1, data.length, 'vehicles')
    }
  }

  console.log(`\n  ✓ Vehicles: ${imported} imported, ${skipped} skipped`)
  return imported
}
