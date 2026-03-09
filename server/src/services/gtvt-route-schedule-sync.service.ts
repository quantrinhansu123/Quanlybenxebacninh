import { sql } from 'drizzle-orm'
import { db } from '../db/drizzle.js'
import { operators, routes, schedules } from '../db/schema/index.js'
import {
  fetchGtvtRoutes,
  fetchGtvtSchedules,
  fetchGtvtNotifications,
  fetchGtvtBusRoutes,
  fetchGtvtBusSchedules,
  fetchGtvtBusLookup,
} from './gtvt-appsheet-client.service.js'
import { cachedData } from './cached-data.service.js'
import { normalizeGtvtRoutes } from './gtvt-normalize-routes.service.js'
import { normalizeGtvtSchedules, buildScheduleCode } from './gtvt-normalize-schedules.service.js'
import {
  type DbExecutor,
  GTVT_SYNC_LOCK_KEY,
  NULL_FIREBASE_SENTINEL,
  MAX_SCHEDULE_CODE_LENGTH,
  toLookupKey,
  stripBusPrefix,
  escapeSqlString,
  countFromRow,
  uniqueFirebaseIds,
  insertSeenFirebaseTempTable,
  cleanupTempTables,
} from './gtvt-sync-utils.js'
import {
  GTVT_SYNC_SOURCE,
  GtvtSourceError,
  GtvtInternalError,
  type GtvtLastSyncResponse,
  type GtvtNormalizedRoute,
  type GtvtNormalizedSchedule,
  type GtvtSyncErrorItem,
  type GtvtSyncOptions,
  type GtvtSyncSummaryResponse,
} from '../types/gtvt-sync.types.js'

interface LookupConfig {
  refKey: string
  lookupIdKey: string
  mappings: { from: string; to: string }[]
}

/** Enrich schedule rows by joining with a lookup table */
function enrichScheduleRows(
  scheduleRows: Record<string, unknown>[],
  lookupRows: Record<string, unknown>[],
  config: LookupConfig
): Record<string, unknown>[] {
  if (lookupRows.length === 0) return scheduleRows

  // Build lookup map: lookupIdKey value → lookup row
  const lookupMap = new Map<string, Record<string, unknown>>()
  for (const row of lookupRows) {
    const id = toLookupKey(String(row[config.lookupIdKey] ?? ''))
    if (id) lookupMap.set(id, row)
  }

  return scheduleRows.map((scheduleRow) => {
    const refValue = toLookupKey(String(scheduleRow[config.refKey] ?? ''))
    if (!refValue) return scheduleRow

    const lookupRow = lookupMap.get(refValue)
    if (!lookupRow) return scheduleRow

    // Copy mapped fields from lookup into schedule row
    const enriched = { ...scheduleRow }
    for (const mapping of config.mappings) {
      const value = lookupRow[mapping.from]
      if (value !== undefined && value !== null && value !== '') {
        enriched[mapping.to] = value
      }
    }
    return enriched
  })
}

const runRoutesSync = async (
  executor: DbExecutor,
  routeRows: GtvtNormalizedRoute[],
  seenFirebaseIds: string[],
  dryRun: boolean,
  errors: GtvtSyncErrorItem[]
): Promise<{ inserted: number; updated: number; disabled: number; persistedRouteKeys: string[] }> => {
  const existingRouteCodes = await executor.select({
    firebaseId: routes.firebaseId,
    routeCode: routes.routeCode,
  }).from(routes)

  const existingCodeToFirebase = new Map<string, string>()
  // Store original firebase_id for adopting when incoming uses fallback ID
  const existingCodeToOriginalId = new Map<string, string>()
  existingRouteCodes.forEach((item) => {
    if (!item.routeCode) return
    existingCodeToFirebase.set(
      toLookupKey(item.routeCode),
      item.firebaseId ? toLookupKey(item.firebaseId) : NULL_FIREBASE_SENTINEL
    )
    if (item.firebaseId) {
      existingCodeToOriginalId.set(toLookupKey(item.routeCode), item.firebaseId)
    }
  })

  const dedupedByFirebase = new Map<string, GtvtNormalizedRoute>()
  routeRows.forEach((item) => {
    dedupedByFirebase.set(toLookupKey(item.firebaseId), item)
  })

  const adoptedFirebaseIds: string[] = []
  const incomingCodeToFirebase = new Map<string, string>()
  const persistedRows: GtvtNormalizedRoute[] = []
  for (const row of dedupedByFirebase.values()) {
    let firebaseKey = toLookupKey(row.firebaseId)
    const routeCodeKey = toLookupKey(row.routeCode)
    const existingFirebase = existingCodeToFirebase.get(routeCodeKey)
    if (existingFirebase && existingFirebase !== firebaseKey) {
      // If incoming firebaseId is a fallback (equals routeCode, not a real UUID),
      // adopt the existing DB firebase_id so the upsert matches correctly
      if (firebaseKey === routeCodeKey) {
        const originalId = existingCodeToOriginalId.get(routeCodeKey)
        if (originalId) {
          row.firebaseId = originalId
          firebaseKey = toLookupKey(originalId)
          adoptedFirebaseIds.push(originalId)
        } else {
          errors.push({ entity: 'route', key: row.firebaseId, message: `Route code conflict: ${row.routeCode}` })
          continue
        }
      } else {
        errors.push({ entity: 'route', key: row.firebaseId, message: `Route code conflict: ${row.routeCode}` })
        continue
      }
    }
    const incomingFirebase = incomingCodeToFirebase.get(routeCodeKey)
    if (incomingFirebase && incomingFirebase !== firebaseKey) {
      errors.push({ entity: 'route', key: row.firebaseId, message: `Duplicate route code in payload: ${row.routeCode}` })
      continue
    }
    incomingCodeToFirebase.set(routeCodeKey, firebaseKey)
    persistedRows.push(row)
  }

  await executor.execute(sql.raw('DROP TABLE IF EXISTS _tmp_gtvt_routes'))
  await executor.execute(sql.raw(`
    CREATE TEMP TABLE _tmp_gtvt_routes (
      firebase_id TEXT PRIMARY KEY,
      route_code TEXT NOT NULL,
      route_code_old TEXT,
      route_type TEXT,
      departure_station TEXT,
      arrival_station TEXT,
      operation_status TEXT,
      distance_km INTEGER,
      metadata JSONB
    )
  `))

  if (persistedRows.length > 0) {
    const chunkSize = 500
    for (let index = 0; index < persistedRows.length; index += chunkSize) {
      const chunk = persistedRows.slice(index, index + chunkSize)
      const values = chunk.map((row) => (
        `(${escapeSqlString(row.firebaseId)},${escapeSqlString(row.routeCode)},${escapeSqlString(row.routeCodeOld)},` +
        `${escapeSqlString(row.routeType)},${escapeSqlString(row.departureStation)},${escapeSqlString(row.arrivalStation)},` +
        `${escapeSqlString(row.operationStatus)},${row.distanceKm ?? 'NULL'},${escapeSqlString(JSON.stringify(row.metadata))})`
      )).join(',')
      await executor.execute(sql.raw(`INSERT INTO _tmp_gtvt_routes VALUES ${values}`))
    }
  }

  // Merge adopted firebase_ids so disable logic doesn't deactivate adopted routes
  const seenRouteIds = uniqueFirebaseIds([...seenFirebaseIds, ...adoptedFirebaseIds])
  const canDisableRoutes = seenRouteIds.length > 0
  if (canDisableRoutes) {
    await insertSeenFirebaseTempTable(executor, '_tmp_gtvt_route_seen_ids', seenRouteIds)
  } else {
    await executor.execute(sql.raw('DROP TABLE IF EXISTS _tmp_gtvt_route_seen_ids'))
  }

  const routeImpact = await executor.execute(sql.raw(`
    SELECT
      COUNT(*) FILTER (WHERE r.id IS NULL) AS inserted,
      COUNT(*) FILTER (WHERE r.id IS NOT NULL) AS updated
    FROM _tmp_gtvt_routes t
    LEFT JOIN routes r ON r.firebase_id = t.firebase_id
  `))
  const inserted = countFromRow(routeImpact[0] as Record<string, unknown>, 'inserted')
  const updated = countFromRow(routeImpact[0] as Record<string, unknown>, 'updated')

  let disabled = 0
  if (canDisableRoutes) {
    const disableCount = await executor.execute(sql.raw(`
      SELECT COUNT(*) AS disabled
      FROM routes r
      WHERE r.source = '${GTVT_SYNC_SOURCE}'
        AND r.is_active = true
        AND r.firebase_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM _tmp_gtvt_route_seen_ids t WHERE t.firebase_id = r.firebase_id
        )
    `))
    disabled = countFromRow(disableCount[0] as Record<string, unknown>, 'disabled')
  }

  if (!dryRun) {
    await executor.execute(sql.raw(`
      INSERT INTO routes (
        firebase_id, route_code, route_code_old, departure_station, arrival_station,
        distance_km, route_type, operation_status, is_active, source, metadata, synced_at, created_at, updated_at
      )
      SELECT
        t.firebase_id, t.route_code, t.route_code_old, t.departure_station, t.arrival_station,
        t.distance_km, t.route_type, t.operation_status, true, '${GTVT_SYNC_SOURCE}', t.metadata, NOW(), NOW(), NOW()
      FROM _tmp_gtvt_routes t
      ON CONFLICT (firebase_id) DO UPDATE SET
        route_code = EXCLUDED.route_code,
        route_code_old = EXCLUDED.route_code_old,
        departure_station = EXCLUDED.departure_station,
        arrival_station = EXCLUDED.arrival_station,
        distance_km = EXCLUDED.distance_km,
        route_type = EXCLUDED.route_type,
        operation_status = EXCLUDED.operation_status,
        is_active = true,
        source = '${GTVT_SYNC_SOURCE}',
        metadata = EXCLUDED.metadata,
        synced_at = NOW(),
        updated_at = NOW()
    `))

    if (canDisableRoutes) {
      await executor.execute(sql.raw(`
        UPDATE routes
        SET is_active = false, updated_at = NOW()
        WHERE source = '${GTVT_SYNC_SOURCE}'
          AND is_active = true
          AND firebase_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM _tmp_gtvt_route_seen_ids t WHERE t.firebase_id = routes.firebase_id
          )
      `))
    }
  }

  const persistedRouteKeys = new Set<string>()
  persistedRows.forEach((row) => {
    persistedRouteKeys.add(toLookupKey(row.firebaseId))
    persistedRouteKeys.add(toLookupKey(row.routeCode))
    if (row.routeCodeOld) persistedRouteKeys.add(toLookupKey(row.routeCodeOld))
  })

  return { inserted, updated, disabled, persistedRouteKeys: [...persistedRouteKeys] }
}

interface ResolvedScheduleRow {
  firebaseId: string
  routeId: string
  operatorId: string
  scheduleCode: string
  departureTime: string
  direction: string
  frequencyType: 'daily' | 'weekly' | 'specific_days'
  daysOfWeek: number[]
  daysOfMonth: number[]
  calendarType: string
  effectiveFrom: string
  notificationNumber: string | null
  tripStatus: string
  metadata: Record<string, unknown>
}

const runSchedulesSync = async (
  executor: DbExecutor,
  scheduleRows: GtvtNormalizedSchedule[],
  persistedRouteKeys: string[],
  seenFirebaseIds: string[],
  dryRun: boolean,
  errors: GtvtSyncErrorItem[]
): Promise<{ inserted: number; updated: number; disabled: number; failed: number }> => {
  const operatorData = await executor.select({
    id: operators.id,
    firebaseId: operators.firebaseId,
    code: operators.code,
  }).from(operators)

  const routeData = await executor.select({
    id: routes.id,
    firebaseId: routes.firebaseId,
    routeCode: routes.routeCode,
    routeCodeOld: routes.routeCodeOld,
    isActive: routes.isActive,
  }).from(routes)

  const operatorByFirebase = new Map<string, string>()
  const operatorByCode = new Map<string, string>()
  operatorData.forEach((item) => {
    if (item.firebaseId) operatorByFirebase.set(toLookupKey(item.firebaseId), item.id)
    if (item.code) operatorByCode.set(toLookupKey(item.code), item.id)
  })

  const routeByFirebase = new Map<string, { id: string; routeCode: string | null; routeCodeOld: string | null }>()
  const routeByCode = new Map<string, { id: string; routeCode: string | null; routeCodeOld: string | null }>()
  routeData.forEach((item) => {
    if (!item.isActive) return
    const mapped = { id: item.id, routeCode: item.routeCode, routeCodeOld: item.routeCodeOld }
    if (item.firebaseId) routeByFirebase.set(toLookupKey(item.firebaseId), mapped)
    if (item.routeCode) routeByCode.set(toLookupKey(item.routeCode), mapped)
    if (item.routeCodeOld) routeByCode.set(toLookupKey(item.routeCodeOld), mapped)
  })

  const incomingRouteKeys = new Set(persistedRouteKeys.map((key) => toLookupKey(key)))

  // Auto-create operators referenced by schedule rows but missing from DB
  const missingOperators = new Map<string, { firebaseId: string; name: string }>()
  for (const row of scheduleRows) {
    if (!row.operatorFirebaseId) continue
    const fbKey = toLookupKey(row.operatorFirebaseId)
    if (operatorByFirebase.has(fbKey)) continue
    if (missingOperators.has(fbKey)) continue
    const opName = row.operatorCode || row.operatorFirebaseId
    missingOperators.set(fbKey, { firebaseId: row.operatorFirebaseId, name: opName })
  }

  if (missingOperators.size > 0 && !dryRun) {
    const values = [...missingOperators.values()].map((op) => {
      const code = escapeSqlString(`GTVT-${op.firebaseId}`)
      const name = escapeSqlString(op.name)
      const fbId = escapeSqlString(op.firebaseId)
      return `(gen_random_uuid(),${fbId},${code},${name},'gtvt-appsheet',true,NOW(),NOW())`
    }).join(',')
    const inserted = await executor.execute(sql.raw(`
      INSERT INTO operators (id,firebase_id,code,name,source,is_active,created_at,updated_at)
      VALUES ${values}
      ON CONFLICT (firebase_id) DO NOTHING
      RETURNING id, firebase_id
    `))
    for (const row of inserted as unknown as Array<{ id: string; firebase_id: string }>) {
      if (row.firebase_id && row.id) {
        operatorByFirebase.set(toLookupKey(row.firebase_id), row.id)
      }
    }
  } else if (missingOperators.size > 0 && dryRun) {
    // In dry-run: treat missing operators as resolvable (don't count as failures)
    for (const [fbKey, op] of missingOperators.entries()) {
      operatorByFirebase.set(fbKey, `dry-run-${op.firebaseId}`)
    }
  }

  const codeCounter = new Map<string, number>()
  const resolvedRows: ResolvedScheduleRow[] = []
  let failed = 0

  for (const row of scheduleRows) {
    let operatorId: string | null = null
    if (row.operatorFirebaseId) {
      operatorId = operatorByFirebase.get(toLookupKey(row.operatorFirebaseId)) || null
    }
    if (!operatorId && row.operatorCode) {
      operatorId = operatorByCode.get(toLookupKey(row.operatorCode)) || null
    }
    if (!operatorId) {
      failed += 1
      errors.push({ entity: 'schedule', key: row.firebaseId, message: 'Operator not found' })
      continue
    }

    let routeMatch: { id: string; routeCode: string | null; routeCodeOld: string | null } | null = null
    if (row.routeFirebaseId) routeMatch = routeByFirebase.get(toLookupKey(row.routeFirebaseId)) || null
    if (!routeMatch && row.routeCode) routeMatch = routeByCode.get(toLookupKey(row.routeCode)) || null
    if (!routeMatch && row.routeCode && !row.routeCode.toUpperCase().startsWith('BUS-')) {
      routeMatch = routeByCode.get(toLookupKey(`BUS-${row.routeCode}`)) || null
    }
    if (!routeMatch && row.routeCode && row.routeCode.toUpperCase().startsWith('BUS-')) {
      routeMatch = routeByCode.get(toLookupKey(stripBusPrefix(row.routeCode))) || null
    }

    if (!routeMatch) {
      const dryRunRouteHit =
        (row.routeFirebaseId && incomingRouteKeys.has(toLookupKey(row.routeFirebaseId))) ||
        (row.routeCode && incomingRouteKeys.has(toLookupKey(row.routeCode))) ||
        (row.routeCode && incomingRouteKeys.has(toLookupKey(`BUS-${stripBusPrefix(row.routeCode)}`)))

      if (!dryRun || !dryRunRouteHit) {
        failed += 1
        errors.push({ entity: 'schedule', key: row.firebaseId, message: 'Route not found' })
        continue
      }
    }

    const routeCodeForSchedule =
      routeMatch?.routeCodeOld || routeMatch?.routeCode || row.routeCode || row.routeFirebaseId || 'UNKNOWN'
    const baseCode = row.scheduleCode || buildScheduleCode(routeCodeForSchedule, row.direction, row.departureTime)
    const nextCount = (codeCounter.get(baseCode) || 0) + 1
    codeCounter.set(baseCode, nextCount)
    const scheduleCode = row.scheduleCode || buildScheduleCode(routeCodeForSchedule, row.direction, row.departureTime, nextCount)
    if (scheduleCode.length > MAX_SCHEDULE_CODE_LENGTH) {
      failed += 1
      errors.push({ entity: 'schedule', key: row.firebaseId, message: `Schedule code exceeds ${MAX_SCHEDULE_CODE_LENGTH} characters` })
      continue
    }

    if (!routeMatch && dryRun) {
      resolvedRows.push({
        firebaseId: row.firebaseId,
        routeId: '00000000-0000-0000-0000-000000000000',
        operatorId,
        scheduleCode,
        departureTime: row.departureTime,
        direction: row.direction,
        frequencyType: row.frequencyType,
        daysOfWeek: row.daysOfWeek,
        daysOfMonth: row.daysOfMonth,
        calendarType: row.calendarType,
        effectiveFrom: row.effectiveFrom,
        notificationNumber: row.notificationNumber,
        tripStatus: row.tripStatus,
        metadata: row.metadata,
      })
      continue
    }

    if (!routeMatch) {
      failed += 1
      errors.push({ entity: 'schedule', key: row.firebaseId, message: 'Route resolution failed' })
      continue
    }

    resolvedRows.push({
      firebaseId: row.firebaseId,
      routeId: routeMatch.id,
      operatorId,
      scheduleCode,
      departureTime: row.departureTime,
      direction: row.direction,
      frequencyType: row.frequencyType,
      daysOfWeek: row.daysOfWeek,
      daysOfMonth: row.daysOfMonth,
      calendarType: row.calendarType,
      effectiveFrom: row.effectiveFrom,
      notificationNumber: row.notificationNumber,
      tripStatus: row.tripStatus,
      metadata: row.metadata,
    })
  }

  const existingSchedules = await executor.select({
    firebaseId: schedules.firebaseId,
    scheduleCode: schedules.scheduleCode,
    source: schedules.source,
    isActive: schedules.isActive,
  }).from(schedules)

  const dedupedByFirebase = new Map<string, ResolvedScheduleRow>()
  resolvedRows.forEach((item) => {
    dedupedByFirebase.set(toLookupKey(item.firebaseId), item)
  })

  const existingCodeToFirebase = new Map<string, string>()
  existingSchedules.forEach((item) => {
    if (!item.scheduleCode) return
    existingCodeToFirebase.set(
      toLookupKey(item.scheduleCode),
      item.firebaseId ? toLookupKey(item.firebaseId) : NULL_FIREBASE_SENTINEL
    )
  })

  const incomingCodeToFirebase = new Map<string, string>()
  const persistedRows: ResolvedScheduleRow[] = []
  for (const row of dedupedByFirebase.values()) {
    const firebaseKey = toLookupKey(row.firebaseId)
    const scheduleCodeKey = toLookupKey(row.scheduleCode)
    const existingFirebase = existingCodeToFirebase.get(scheduleCodeKey)
    if (existingFirebase && existingFirebase !== firebaseKey) {
      failed += 1
      errors.push({ entity: 'schedule', key: row.firebaseId, message: `Schedule code conflict: ${row.scheduleCode}` })
      continue
    }
    const incomingFirebase = incomingCodeToFirebase.get(scheduleCodeKey)
    if (incomingFirebase && incomingFirebase !== firebaseKey) {
      failed += 1
      errors.push({ entity: 'schedule', key: row.firebaseId, message: `Duplicate schedule code in payload: ${row.scheduleCode}` })
      continue
    }
    incomingCodeToFirebase.set(scheduleCodeKey, firebaseKey)
    persistedRows.push(row)
  }

  const existingByFirebase = new Set(
    existingSchedules
      .filter((item) => item.firebaseId)
      .map((item) => toLookupKey(item.firebaseId))
  )
  const seenScheduleIds = uniqueFirebaseIds(seenFirebaseIds)
  const canDisableSchedules = seenScheduleIds.length > 0
  const incomingFirebase = new Set(seenScheduleIds.map((item) => toLookupKey(item)))

  const inserted = persistedRows.filter((item) => !existingByFirebase.has(toLookupKey(item.firebaseId))).length
  const updated = persistedRows.length - inserted

  const disabled = canDisableSchedules
    ? existingSchedules.filter((item) => (
      item.source === GTVT_SYNC_SOURCE &&
      item.isActive === true &&
      item.firebaseId !== null &&
      !incomingFirebase.has(toLookupKey(item.firebaseId))
    )).length
    : 0

  if (dryRun) {
    return { inserted, updated, disabled, failed }
  }

  await executor.execute(sql.raw('DROP TABLE IF EXISTS _tmp_gtvt_schedules'))
  await executor.execute(sql.raw(`
    CREATE TEMP TABLE _tmp_gtvt_schedules (
      firebase_id TEXT PRIMARY KEY,
      schedule_code TEXT NOT NULL,
      route_id UUID NOT NULL,
      operator_id UUID NOT NULL,
      departure_time TEXT NOT NULL,
      direction TEXT,
      frequency_type TEXT NOT NULL,
      days_of_week JSONB,
      days_of_month JSONB,
      calendar_type TEXT,
      effective_from TEXT,
      notification_number TEXT,
      trip_status TEXT,
      metadata JSONB
    )
  `))

  if (persistedRows.length > 0) {
    const chunkSize = 500
    for (let index = 0; index < persistedRows.length; index += chunkSize) {
      const chunk = persistedRows.slice(index, index + chunkSize)
      const values = chunk.map((row) => (
        `(${escapeSqlString(row.firebaseId)},${escapeSqlString(row.scheduleCode)},${escapeSqlString(row.routeId)},` +
        `${escapeSqlString(row.operatorId)},${escapeSqlString(row.departureTime)},${escapeSqlString(row.direction)},` +
        `${escapeSqlString(row.frequencyType)},${escapeSqlString(JSON.stringify(row.daysOfWeek))},` +
        `${escapeSqlString(JSON.stringify(row.daysOfMonth))},${escapeSqlString(row.calendarType)},` +
        `${escapeSqlString(row.effectiveFrom)},${escapeSqlString(row.notificationNumber)},` +
        `${escapeSqlString(row.tripStatus)},${escapeSqlString(JSON.stringify(row.metadata))})`
      )).join(',')
      await executor.execute(sql.raw(`INSERT INTO _tmp_gtvt_schedules VALUES ${values}`))
    }
  }

  if (canDisableSchedules) {
    await insertSeenFirebaseTempTable(executor, '_tmp_gtvt_schedule_seen_ids', seenScheduleIds)
  } else {
    await executor.execute(sql.raw('DROP TABLE IF EXISTS _tmp_gtvt_schedule_seen_ids'))
  }

  await executor.execute(sql.raw(`
    INSERT INTO schedules (
      firebase_id, schedule_code, route_id, operator_id,
      departure_time, direction, frequency_type, days_of_week, days_of_month,
      calendar_type, effective_from, notification_number, trip_status,
      is_active, source, synced_at, metadata, created_at, updated_at
    )
    SELECT
      t.firebase_id, t.schedule_code, t.route_id, t.operator_id,
      t.departure_time::time, t.direction, t.frequency_type, t.days_of_week, t.days_of_month,
      t.calendar_type, t.effective_from, t.notification_number, t.trip_status,
      true, '${GTVT_SYNC_SOURCE}', NOW(), t.metadata, NOW(), NOW()
    FROM _tmp_gtvt_schedules t
    ON CONFLICT (firebase_id) DO UPDATE SET
      schedule_code = EXCLUDED.schedule_code,
      route_id = EXCLUDED.route_id,
      operator_id = EXCLUDED.operator_id,
      departure_time = EXCLUDED.departure_time,
      direction = EXCLUDED.direction,
      frequency_type = EXCLUDED.frequency_type,
      days_of_week = EXCLUDED.days_of_week,
      days_of_month = EXCLUDED.days_of_month,
      calendar_type = EXCLUDED.calendar_type,
      effective_from = EXCLUDED.effective_from,
      notification_number = EXCLUDED.notification_number,
      trip_status = EXCLUDED.trip_status,
      is_active = true,
      source = '${GTVT_SYNC_SOURCE}',
      synced_at = NOW(),
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
  `))

  if (canDisableSchedules) {
    await executor.execute(sql.raw(`
      UPDATE schedules
      SET is_active = false, updated_at = NOW()
      WHERE source = '${GTVT_SYNC_SOURCE}'
        AND is_active = true
        AND firebase_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM _tmp_gtvt_schedule_seen_ids t WHERE t.firebase_id = schedules.firebase_id
        )
    `))
  }

  return { inserted, updated, disabled, failed }
}

export async function getGtvtLastSyncStatus(): Promise<GtvtLastSyncResponse> {
  if (!db) throw new GtvtInternalError('Database connection not available')

  const [routeResult, scheduleResult] = await Promise.all([
    db.execute(sql.raw(`
      SELECT MAX(synced_at) AS synced_at
      FROM routes
      WHERE source = '${GTVT_SYNC_SOURCE}'
    `)),
    db.execute(sql.raw(`
      SELECT MAX(synced_at) AS synced_at
      FROM schedules
      WHERE source = '${GTVT_SYNC_SOURCE}'
    `)),
  ])

  const routeDate = routeResult[0]?.synced_at
  const scheduleDate = scheduleResult[0]?.synced_at

  return {
    source: GTVT_SYNC_SOURCE,
    lastRouteSyncAt: routeDate ? new Date(String(routeDate)).toISOString() : null,
    lastScheduleSyncAt: scheduleDate ? new Date(String(scheduleDate)).toISOString() : null,
  }
}

export async function syncGtvtRoutesAndSchedules(options: GtvtSyncOptions): Promise<GtvtSyncSummaryResponse> {
  if (!db) throw new GtvtInternalError('Database connection not available')

  const startedAt = new Date()
  const mode = options.dryRun ? 'dry-run' : 'live'

  try {
    const result = await db.transaction(async (tx) => {
      const executor = tx as unknown as DbExecutor
      const lockRows = await executor.execute(sql.raw(`SELECT pg_try_advisory_xact_lock(${GTVT_SYNC_LOCK_KEY}) AS acquired`))
      const acquired = (lockRows[0] as Record<string, unknown>)?.acquired
      if (!acquired) {
        throw new GtvtInternalError('Another sync operation is already in progress')
      }

      const [rawFixedRoutes, rawFixedSchedules, rawBusRoutes, rawBusSchedules, rawNotifications, rawBusLookup] = await Promise.all([
        fetchGtvtRoutes(),
        fetchGtvtSchedules(),
        fetchGtvtBusRoutes(),
        fetchGtvtBusSchedules(),
        fetchGtvtNotifications(),
        fetchGtvtBusLookup(),
      ])

      // Enrich schedule rows with lookup data before normalization
      const enrichedFixedSchedules = enrichScheduleRows(rawFixedSchedules, rawNotifications, {
        refKey: 'Ref_ThongBaoKhaiThac',
        lookupIdKey: 'ID_TB',
        mappings: [{ from: 'Ref_Tuyen', to: 'Ref_Tuyen' }, { from: 'Ref_DonVi', to: 'Ref_DonVi' }],
      })
      const enrichedBusSchedules = enrichScheduleRows(rawBusSchedules, rawBusLookup, {
        refKey: 'BieuDo',
        lookupIdKey: 'ID_BieuDo',
        mappings: [{ from: 'TuyenBuyt', to: 'Ref_Tuyen' }, { from: 'DonViKhaiThac', to: 'Ref_DonVi' }],
      })

      // Merge fixed + bus data
      const rawRoutes = [...rawFixedRoutes, ...rawBusRoutes]
      const rawSchedules = [...enrichedFixedSchedules, ...enrichedBusSchedules]

      const normalizedRoutes = normalizeGtvtRoutes(rawRoutes)
      const normalizedSchedules = normalizeGtvtSchedules(rawSchedules)
      const errors: GtvtSyncErrorItem[] = []
      errors.push(...normalizedRoutes.errors, ...normalizedSchedules.errors)

      const hasSeenUpstreamData = (
        normalizedRoutes.seenFirebaseIds.length > 0 ||
        normalizedSchedules.seenFirebaseIds.length > 0
      )
      if (!options.dryRun && !hasSeenUpstreamData) {
        throw new GtvtSourceError('Upstream API returned empty datasets; sync aborted to prevent mass deactivation')
      }

      const routeSyncStats = await runRoutesSync(
        executor,
        normalizedRoutes.rows,
        normalizedRoutes.seenFirebaseIds,
        options.dryRun,
        errors
      )
      const scheduleSyncStats = await runSchedulesSync(
        executor,
        normalizedSchedules.rows,
        routeSyncStats.persistedRouteKeys,
        normalizedSchedules.seenFirebaseIds,
        options.dryRun,
        errors
      )
      await cleanupTempTables(executor)
      return {
        errors,
        normalizedRoutes,
        normalizedSchedules,
        routeSyncStats,
        scheduleSyncStats,
      }
    })
    const errors = result.errors
    const normalizedRoutes = result.normalizedRoutes
    const normalizedSchedules = result.normalizedSchedules
    const routeStats = result.routeSyncStats
    const scheduleStats = result.scheduleSyncStats

    if (!options.dryRun) {
      cachedData.invalidateRoutes()
      cachedData.invalidateSchedules()
    }

    const finishedAt = new Date()
    return {
      mode,
      source: GTVT_SYNC_SOURCE,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      summary: {
        incomingRoutes: normalizedRoutes.rows.length,
        incomingSchedules: normalizedSchedules.rows.length,
        insertedRoutes: routeStats.inserted,
        updatedRoutes: routeStats.updated,
        disabledRoutes: routeStats.disabled,
        insertedSchedules: scheduleStats.inserted,
        updatedSchedules: scheduleStats.updated,
        disabledSchedules: scheduleStats.disabled,
        failed: errors.length,
      },
      errors,
    }
  } catch (error) {
    await cleanupTempTables(db)
    throw error
  }
}
