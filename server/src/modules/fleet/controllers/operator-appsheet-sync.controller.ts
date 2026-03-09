/**
 * Operator AppSheet Sync Controller
 * POST /api/vehicles/operators/appsheet-sync
 * Receives normalized operator data from frontend polling, upserts to operators table
 */
import { Request, Response } from 'express'
import { operators } from '../../../db/schema/operators.js'
import { db } from '../../../db/drizzle.js'
import { sql } from 'drizzle-orm'

const MAX_BATCH_SIZE = 10_000
const MAX_STRING_LENGTH = 255
const BATCH_CHUNK_SIZE = 500

interface SyncOperatorPayload {
  firebaseId: string
  code: string
  name: string
  province?: string
  address?: string
  phone?: string
  taxCode?: string
  representative?: string
}

/** Sanitize string: trim + truncate */
const sanitize = (val: unknown, maxLen = MAX_STRING_LENGTH): string | undefined => {
  if (typeof val !== 'string') return undefined
  const trimmed = val.trim()
  return trimmed ? trimmed.slice(0, maxLen) : undefined
}

export async function syncOperatorsFromAppSheet(req: Request, res: Response) {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const payload = req.body?.operators as SyncOperatorPayload[] | undefined
    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ error: 'operators array required' })
    }

    if (payload.length > MAX_BATCH_SIZE) {
      return res.status(400).json({ error: `Max ${MAX_BATCH_SIZE} operators per batch` })
    }

    const validRecords: (typeof operators.$inferInsert)[] = []
    const errors: string[] = []

    for (const op of payload) {
      const name = sanitize(op.name)
      if (!name) {
        errors.push(`Missing name for operator firebaseId=${op.firebaseId}`)
        continue
      }

      // firebaseId is required for upsert — skip records without it
      const fid = sanitize(op.firebaseId, 100)
      if (!fid) {
        errors.push(`Missing firebaseId for operator: ${name}`)
        continue
      }

      const code = sanitize(op.code, 50)
      if (!code) {
        errors.push(`Missing code for operator: ${name}`)
        continue
      }

      validRecords.push({
        firebaseId: fid,
        code,
        name,
        province: sanitize(op.province, 100) || null,
        address: op.address ? sanitize(op.address, 500) || null : null,
        phone: sanitize(op.phone, 20) || null,
        taxCode: sanitize(op.taxCode, 20) || null,
        representative: sanitize(op.representative) || null,
        source: 'appsheet',
        syncedAt: new Date(),
        isActive: true,
      })
    }

    // Batch upsert on firebaseId (unique constraint — stable across sources)
    let upserted = 0
    for (let i = 0; i < validRecords.length; i += BATCH_CHUNK_SIZE) {
      const chunk = validRecords.slice(i, i + BATCH_CHUNK_SIZE)
      try {
        await db
          .insert(operators)
          .values(chunk)
          .onConflictDoUpdate({
            target: operators.firebaseId,
            set: {
              name: sql`excluded.name`,
              // Preserve existing code if AppSheet sends a generic one
              code: sql`COALESCE(NULLIF(excluded.code, ''), ${operators.code})`,
              province: sql`COALESCE(excluded.province, ${operators.province})`,
              address: sql`COALESCE(excluded.address, ${operators.address})`,
              phone: sql`excluded.phone`,
              taxCode: sql`COALESCE(excluded.tax_code, ${operators.taxCode})`,
              representative: sql`COALESCE(excluded.representative, ${operators.representative})`,
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
    console.error('[operator-appsheet-sync] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
