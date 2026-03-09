/**
 * Import Vehicle Types from Firebase Export
 * Level 1: No dependencies
 */
import { db } from '../../drizzle'
import { vehicleTypes } from '../../schema'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  storeIdMapping,
  parseBoolean,
  parseDate,
  logProgress,
  ensureDbInitialized,
} from './etl-helpers'

interface FirebaseVehicleType {
  _firebase_id: string
  id: string
  name?: string
  code?: string
  description?: string
  seat_capacity?: number
  is_active?: boolean | string
  created_at?: string
  updated_at?: string
}

export async function importVehicleTypes(exportDir: string): Promise<number> {
  ensureDbInitialized()

  const filePath = join(exportDir, 'vehicle_types.json')
  let data: FirebaseVehicleType[]

  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    console.log('  ⚠ vehicle_types.json not found, skipping...')
    return 0
  }

  console.log(`  Importing ${data.length} vehicle types...`)

  let imported = 0
  let skipped = 0

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    try {
      const [inserted] = await db!.insert(vehicleTypes).values({
        firebaseId: item._firebase_id || item.id,
        name: (item.name || `Type_${item.id}`).substring(0, 100),
        code: (item.code || item.id.substring(0, 20)).substring(0, 20),
        description: item.description?.substring(0, 255) || null,
        seatCount: item.seat_capacity || null,
        isActive: parseBoolean(item.is_active),
        createdAt: parseDate(item.created_at) || new Date(),
        updatedAt: parseDate(item.updated_at) || new Date(),
      }).returning()

      await storeIdMapping(item._firebase_id || item.id, inserted.id, 'vehicle_types')
      imported++
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (!message.includes('duplicate')) {
        console.log(`\n  ✗ Failed: ${item.id} - ${message}`)
      }
      skipped++
    }

    if (i % 50 === 0) {
      logProgress(i + 1, data.length, 'vehicle_types')
    }
  }

  console.log(`\n  ✓ Vehicle Types: ${imported} imported, ${skipped} skipped`)
  return imported
}
