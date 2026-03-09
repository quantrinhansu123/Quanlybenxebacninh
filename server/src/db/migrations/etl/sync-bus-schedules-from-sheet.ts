/**
 * One-time sync schedules for bus routes from Google Sheet CSV -> Supabase
 * Source sheets (Google Sheet gid):
 * - BIEUDOCHAY_BUYT: 1985887920
 * - GIOCHAY_BUYT: 1047672631
 * - DANHMUCTUYENBUYT: 2025728801
 * - QUYETDINH_KHAITHAC_BUYT: 415536628
 *
 * Usage:
 * - Dry run: npx tsx src/db/migrations/etl/sync-bus-schedules-from-sheet.ts --dry-run
 * - Live:    npx tsx src/db/migrations/etl/sync-bus-schedules-from-sheet.ts
 */
import 'dotenv/config'
import { db } from '../../drizzle.js'
import { sql } from 'drizzle-orm'

const SHEET_ID = '1hh1GKMiEXKb2KBYpyvzpqYuyc1Khzfjdxv2YMfIZ7cI'
const BASE_GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`
const BIEUDO_BUYT_CSV_URL = `${BASE_GVIZ_URL}&gid=1985887920`
const GIOCHAY_BUYT_CSV_URL = `${BASE_GVIZ_URL}&gid=1047672631`
const DANHMUC_TUYEN_BUYT_CSV_URL = `${BASE_GVIZ_URL}&gid=2025728801&tq=select%20A,H,O,D,E,F,B,C,J,K,L,M,N,G`
const QUYETDINH_BUYT_CSV_URL = `${BASE_GVIZ_URL}&gid=415536628`
const MABENXE_CSV_URL = `${BASE_GVIZ_URL}&sheet=MABENXE&tq=select%20B,E`

interface RouteRow {
  routeFbId: string
  routeCodeOld: string
  routeCode: string
  operationStatus: string
  departureStation: string
  departureStationRef: string
  arrivalStation: string
  arrivalStationRef: string
  departureProvince: string
  arrivalProvince: string
  distanceKm: number | null
  itinerary: string
  decisionNumber: string
  totalTripsPerMonth: number | null
  tripsOperated: number | null
  metadata: Record<string, string>
}

interface ChartRow {
  chartId: string
  routeFbId: string
  operatorFbId: string
  decisionFbId: string
  effectiveFromRaw: string
}

interface DecisionRow {
  decisionFbId: string
  noticeNumber: string
  issueDateRaw: string
}

interface PreparedScheduleRow {
  firebaseId: string
  routeFbId: string
  operatorFbId: string
  scheduleCode: string
  departureTime: string
  direction: string
  effectiveFrom: string
  notificationNumber: string
  tripStatus: string
  metadata: Record<string, string>
}

/** Parse one CSV line (quote-aware) */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

/** Parse CSV text into rows (array-of-arrays) */
function parseCsvRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(parseCsvLine)
}

function isValidDateParts(day: number, month: number, year: number): boolean {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return false
  if (year < 1900 || year > 2100) return false
  if (month < 1 || month > 12) return false
  if (day < 1) return false
  const maxDay = new Date(year, month, 0).getDate()
  return day <= maxDay
}

/** Parse date from dd/MM/yyyy or yyyy-MM-dd -> yyyy-MM-dd */
function parseDate(raw: string): string | null {
  if (!raw) return null
  const v = raw.trim()
  const dmy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) {
    const dayN = parseInt(dmy[1], 10)
    const monthN = parseInt(dmy[2], 10)
    const yearN = parseInt(dmy[3], 10)
    if (!isValidDateParts(dayN, monthN, yearN)) return null
    const day = String(dayN).padStart(2, '0')
    const month = String(monthN).padStart(2, '0')
    const year = String(yearN).padStart(4, '0')
    return `${year}-${month}-${day}`
  }
  const ymd = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) {
    const yearN = parseInt(ymd[1], 10)
    const monthN = parseInt(ymd[2], 10)
    const dayN = parseInt(ymd[3], 10)
    if (!isValidDateParts(dayN, monthN, yearN)) return null
    return `${String(yearN).padStart(4, '0')}-${String(monthN).padStart(2, '0')}-${String(dayN).padStart(2, '0')}`
  }
  return null
}

function parseIntOrNull(raw: string): number | null {
  if (!raw) return null
  const n = parseInt(raw.trim(), 10)
  return Number.isFinite(n) ? n : null
}

function isHexId8(raw: string): boolean {
  return /^[a-f0-9]{8}$/i.test((raw || '').trim())
}

function isTimeHHmm(raw: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test((raw || '').trim())
}

function normalizeDirection(raw: string): string {
  const v = (raw || '').trim()
  return v === 'Về' ? 'Về' : 'Đi'
}

function normalizeBusRouteCode(rawCode: string): { routeCode: string; routeCodeOld: string } | null {
  const routeCodeOld = (rawCode || '').trim().replace(/^BUS-/i, '')
  if (!routeCodeOld) return null
  return {
    routeCode: `BUS-${routeCodeOld}`,
    routeCodeOld,
  }
}

function genBusScheduleCode(routeCodeOld: string, direction: string, time: string, suffix?: string): string {
  const dir = direction === 'Về' ? 'V' : 'D'
  const hhmm = time.replace(':', '')
  const base = `BDG-BUS-${routeCodeOld}-${dir}-${hhmm}`
  return suffix ? `${base}-${suffix}` : base
}

/** Escape string for SQL literal */
const esc = (s: string | null): string => (s === null ? 'NULL' : `'${s.replace(/'/g, "''")}'`)
const escNum = (n: number | null): string => (n === null ? 'NULL' : `${n}`)

async function main() {
  const isDryRun = process.argv.includes('--dry-run')
  if (!db) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  console.log(`=== Sync BUS schedules ===\nMode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`)

  console.log('\n[1/6] Fetching CSVs...')
  const [bieuDoRes, gioChayRes, routeRes, decisionRes, stationRes] = await Promise.all([
    fetch(BIEUDO_BUYT_CSV_URL),
    fetch(GIOCHAY_BUYT_CSV_URL),
    fetch(DANHMUC_TUYEN_BUYT_CSV_URL),
    fetch(QUYETDINH_BUYT_CSV_URL),
    fetch(MABENXE_CSV_URL),
  ])
  if (!bieuDoRes.ok) throw new Error(`BIEUDOCHAY_BUYT fetch failed: ${bieuDoRes.status}`)
  if (!gioChayRes.ok) throw new Error(`GIOCHAY_BUYT fetch failed: ${gioChayRes.status}`)
  if (!routeRes.ok) throw new Error(`DANHMUCTUYENBUYT fetch failed: ${routeRes.status}`)
  if (!decisionRes.ok) throw new Error(`QUYETDINH_KHAITHAC_BUYT fetch failed: ${decisionRes.status}`)
  if (!stationRes.ok) throw new Error(`MABENXE fetch failed: ${stationRes.status}`)

  const [bieuDoText, gioChayText, routeText, decisionText, stationText] = await Promise.all([
    bieuDoRes.text(),
    gioChayRes.text(),
    routeRes.text(),
    decisionRes.text(),
    stationRes.text(),
  ])
  if (bieuDoText.trimStart().startsWith('<')) throw new Error('BIEUDOCHAY_BUYT returned HTML')
  if (gioChayText.trimStart().startsWith('<')) throw new Error('GIOCHAY_BUYT returned HTML')
  if (routeText.trimStart().startsWith('<')) throw new Error('DANHMUCTUYENBUYT returned HTML')
  if (decisionText.trimStart().startsWith('<')) throw new Error('QUYETDINH_KHAITHAC_BUYT returned HTML')
  if (stationText.trimStart().startsWith('<')) throw new Error('MABENXE returned HTML')

  console.log('[2/6] Building lookup maps...')
  const routeRowsRaw = parseCsvRows(routeText).slice(1)
  const bieuDoRowsRaw = parseCsvRows(bieuDoText).slice(1)
  const gioChayRowsRaw = parseCsvRows(gioChayText).slice(1)
  const decisionRowsRaw = parseCsvRows(decisionText).slice(1)
  const stationRowsRaw = parseCsvRows(stationText).slice(1)

  const stationNameByCode = new Map<string, string>()
  for (const row of stationRowsRaw) {
    const code = (row[0] || '').trim().toUpperCase()
    const name = (row[1] || '').trim()
    if (!code || !name) continue
    stationNameByCode.set(code, name)
  }

  const routeMap = new Map<string, RouteRow>()
  for (const row of routeRowsRaw) {
    const routeFbId = (row[0] || '').trim()
    const normalized = normalizeBusRouteCode(row[1] || '')
    if (!routeFbId || !normalized) continue
    const linkDecisionFile = (row[9] || '').trim()
    const notes = (row[12] || '').trim()
    const routeMeta: Record<string, string> = {
      source_sheet: 'DANHMUCTUYENBUYT',
    }
    if (linkDecisionFile) routeMeta.link_qd_danh_muc = linkDecisionFile
    if (notes) routeMeta.notes = notes
    const departureStationRef = (row[3] || '').trim().toUpperCase()
    const arrivalStationRef = (row[4] || '').trim().toUpperCase()
    const departureStationName = stationNameByCode.get(departureStationRef) || departureStationRef
    const arrivalStationName = stationNameByCode.get(arrivalStationRef) || arrivalStationRef
    routeMap.set(routeFbId, {
      routeFbId,
      routeCode: normalized.routeCode,
      routeCodeOld: normalized.routeCodeOld,
      operationStatus: (row[2] || '').trim(),
      departureStation: departureStationName,
      departureStationRef,
      arrivalStation: arrivalStationName,
      arrivalStationRef,
      distanceKm: parseIntOrNull(row[5] || ''),
      departureProvince: (row[6] || '').trim(),
      arrivalProvince: (row[7] || '').trim(),
      decisionNumber: (row[8] || '').trim(),
      totalTripsPerMonth: parseIntOrNull(row[10] || ''),
      tripsOperated: parseIntOrNull(row[11] || ''),
      itinerary: (row[13] || '').trim(),
      metadata: routeMeta,
    })
  }

  const chartMap = new Map<string, ChartRow>()
  for (const row of bieuDoRowsRaw) {
    const chartId = (row[0] || '').trim()
    if (!chartId) continue
    chartMap.set(chartId, {
      chartId,
      routeFbId: (row[1] || '').trim(),
      operatorFbId: (row[2] || '').trim(),
      decisionFbId: (row[3] || '').trim(),
      effectiveFromRaw: (row[4] || '').trim(),
    })
  }

  const decisionMap = new Map<string, DecisionRow>()
  for (const row of decisionRowsRaw) {
    const decisionFbId = (row[0] || '').trim()
    if (!decisionFbId) continue
    decisionMap.set(decisionFbId, {
      decisionFbId,
      noticeNumber: (row[1] || '').trim(),
      issueDateRaw: (row[2] || '').trim(),
    })
  }

  const codeCount = new Map<string, number>()
  let invalidId = 0
  let invalidTime = 0
  let missingChart = 0
  let missingRoute = 0
  const preparedSchedules: PreparedScheduleRow[] = []

  for (const row of gioChayRowsRaw) {
    const firebaseId = (row[0] || '').trim()
    const chartId = (row[1] || '').trim()
    const direction = normalizeDirection(row[2] || '')
    const departureTime = (row[3] || '').trim()

    if (!isHexId8(firebaseId)) { invalidId++; continue }
    if (!isTimeHHmm(departureTime)) { invalidTime++; continue }

    const chart = chartMap.get(chartId)
    if (!chart) { missingChart++; continue }
    const route = routeMap.get(chart.routeFbId)
    if (!route) { missingRoute++; continue }

    const decision = decisionMap.get(chart.decisionFbId)
    const baseCode = genBusScheduleCode(route.routeCodeOld, direction, departureTime)
    const count = (codeCount.get(baseCode) || 0) + 1
    codeCount.set(baseCode, count)
    const scheduleCode = count > 1 ? genBusScheduleCode(route.routeCodeOld, direction, departureTime, String(count)) : baseCode

    preparedSchedules.push({
      firebaseId,
      routeFbId: chart.routeFbId,
      operatorFbId: chart.operatorFbId,
      scheduleCode,
      departureTime,
      direction,
      effectiveFrom: parseDate(chart.effectiveFromRaw) || parseDate(decision?.issueDateRaw || '') || '2025-01-01',
      notificationNumber: decision?.noticeNumber || '',
      tripStatus: 'Hoạt động',
      metadata: {
        source_sheet: 'GIOCHAY_BUYT',
        bieu_do_id: chart.chartId,
        qd_khai_thac_id: chart.decisionFbId,
      },
    })
  }

  console.log(`  Routes map: ${routeMap.size}, Charts: ${chartMap.size}, Decisions: ${decisionMap.size}, Stations map: ${stationNameByCode.size}`)
  console.log(`  Prepared schedules: ${preparedSchedules.length} (invalidId=${invalidId}, invalidTime=${invalidTime}, missingChart=${missingChart}, missingRoute=${missingRoute})`)

  console.log('[3/6] Upserting BUS routes...')
  await db.execute(sql.raw('DROP TABLE IF EXISTS _tmp_bus_routes'))
  await db.execute(sql.raw(`
    CREATE TEMP TABLE _tmp_bus_routes (
      route_fb_id TEXT PRIMARY KEY,
      route_code TEXT NOT NULL,
      route_code_old TEXT,
      operation_status TEXT,
      departure_station TEXT,
      departure_station_ref TEXT,
      arrival_station TEXT,
      arrival_station_ref TEXT,
      departure_province TEXT,
      arrival_province TEXT,
      distance_km INTEGER,
      itinerary TEXT,
      decision_number TEXT,
      total_trips_per_month INTEGER,
      trips_operated INTEGER,
      metadata JSONB
    )
  `))
  const routeValues = [...routeMap.values()].map(r =>
    `(${esc(r.routeFbId)},${esc(r.routeCode)},${esc(r.routeCodeOld)},${esc(r.operationStatus || null)},` +
    `${esc(r.departureStation || null)},${esc(r.departureStationRef || null)},${esc(r.arrivalStation || null)},${esc(r.arrivalStationRef || null)},` +
    `${esc(r.departureProvince || null)},${esc(r.arrivalProvince || null)},` +
    `${escNum(r.distanceKm)},${esc(r.itinerary || null)},${esc(r.decisionNumber || null)},${escNum(r.totalTripsPerMonth)},${escNum(r.tripsOperated)},` +
    `${esc(JSON.stringify(r.metadata))})`
  )
  if (routeValues.length > 0) await db.execute(sql.raw(`INSERT INTO _tmp_bus_routes VALUES ${routeValues.join(',')}`))

  if (isDryRun) {
    const routeCount = await db.execute(sql.raw(`
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM routes r WHERE r.firebase_id = t.route_fb_id)) AS would_update,
             COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM routes r WHERE r.firebase_id = t.route_fb_id)) AS would_insert
      FROM _tmp_bus_routes t
    `))
    const rc = (routeCount as any)[0]
    console.log(`  [DRY] Routes would insert=${rc.would_insert}, update=${rc.would_update}, total=${rc.total}`)
  } else {
    await db.execute(sql.raw(`
      INSERT INTO routes (
        firebase_id, route_code, route_code_old,
        departure_station, departure_station_ref, arrival_station, arrival_station_ref, departure_province, arrival_province,
        distance_km, itinerary, decision_number, total_trips_per_month, trips_operated, remaining_capacity,
        route_type, operation_status, is_active, source, metadata, synced_at, created_at, updated_at
      )
      SELECT
        t.route_fb_id, t.route_code, t.route_code_old,
        NULLIF(t.departure_station, ''), NULLIF(t.departure_station_ref, ''), NULLIF(t.arrival_station, ''), NULLIF(t.arrival_station_ref, ''), NULLIF(t.departure_province, ''), NULLIF(t.arrival_province, ''),
        t.distance_km, NULLIF(t.itinerary, ''), NULLIF(t.decision_number, ''), t.total_trips_per_month, t.trips_operated,
        CASE
          WHEN t.total_trips_per_month IS NOT NULL AND t.trips_operated IS NOT NULL THEN GREATEST(t.total_trips_per_month - t.trips_operated, 0)
          ELSE NULL
        END,
        'bus', NULLIF(t.operation_status, ''), true, 'sheet_sync_bus', t.metadata, NOW(), NOW(), NOW()
      FROM _tmp_bus_routes t
      ON CONFLICT (firebase_id) DO UPDATE SET
        route_code = EXCLUDED.route_code,
        route_code_old = EXCLUDED.route_code_old,
        departure_station = EXCLUDED.departure_station,
        departure_station_ref = EXCLUDED.departure_station_ref,
        arrival_station = EXCLUDED.arrival_station,
        arrival_station_ref = EXCLUDED.arrival_station_ref,
        departure_province = EXCLUDED.departure_province,
        arrival_province = EXCLUDED.arrival_province,
        distance_km = EXCLUDED.distance_km,
        itinerary = EXCLUDED.itinerary,
        decision_number = EXCLUDED.decision_number,
        total_trips_per_month = EXCLUDED.total_trips_per_month,
        trips_operated = EXCLUDED.trips_operated,
        remaining_capacity = EXCLUDED.remaining_capacity,
        route_type = 'bus',
        operation_status = EXCLUDED.operation_status,
        source = 'sheet_sync_bus',
        metadata = EXCLUDED.metadata,
        synced_at = NOW(),
        updated_at = NOW()
    `))
    console.log('  Routes upsert complete')
  }

  console.log('[4/6] Preparing schedule temp table...')
  await db.execute(sql.raw('DROP TABLE IF EXISTS _tmp_bus_schedules'))
  await db.execute(sql.raw(`
    CREATE TEMP TABLE _tmp_bus_schedules (
      firebase_id TEXT PRIMARY KEY,
      route_fb_id TEXT,
      operator_fb_id TEXT,
      schedule_code TEXT,
      departure_time TEXT,
      direction TEXT,
      frequency_type TEXT,
      days_of_week JSONB,
      days_of_month JSONB,
      calendar_type TEXT,
      notification_number TEXT,
      trip_status TEXT,
      effective_from TEXT,
      metadata JSONB
    )
  `))

  const CHUNK = 500
  for (let i = 0; i < preparedSchedules.length; i += CHUNK) {
    const chunk = preparedSchedules.slice(i, i + CHUNK)
    const values = chunk.map(r =>
      `(${esc(r.firebaseId)},${esc(r.routeFbId)},${esc(r.operatorFbId || null)},${esc(r.scheduleCode)},` +
      `${esc(r.departureTime)},${esc(r.direction)},'daily','[1,2,3,4,5,6,7]'::jsonb,'[]'::jsonb,'solar',` +
      `${esc(r.notificationNumber || null)},${esc(r.tripStatus)},${esc(r.effectiveFrom)},${esc(JSON.stringify(r.metadata))})`
    ).join(',')
    await db.execute(sql.raw(`INSERT INTO _tmp_bus_schedules VALUES ${values}`))
  }

  const resolutionStats = await db.execute(sql.raw(`
    SELECT
      COUNT(*) FILTER (WHERE r.id IS NOT NULL OR tr.route_fb_id IS NOT NULL) AS route_matched,
      COUNT(*) FILTER (WHERE r.id IS NULL AND tr.route_fb_id IS NULL) AS route_unresolved,
      COUNT(*) FILTER (WHERE o.id IS NOT NULL) AS operator_matched,
      COUNT(*) FILTER (WHERE o.id IS NULL) AS operator_unresolved,
      COUNT(*) FILTER (WHERE (r.id IS NOT NULL OR tr.route_fb_id IS NOT NULL) AND o.id IS NOT NULL) AS fully_resolved
    FROM _tmp_bus_schedules t
    LEFT JOIN routes r ON r.firebase_id = t.route_fb_id
    LEFT JOIN _tmp_bus_routes tr ON tr.route_fb_id = t.route_fb_id
    LEFT JOIN operators o ON o.firebase_id = t.operator_fb_id
  `))
  const rs = (resolutionStats as any)[0]
  console.log(`  Resolution: route matched=${rs.route_matched}, unresolved=${rs.route_unresolved}; operator matched=${rs.operator_matched}, unresolved=${rs.operator_unresolved}`)

  console.log('[5/6] Upserting schedules...')
  if (isDryRun) {
    const scheduleCount = await db.execute(sql.raw(`
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM schedules s WHERE s.firebase_id = t.firebase_id)) AS would_update,
             COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM schedules s WHERE s.firebase_id = t.firebase_id)) AS would_insert
      FROM _tmp_bus_schedules t
      LEFT JOIN routes r ON r.firebase_id = t.route_fb_id
      LEFT JOIN _tmp_bus_routes tr ON tr.route_fb_id = t.route_fb_id
      LEFT JOIN operators o ON o.firebase_id = t.operator_fb_id
      WHERE (r.id IS NOT NULL OR tr.route_fb_id IS NOT NULL) AND o.id IS NOT NULL
    `))
    const sc = (scheduleCount as any)[0]
    console.log(`  [DRY] Schedules would insert=${sc.would_insert}, update=${sc.would_update}, total=${sc.total}`)
  } else {
    await db.execute(sql.raw(`
      INSERT INTO schedules (
        firebase_id, schedule_code, route_id, operator_id,
        departure_time, direction, frequency_type, days_of_week, days_of_month,
        calendar_type, notification_number, trip_status,
        effective_from, is_active, source, synced_at, metadata, created_at, updated_at
      )
      SELECT
        t.firebase_id, t.schedule_code, r.id, o.id,
        t.departure_time::time, t.direction, t.frequency_type, t.days_of_week, t.days_of_month,
        t.calendar_type, t.notification_number, t.trip_status,
        COALESCE(t.effective_from, '2025-01-01'), true, 'sheet_sync_bus', NOW(), t.metadata, NOW(), NOW()
      FROM _tmp_bus_schedules t
      LEFT JOIN routes r ON r.firebase_id = t.route_fb_id
      LEFT JOIN operators o ON o.firebase_id = t.operator_fb_id
      WHERE r.id IS NOT NULL AND o.id IS NOT NULL
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
        notification_number = EXCLUDED.notification_number,
        trip_status = EXCLUDED.trip_status,
        effective_from = EXCLUDED.effective_from,
        source = 'sheet_sync_bus',
        synced_at = NOW(),
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `))
    console.log('  Schedules upsert complete')
  }

  console.log('[6/6] Summary...')
  const routeTotal = await db.execute(sql.raw(`SELECT COUNT(*) AS cnt FROM routes WHERE source = 'sheet_sync_bus'`))
  const scheduleTotal = await db.execute(sql.raw(`SELECT COUNT(*) AS cnt FROM schedules WHERE source = 'sheet_sync_bus'`))
  const byDirection = await db.execute(sql.raw(`
    SELECT direction, COUNT(*) AS cnt
    FROM schedules
    WHERE source = 'sheet_sync_bus'
    GROUP BY direction
  `))
  console.log(`  Routes synced (sheet_sync_bus): ${(routeTotal as any)[0]?.cnt}`)
  console.log(`  Schedules synced (sheet_sync_bus): ${(scheduleTotal as any)[0]?.cnt}`)
  console.log(`  Directions: ${(byDirection as any).map((r: any) => `${r.direction || 'NULL'}=${r.cnt}`).join(', ')}`)

  await db.execute(sql.raw('DROP TABLE IF EXISTS _tmp_bus_schedules'))
  await db.execute(sql.raw('DROP TABLE IF EXISTS _tmp_bus_routes'))
}

main().catch(async (err) => {
  console.error('Fatal:', err)
  try {
    await db?.execute(sql.raw('DROP TABLE IF EXISTS _tmp_bus_schedules'))
    await db?.execute(sql.raw('DROP TABLE IF EXISTS _tmp_bus_routes'))
  } catch {
    // ignore cleanup errors
  }
  process.exit(1)
})
