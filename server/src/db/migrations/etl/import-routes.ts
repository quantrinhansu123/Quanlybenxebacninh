/**
 * Import Routes from Firebase Export
 * Level 1: No dependencies
 */
import { db } from '../../drizzle'
import { routes } from '../../schema'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { storeIdMapping, parseBoolean, parseDate, logProgress, ensureDbInitialized } from './etl-helpers'

interface FirebaseRoute {
  _firebase_id: string
  id: string
  route_code?: string
  route_name?: string
  route_type?: string
  departure_province?: string
  departure_station?: string
  departure_station_ref?: string
  arrival_province?: string
  arrival_station?: string
  arrival_station_ref?: string
  distance_km?: number
  itinerary?: string
  journey_description?: string
  total_trips_per_month?: number
  trips_operated?: number
  remaining_capacity?: number
  min_interval_minutes?: number
  decision_number?: string
  decision_date?: string
  issuing_authority?: string
  operation_status?: string
  is_active?: boolean | string
  metadata?: Record<string, unknown>
  synced_at?: string
  source?: string
  created_at?: string
  updated_at?: string
  // Alternative fields
  boarding_point?: string
  destination_id?: string
  origin_id?: string
}

export async function importRoutes(exportDir: string): Promise<number> {
  ensureDbInitialized()

  // Try both routes.json and datasheet_routes.json
  const routesFile = join(exportDir, 'routes.json')
  const datasheetFile = join(exportDir, 'datasheet_routes.json')

  let data: FirebaseRoute[] = []

  // Load routes.json (app-created, small)
  if (existsSync(routesFile)) {
    try {
      const appRoutes = JSON.parse(readFileSync(routesFile, 'utf-8'))
      data = data.concat(appRoutes)
      console.log(`  Loaded ${appRoutes.length} routes from routes.json`)
    } catch {
      console.log('  ⚠ Failed to read routes.json')
    }
  }

  // Load datasheet_routes.json (datasheet, large)
  if (existsSync(datasheetFile)) {
    try {
      const datasheetRoutes = JSON.parse(readFileSync(datasheetFile, 'utf-8'))
      data = data.concat(datasheetRoutes)
      console.log(`  Loaded ${datasheetRoutes.length} routes from datasheet_routes.json`)
    } catch {
      console.log('  ⚠ Failed to read datasheet_routes.json')
    }
  }

  if (data.length === 0) {
    console.log('  ⚠ No routes data found, skipping...')
    return 0
  }

  console.log(`  Importing ${data.length} routes total...`)

  let imported = 0
  let skipped = 0

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    try {
      // Generate route code if not present
      const routeCode = item.route_code || item.id.substring(0, 50)

      const [inserted] = await db!.insert(routes).values({
        firebaseId: item._firebase_id || item.id,
        routeCode: routeCode.substring(0, 50),
        routeCodeOld: null,
        departureProvince: item.departure_province?.substring(0, 100) || null,
        departureStation: (item.departure_station || item.boarding_point)?.substring(0, 255) || null,
        departureStationRef: item.departure_station_ref?.substring(0, 20) || null,
        arrivalProvince: item.arrival_province?.substring(0, 100) || null,
        arrivalStation: item.arrival_station?.substring(0, 255) || null,
        arrivalStationRef: item.arrival_station_ref?.substring(0, 20) || null,
        distanceKm: item.distance_km || null,
        itinerary: item.itinerary || item.journey_description || null,
        routeType: item.route_type?.substring(0, 50) || null,
        totalTripsPerMonth: item.total_trips_per_month || null,
        tripsOperated: item.trips_operated || null,
        remainingCapacity: item.remaining_capacity || null,
        minIntervalMinutes: item.min_interval_minutes || null,
        decisionNumber: item.decision_number?.substring(0, 100) || null,
        decisionDate: item.decision_date?.substring(0, 20) || null,
        issuingAuthority: item.issuing_authority?.substring(0, 255) || null,
        operationStatus: item.operation_status?.substring(0, 50) || null,
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
      if (message.includes('duplicate')) {
        skipped++
      } else {
        console.log(`\n  ✗ Failed: ${item.id} - ${message}`)
        skipped++
      }
    }

    if (i % 100 === 0) {
      logProgress(i + 1, data.length, 'routes')
    }
  }

  console.log(`\n  ✓ Routes: ${imported} imported, ${skipped} skipped`)
  return imported
}
