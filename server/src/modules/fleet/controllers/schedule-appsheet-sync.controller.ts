/**
 * Schedule AppSheet Sync Controller
 * POST /api/vehicles/schedules/appsheet-sync
 * Receives enriched + normalized schedules from frontend SharedWorker, upserts to schedules table
 */
import { Request, Response } from 'express'
import { db } from '../../../db/drizzle.js'
import { schedules } from '../../../db/schema/schedules.js'
import { routes } from '../../../db/schema/routes.js'
import { operators } from '../../../db/schema/operators.js'
import { sql, isNotNull } from 'drizzle-orm'

const MAX_BATCH_SIZE = 5_000
const CHUNK_SIZE = 500

interface SyncSchedulePayload {
  firebaseId: string
  routeFirebaseId?: string | null
  routeCode?: string | null
  operatorFirebaseId?: string | null
  operatorCode?: string | null
  scheduleCode?: string | null
  departureTime: string
  direction?: string | null
  frequencyType?: string
  daysOfWeek?: number[]
  daysOfMonth?: number[]
  calendarType?: string | null
  effectiveFrom?: string
  notificationNumber?: string | null
  tripStatus?: string | null
}

const sanitize = (val: string | null | undefined, maxLen = 100): string | null => {
  if (!val) return null
  return val.trim().slice(0, maxLen) || null
}

const buildScheduleCode = (
  routeCode: string,
  direction: string,
  departureTime: string,
  suffix?: number,
): string => {
  const cleanedCode = routeCode.replace(/[^A-Za-z0-9-]/g, '').toUpperCase() || 'UNKNOWN'
  const dirCode = direction === 'Về' ? 'V' : 'D'
  const timeCode = departureTime.replace(':', '')
  const base = `BDG-${cleanedCode}-${dirCode}-${timeCode}`
  return suffix && suffix > 1 ? `${base}-${suffix}` : base
}

export async function syncSchedulesFromAppSheet(req: Request, res: Response) {
  try {
    const incoming = req.body?.schedules as SyncSchedulePayload[] | undefined
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return res.status(400).json({ error: 'schedules array required' })
    }
    if (incoming.length > MAX_BATCH_SIZE) {
      return res.status(400).json({ error: `Max ${MAX_BATCH_SIZE} schedules per batch` })
    }
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    // Build FK lookup maps once
    const allRoutes = await db
      .select({ id: routes.id, firebaseId: routes.firebaseId, routeCode: routes.routeCode })
      .from(routes)
      .where(isNotNull(routes.firebaseId))

    const routeByFirebaseId = new Map<string, string>()
    const routeByCode = new Map<string, string>()
    for (const r of allRoutes) {
      if (r.firebaseId) routeByFirebaseId.set(r.firebaseId.trim().toUpperCase(), r.id)
      if (r.routeCode) routeByCode.set(r.routeCode.trim().toUpperCase(), r.id)
    }

    const allOperators = await db
      .select({ id: operators.id, firebaseId: operators.firebaseId, code: operators.code })
      .from(operators)
      .where(isNotNull(operators.firebaseId))

    const operatorByFirebaseId = new Map<string, string>()
    for (const o of allOperators) {
      if (o.firebaseId) operatorByFirebaseId.set(o.firebaseId.trim().toUpperCase(), o.id)
      if (o.code) operatorByFirebaseId.set(o.code.trim().toUpperCase(), o.id)
    }

    // Track schedule codes to avoid duplicates within the same batch
    const scheduleCodeSuffix = new Map<string, number>()

    const errors: string[] = []
    let upserted = 0

    for (let i = 0; i < incoming.length; i += CHUNK_SIZE) {
      const chunk = incoming.slice(i, i + CHUNK_SIZE)
      const values: (typeof schedules.$inferInsert)[] = []

      for (const s of chunk) {
        if (!s.firebaseId || !s.departureTime) {
          errors.push(`Missing firebaseId or departureTime`)
          continue
        }

        // Resolve routeId FK
        let routeId: string | null = null
        if (s.routeFirebaseId) {
          routeId = routeByFirebaseId.get(s.routeFirebaseId.trim().toUpperCase()) || null
        }
        if (!routeId && s.routeCode) {
          routeId = routeByCode.get(s.routeCode.trim().toUpperCase()) || null
        }

        // Resolve operatorId FK
        let operatorId: string | null = null
        if (s.operatorFirebaseId) {
          operatorId = operatorByFirebaseId.get(s.operatorFirebaseId.trim().toUpperCase()) || null
        }

        // Skip if required FKs can't be resolved
        if (!routeId || !operatorId) continue

        // Generate unique scheduleCode (deduplicate within batch via suffix)
        const baseCode =
          s.scheduleCode ||
          buildScheduleCode(
            s.routeCode || s.routeFirebaseId || 'UNKNOWN',
            s.direction || 'Đi',
            s.departureTime,
          )
        const count = (scheduleCodeSuffix.get(baseCode) || 0) + 1
        scheduleCodeSuffix.set(baseCode, count)
        const scheduleCode = count > 1 ? `${baseCode}-${count}` : baseCode

        values.push({
          firebaseId: sanitize(s.firebaseId, 100)!,
          scheduleCode: sanitize(scheduleCode, 50)!,
          routeId,
          operatorId,
          departureTime: s.departureTime,
          direction: sanitize(s.direction, 10),
          frequencyType: s.frequencyType || 'daily',
          daysOfWeek: s.daysOfWeek || [1, 2, 3, 4, 5, 6, 7],
          daysOfMonth: s.daysOfMonth || [],
          calendarType: sanitize(s.calendarType, 20),
          effectiveFrom: s.effectiveFrom || '2025-01-01',
          notificationNumber: sanitize(s.notificationNumber, 100),
          tripStatus: sanitize(s.tripStatus, 50),
          source: 'gtvt-appsheet-frontend',
          syncedAt: new Date(),
          isActive: true,
          metadata: { provider: 'gtvt-appsheet-frontend' },
          updatedAt: new Date(),
        })
      }

      if (values.length === 0) continue

      try {
        await db
          .insert(schedules)
          .values(values)
          .onConflictDoUpdate({
            target: schedules.firebaseId,
            set: {
              scheduleCode: sql`excluded.schedule_code`,
              routeId: sql`excluded.route_id`,
              operatorId: sql`excluded.operator_id`,
              departureTime: sql`excluded.departure_time`,
              direction: sql`excluded.direction`,
              frequencyType: sql`excluded.frequency_type`,
              daysOfWeek: sql`excluded.days_of_week`,
              daysOfMonth: sql`excluded.days_of_month`,
              calendarType: sql`excluded.calendar_type`,
              effectiveFrom: sql`excluded.effective_from`,
              notificationNumber: sql`excluded.notification_number`,
              tripStatus: sql`excluded.trip_status`,
              source: sql`excluded.source`,
              syncedAt: sql`excluded.synced_at`,
              isActive: sql`excluded.is_active`,
              metadata: sql`COALESCE(schedules.metadata, '{}') || excluded.metadata`,
              updatedAt: sql`excluded.updated_at`,
            },
          })
        upserted += values.length
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Batch ${i}-${i + chunk.length}: ${msg}`)
      }
    }

    return res.json({ upserted, errors })
  } catch (error) {
    console.error('[schedule-appsheet-sync] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
