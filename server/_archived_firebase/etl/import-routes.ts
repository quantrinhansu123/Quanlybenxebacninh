/**
 * Import Routes from Firebase Export
 * Level 2: No direct dependencies (provinces optional)
 */
import { db } from '../../drizzle'
import { routes } from '../../schema'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  storeIdMapping,
  parseBoolean,
  parseDate,
  logProgress,
  ensureDbInitialized,
} from './etl-helpers'

interface FirebaseRoute {
  _firebase_id: string
  id: string
  code?: string
  name?: string
  description?: string
  start_location?: string
  end_location?: string
  distance_km?: number
  duration_minutes?: number
  is_active?: boolean | string
  metadata?: Record<string, unknown>
  synced_at?: string
  source?: string
  created_at?: string
  updated_at?: string
  // Alternative field names from datasheet
  MATUYEN?: string
  TENTUYEN?: string
}

export async function importRoutes(exportDir: string): Promise<number> {
  ensureDbInitialized()

  const filePath = join(exportDir, 'routes.json')
  let data: FirebaseRoute[]

  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    console.log('  ⚠ routes.json not found, skipping...')
    return 0
  }

  console.log(`  Importing ${data.length} routes...`)

  let imported = 0
  let skipped = 0

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    try {
      const code = item.code || item.MATUYEN || item.id.substring(0, 20)
      const name = item.name || item.TENTUYEN || `Route_${item.id}`

      const [inserted] = await db!.insert(routes).values({
        firebaseId: item._firebase_id || item.id,
        routeCode: code.substring(0, 50),
        routeCodeOld: null,
        departureProvince: null,
        departureStation: item.start_location?.substring(0, 255) || null,
        departureStationRef: null,
        arrivalProvince: null,
        arrivalStation: item.end_location?.substring(0, 255) || null,
        arrivalStationRef: null,
        distanceKm: item.distance_km || null,
        itinerary: item.description || null,
        routeType: null,
        totalTripsPerMonth: null,
        tripsOperated: null,
        remainingCapacity: null,
        minIntervalMinutes: item.duration_minutes || null,
        decisionNumber: null,
        decisionDate: null,
        issuingAuthority: null,
        operationStatus: null,
        isActive: parseBoolean(item.is_active),
        metadata: item.metadata || null,
        syncedAt: parseDate(item.synced_at),
        source: item.source?.substring(0, 50) || 'firebase_migration',
        createdAt: parseDate(item.created_at) || new Date(),
        updatedAt: parseDate(item.updated_at) || new Date(),
      }).returning()

      await storeIdMapping(item._firebase_id || item.id, inserted.id, 'routes')
      imported++
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (!message.includes('duplicate')) {
        console.log(`\n  ✗ Failed: ${item.id} - ${message}`)
      }
      skipped++
    }

    if (i % 100 === 0) {
      logProgress(i + 1, data.length, 'routes')
    }
  }

  console.log(`\n  ✓ Routes: ${imported} imported, ${skipped} skipped`)
  return imported
}
