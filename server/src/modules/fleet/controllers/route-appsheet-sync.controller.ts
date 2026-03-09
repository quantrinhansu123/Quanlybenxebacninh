/**
 * Route AppSheet Sync Controller
 * POST /api/vehicles/routes/appsheet-sync
 * Receives normalized route data from frontend polling, upserts to routes table
 *
 * Handles both fixed routes (upsert on route_code) and bus routes (upsert on firebase_id)
 */
import { Request, Response } from 'express'
import { routes } from '../../../db/schema/routes.js'
import { db } from '../../../db/drizzle.js'
import { sql } from 'drizzle-orm'

const MAX_BATCH_SIZE = 5_000
const MAX_STRING_LENGTH = 255
const BATCH_CHUNK_SIZE = 500

interface SyncRoutePayload {
  routeCode: string
  firebaseId?: string
  routeCodeOld?: string
  departureProvince?: string
  departureStation?: string
  departureStationRef?: string
  arrivalProvince?: string
  arrivalStation?: string
  arrivalStationRef?: string
  itinerary?: string
  routeType?: string
  operationStatus?: string
  distanceKm?: number
  totalTripsPerMonth?: number
  tripsOperated?: number
  remainingCapacity?: number
  minIntervalMinutes?: number
  decisionNumber?: string
  decisionDate?: string
  displayName?: string
}

/** Sanitize string: trim + truncate */
const sanitize = (val: unknown, maxLen = MAX_STRING_LENGTH): string | undefined => {
  if (typeof val !== 'string') return undefined
  const trimmed = val.trim()
  return trimmed ? trimmed.slice(0, maxLen) : undefined
}

export async function syncRoutesFromAppSheet(req: Request, res: Response) {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const payload = req.body?.routes as SyncRoutePayload[] | undefined
    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ error: 'routes array required' })
    }

    if (payload.length > MAX_BATCH_SIZE) {
      return res.status(400).json({ error: `Max ${MAX_BATCH_SIZE} routes per batch` })
    }

    const validRecords: (typeof routes.$inferInsert)[] = []
    const errors: string[] = []

    for (const r of payload) {
      const routeCode = sanitize(r.routeCode, 50)
      if (!routeCode) {
        errors.push('Missing routeCode')
        continue
      }

      // Build metadata for extended fields
      const metadataObj: Record<string, string> = {}
      if (r.displayName) metadataObj.display_name = r.displayName

      validRecords.push({
        firebaseId: sanitize(r.firebaseId, 100) || null,
        routeCode,
        routeCodeOld: sanitize(r.routeCodeOld, 50) || null,
        departureProvince: sanitize(r.departureProvince, 100) || null,
        departureStation: sanitize(r.departureStation) || null,
        departureStationRef: sanitize(r.departureStationRef, 20) || null,
        arrivalProvince: sanitize(r.arrivalProvince, 100) || null,
        arrivalStation: sanitize(r.arrivalStation) || null,
        arrivalStationRef: sanitize(r.arrivalStationRef, 20) || null,
        itinerary: typeof r.itinerary === 'string' ? r.itinerary.trim().slice(0, 2000) : null,
        routeType: sanitize(r.routeType, 50) || null,
        operationStatus: sanitize(r.operationStatus, 50) || null,
        distanceKm: r.distanceKm ?? null,
        totalTripsPerMonth: r.totalTripsPerMonth ?? null,
        tripsOperated: r.tripsOperated ?? null,
        remainingCapacity: r.remainingCapacity ?? null,
        minIntervalMinutes: r.minIntervalMinutes ?? null,
        decisionNumber: sanitize(r.decisionNumber, 100) || null,
        decisionDate: sanitize(r.decisionDate, 20) || null,
        metadata: Object.keys(metadataObj).length > 0 ? metadataObj : null,
        source: 'appsheet',
        syncedAt: new Date(),
        isActive: true,
      })
    }

    // Batch upsert on route_code (UNIQUE constraint)
    let upserted = 0
    for (let i = 0; i < validRecords.length; i += BATCH_CHUNK_SIZE) {
      const chunk = validRecords.slice(i, i + BATCH_CHUNK_SIZE)
      try {
        await db
          .insert(routes)
          .values(chunk)
          .onConflictDoUpdate({
            target: routes.routeCode,
            set: {
              firebaseId: sql`COALESCE(excluded.firebase_id, ${routes.firebaseId})`,
              routeCodeOld: sql`COALESCE(excluded.route_code_old, ${routes.routeCodeOld})`,
              departureProvince: sql`COALESCE(excluded.departure_province, ${routes.departureProvince})`,
              departureStation: sql`COALESCE(excluded.departure_station, ${routes.departureStation})`,
              departureStationRef: sql`COALESCE(excluded.departure_station_ref, ${routes.departureStationRef})`,
              arrivalProvince: sql`COALESCE(excluded.arrival_province, ${routes.arrivalProvince})`,
              arrivalStation: sql`COALESCE(excluded.arrival_station, ${routes.arrivalStation})`,
              arrivalStationRef: sql`COALESCE(excluded.arrival_station_ref, ${routes.arrivalStationRef})`,
              itinerary: sql`COALESCE(excluded.itinerary, ${routes.itinerary})`,
              routeType: sql`COALESCE(excluded.route_type, ${routes.routeType})`,
              operationStatus: sql`COALESCE(excluded.operation_status, ${routes.operationStatus})`,
              distanceKm: sql`COALESCE(excluded.distance_km, ${routes.distanceKm})`,
              totalTripsPerMonth: sql`COALESCE(excluded.total_trips_per_month, ${routes.totalTripsPerMonth})`,
              tripsOperated: sql`COALESCE(excluded.trips_operated, ${routes.tripsOperated})`,
              remainingCapacity: sql`COALESCE(excluded.remaining_capacity, ${routes.remainingCapacity})`,
              minIntervalMinutes: sql`COALESCE(excluded.min_interval_minutes, ${routes.minIntervalMinutes})`,
              decisionNumber: sql`COALESCE(excluded.decision_number, ${routes.decisionNumber})`,
              decisionDate: sql`COALESCE(excluded.decision_date, ${routes.decisionDate})`,
              metadata: sql`COALESCE(${routes.metadata}, '{}'::jsonb) || COALESCE(excluded.metadata, '{}'::jsonb)`,
              syncedAt: sql`excluded.synced_at`,
              source: sql`excluded.source`,
              updatedAt: sql`now()`,
            },
          })
        upserted += chunk.length
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Batch ${i}-${i + chunk.length}: ${msg}`)
      }
    }

    return res.json({ upserted, errors })
  } catch (error) {
    console.error('[route-appsheet-sync] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
