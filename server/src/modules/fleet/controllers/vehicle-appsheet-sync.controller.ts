/**
 * Vehicle AppSheet Sync Controller
 * POST /api/vehicles/appsheet-sync
 * Receives normalized vehicle data from frontend polling, upserts to DB
 * Only updates AppSheet-sourced fields, preserves user-edited fields
 */
import { Request, Response } from 'express'
import { vehicles } from '../../../db/schema/vehicles.js'
import { db } from '../../../db/drizzle.js'
import { sql } from 'drizzle-orm'

const MAX_BATCH_SIZE = 20_000
const MAX_STRING_LENGTH = 100
const BATCH_CHUNK_SIZE = 1000

interface SyncVehiclePayload {
  firebaseId: string
  plateNumber: string
  registrationName?: string
  seatCapacity?: number
  vehicleCategory?: string
  source: 'appsheet'
  syncedAt: string
}

/** Normalize plate: remove dots, dashes, spaces → uppercase */
const normPlate = (raw: string): string =>
  (raw || '').replace(/[\s.\-]/g, '').toUpperCase()

/** Sanitize string: trim + truncate to max length */
const sanitize = (val: unknown, maxLen = MAX_STRING_LENGTH): string | undefined => {
  if (typeof val !== 'string') return undefined
  const trimmed = val.trim()
  return trimmed ? trimmed.slice(0, maxLen) : undefined
}

export async function syncVehiclesFromAppSheet(req: Request, res: Response) {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const payload = req.body?.vehicles as SyncVehiclePayload[] | undefined
    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ error: 'vehicles array required' })
    }

    if (payload.length > MAX_BATCH_SIZE) {
      return res.status(400).json({ error: `Max ${MAX_BATCH_SIZE} vehicles per batch` })
    }

    // Phase 1: Validate all records, build valid batch
    const validRecords: (typeof vehicles.$inferInsert)[] = []
    const errors: string[] = []

    for (const v of payload) {
      if (!v.plateNumber || typeof v.plateNumber !== 'string') {
        errors.push(`Missing/invalid plateNumber for firebaseId=${v.firebaseId}`)
        continue
      }

      const plate = normPlate(v.plateNumber)
      if (!plate || plate.length > 20) {
        errors.push(`Invalid plate format: ${v.plateNumber}`)
        continue
      }

      const regName = sanitize(v.registrationName)
      const vehicleCat = sanitize(v.vehicleCategory, 200)
      const metadataObj: Record<string, string> = {}
      if (regName) metadataObj.registration_name = regName
      if (vehicleCat) metadataObj.vehicle_category = vehicleCat

      // Validate syncedAt to avoid Invalid Date crashing entire chunk
      const syncDate = new Date(v.syncedAt)
      const safeSyncedAt = isNaN(syncDate.getTime()) ? new Date() : syncDate

      validRecords.push({
        plateNumber: plate,
        firebaseId: sanitize(v.firebaseId) || null,
        seatCount: typeof v.seatCapacity === 'number' ? v.seatCapacity : null,
        source: 'appsheet',
        syncedAt: safeSyncedAt,
        metadata: metadataObj,
        isActive: true,
      })
    }

    // Phase 2: Batch upsert in chunks (1000 per chunk)
    let upserted = 0
    for (let i = 0; i < validRecords.length; i += BATCH_CHUNK_SIZE) {
      const chunk = validRecords.slice(i, i + BATCH_CHUNK_SIZE)
      try {
        await db
          .insert(vehicles)
          .values(chunk)
          .onConflictDoUpdate({
            target: vehicles.plateNumber,
            set: {
              syncedAt: sql`excluded.synced_at`,
              source: sql`excluded.source`,
              // JSONB shallow merge: preserves existing keys (image_url, notes, etc.)
              metadata: sql`COALESCE(${vehicles.metadata}, '{}'::jsonb) || excluded.metadata::jsonb`,
              seatCount: sql`excluded.seat_count`,
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
    console.error('[vehicle-appsheet-sync] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
