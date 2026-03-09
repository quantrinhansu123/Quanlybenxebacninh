/**
 * Sync schedules (Biểu Đồ Giờ) from Google Sheet CSV → Supabase
 * - Fetches BieuDoGio sheet + ThongBaoKhaiThac sheet (lookup tuyến + nhà xe)
 * - Resolves route_id via route_code, operator_id via firebase_id
 * Usage: npx tsx src/db/migrations/etl/sync-schedules-from-sheet.ts [--dry-run]
 */
import 'dotenv/config'
import { db } from '../../drizzle.js'
import { sql } from 'drizzle-orm'

const SCHEDULE_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1hh1GKMiEXKb2KBYpyvzpqYuyc1Khzfjdxv2YMfIZ7cI/export?format=csv&gid=230690868'

const NOTIFICATION_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1hh1GKMiEXKb2KBYpyvzpqYuyc1Khzfjdxv2YMfIZ7cI/export?format=csv&gid=1033980793'

interface ScheduleSheetRow {
  ID_NutChay: string; Ref_ThongBaoKhaiThac: string; SoThongBao: string
  Chieu: string; GioXuatBen: string; NgayHoatDong: string
  LoaiNgay: string; TrangThaiChuyen: string; GhiChu: string
  User: string; ThoiGianNhap: string
}

interface NotificationRow {
  ID_TB: string; Ref_Tuyen: string; Ref_DonVi: string
  SoThongBao: string; NgayBanHanh: string
}

/** Parse CSV (handles quoted fields with commas/escaped quotes) */
function parseCSV<T = Record<string, string>>(text: string): T[] {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const parseRow = (line: string): string[] => {
    const fields: string[] = []; let current = '', inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { if (inQuotes && line[i + 1] === '"') { current += '"'; i++ } else inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = '' }
      else current += ch
    }
    fields.push(current.trim())
    return fields
  }
  const headers = parseRow(lines[0])
  return lines.slice(1).map(line => {
    const vals = parseRow(line), obj: any = {}
    headers.forEach((h, j) => obj[h] = vals[j] || '')
    return obj
  })
}

/** Parse date from various formats -> yyyy-MM-dd */
function parseDate(d: string): string | null {
  if (!d) return null
  const m1 = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) {
    let [, p1, p2, year] = m1
    if (+p2 > 12) return `${year}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`
    if (+p2 >= 1 && +p2 <= 12 && +p1 >= 1 && +p1 <= 31)
      return `${year}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`
  }
  const m3 = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m3) return m3[0]
  return null
}

/** Parse "1 , 2 , 3 , ..." → [1, 2, 3, ...] */
function parseDaysOfMonth(s: string): number[] {
  if (!s) return []
  return s.split(',').map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 31)
}

/** Map LoaiNgay → calendar_type */
function mapCalendarType(s: string): string {
  return s?.includes('Âm') ? 'lunar' : 'solar'
}

/** Map frequencyType from days count */
function mapFrequencyType(days: number[]): string {
  return days.length >= 28 ? 'daily' : 'specific_days'
}

/** Generate scheduleCode: BDG-{routeCode}-{D|V}-{HHmm}[-{suffix}] */
function genScheduleCode(routeCode: string, direction: string, time: string, suffix?: string): string {
  const dir = direction === 'Về' ? 'V' : 'D'
  const t = time.replace(':', '')
  const base = `BDG-${routeCode}-${dir}-${t}`
  return suffix ? `${base}-${suffix}` : base
}

/** Escape string for SQL literal */
const esc = (s: string | null): string => s === null ? 'NULL' : `'${s.replace(/'/g, "''")}'`

async function main() {
  const isDryRun = process.argv.includes('--dry-run')
  if (!db) { console.error('DATABASE_URL not set'); process.exit(1) }
  console.log(`=== Sync schedules (Biểu Đồ Giờ) ===\nMode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`)

  // [1/5] Fetch 2 CSVs in parallel
  console.log('\n[1/5] Fetching CSVs...')
  const [scheduleRes, notifRes] = await Promise.all([
    fetch(SCHEDULE_CSV_URL),
    fetch(NOTIFICATION_CSV_URL),
  ])
  if (!scheduleRes.ok) throw new Error(`Schedule CSV fetch failed: ${scheduleRes.status}`)
  if (!notifRes.ok) throw new Error(`Notification CSV fetch failed: ${notifRes.status}`)

  const scheduleText = await scheduleRes.text()
  const notifText = await notifRes.text()
  if (scheduleText.trimStart().startsWith('<')) throw new Error('Schedule CSV response is HTML — check sheet permissions')
  if (notifText.trimStart().startsWith('<')) throw new Error('Notification CSV response is HTML — check sheet permissions')

  const scheduleRows = parseCSV<ScheduleSheetRow>(scheduleText).filter(r => r.ID_NutChay)
  const notifRows = parseCSV<NotificationRow>(notifText).filter(r => r.ID_TB)
  console.log(`  BieuDoGio rows: ${scheduleRows.length}, ThongBaoKhaiThac rows: ${notifRows.length}`)

  // [2/5] Build lookup map: ThongBaoKhaiThac[ID_TB] → {routeCode, operatorFbId, ngayBanHanh}
  console.log('[2/5] Building notification lookup...')
  const notifMap = new Map<string, { routeCode: string; operatorFbId: string; ngayBanHanh: string; soThongBao: string }>()
  for (const n of notifRows) {
    notifMap.set(n.ID_TB, {
      routeCode: n.Ref_Tuyen || '',
      operatorFbId: n.Ref_DonVi || '',
      ngayBanHanh: n.NgayBanHanh || '',
      soThongBao: n.SoThongBao || '',
    })
  }
  console.log(`  Notification lookup: ${notifMap.size} entries`)

  // Track schedule_code uniqueness
  const codeCount = new Map<string, number>()

  // Prepare rows for temp table
  const preparedRows: Array<{
    firebaseId: string; routeCode: string; operatorFbId: string; scheduleCode: string
    departureTime: string; direction: string; daysOfMonth: number[]; daysOfWeek: number[]
    calendarType: string; frequencyType: string; notificationNumber: string
    tripStatus: string; effectiveFrom: string; metadata: Record<string, string>
  }> = []

  let notifMiss = 0
  for (const r of scheduleRows) {
    const notif = notifMap.get(r.Ref_ThongBaoKhaiThac)
    if (!notif) { notifMiss++; continue }

    const routeCode = notif.routeCode
    const direction = r.Chieu || 'Đi'
    const time = r.GioXuatBen || '00:00'
    const days = parseDaysOfMonth(r.NgayHoatDong)

    // Handle schedule_code uniqueness
    const baseCode = genScheduleCode(routeCode, direction, time)
    const count = (codeCount.get(baseCode) || 0) + 1
    codeCount.set(baseCode, count)
    const scheduleCode = count > 1 ? genScheduleCode(routeCode, direction, time, String(count)) : baseCode

    const meta: Record<string, string> = {}
    if (r.GhiChu) meta.notes = r.GhiChu
    if (r.User) meta.user = r.User
    if (r.ThoiGianNhap) meta.input_time = r.ThoiGianNhap

    preparedRows.push({
      firebaseId: r.ID_NutChay,
      routeCode,
      operatorFbId: notif.operatorFbId,
      scheduleCode,
      departureTime: time,
      direction,
      daysOfMonth: days,
      daysOfWeek: days.length >= 28 ? [1,2,3,4,5,6,7] : [],
      calendarType: mapCalendarType(r.LoaiNgay),
      frequencyType: mapFrequencyType(days),
      notificationNumber: r.SoThongBao || notif.soThongBao || '',
      tripStatus: r.TrangThaiChuyen || 'Hoạt động',
      effectiveFrom: parseDate(notif.ngayBanHanh) || '2025-01-01',
      metadata: meta,
    })
  }
  console.log(`  Prepared: ${preparedRows.length} rows (${notifMiss} skipped — no notification match)`)

  // [3/5] Create temp table & bulk INSERT
  console.log('[3/5] Creating temp table & inserting...')
  await db.execute(sql.raw(`DROP TABLE IF EXISTS _tmp_schedules`))
  await db.execute(sql.raw(`
    CREATE TEMP TABLE _tmp_schedules (
      firebase_id TEXT PRIMARY KEY,
      route_code TEXT,
      operator_fb_id TEXT,
      schedule_code TEXT,
      departure_time TEXT,
      direction TEXT,
      days_of_month JSONB,
      days_of_week JSONB,
      calendar_type TEXT,
      frequency_type TEXT,
      notification_number TEXT,
      trip_status TEXT,
      effective_from TEXT,
      source TEXT DEFAULT 'sheet_sync',
      metadata JSONB
    )
  `))

  const CHUNK = 500
  let inserted = 0
  for (let i = 0; i < preparedRows.length; i += CHUNK) {
    const chunk = preparedRows.slice(i, i + CHUNK)
    const values = chunk.map(r =>
      `(${esc(r.firebaseId)},${esc(r.routeCode)},${esc(r.operatorFbId)},${esc(r.scheduleCode)},` +
      `${esc(r.departureTime)},${esc(r.direction)},${esc(JSON.stringify(r.daysOfMonth))},` +
      `${esc(JSON.stringify(r.daysOfWeek))},${esc(r.calendarType)},${esc(r.frequencyType)},` +
      `${esc(r.notificationNumber)},${esc(r.tripStatus)},${esc(r.effectiveFrom)},` +
      `'sheet_sync',${esc(JSON.stringify(r.metadata))})`
    ).join(',')
    await db.execute(sql.raw(`INSERT INTO _tmp_schedules VALUES ${values}`))
    inserted += chunk.length
  }
  console.log(`  Inserted ${inserted} rows into temp table`)

  // Resolution stats
  const resStats = await db.execute(sql.raw(`
    SELECT
      COUNT(*) FILTER (WHERE r.id IS NOT NULL) as route_matched,
      COUNT(*) FILTER (WHERE r.id IS NULL) as route_unresolved,
      COUNT(*) FILTER (WHERE o.id IS NOT NULL) as operator_matched,
      COUNT(*) FILTER (WHERE o.id IS NULL) as operator_unresolved,
      COUNT(*) FILTER (WHERE r.id IS NOT NULL AND o.id IS NOT NULL) as fully_resolved
    FROM _tmp_schedules t
    LEFT JOIN routes r ON r.route_code = t.route_code
    LEFT JOIN operators o ON o.firebase_id = t.operator_fb_id
  `))
  const rs = (resStats as any)[0]
  console.log(`  Route: ${rs.route_matched} matched, ${rs.route_unresolved} unresolved`)
  console.log(`  Operator: ${rs.operator_matched} matched, ${rs.operator_unresolved} unresolved`)
  console.log(`  Fully resolved: ${rs.fully_resolved}`)

  // [4/5] UPSERT into schedules
  console.log('[4/5] Upserting into schedules...')
  const upsertSql = `
    INSERT INTO schedules (
      firebase_id, schedule_code, route_id, operator_id,
      departure_time, direction, frequency_type, days_of_week, days_of_month,
      calendar_type, notification_number, trip_status,
      effective_from, is_active, source, synced_at, metadata,
      created_at, updated_at
    )
    SELECT
      t.firebase_id, t.schedule_code,
      r.id, o.id,
      t.departure_time::time, t.direction, t.frequency_type,
      t.days_of_week, t.days_of_month,
      t.calendar_type, t.notification_number, t.trip_status,
      COALESCE(t.effective_from, '2025-01-01'), true,
      'sheet_sync', NOW(), t.metadata,
      NOW(), NOW()
    FROM _tmp_schedules t
    LEFT JOIN routes r ON r.route_code = t.route_code
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
      source = 'sheet_sync',
      synced_at = NOW(),
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
  `

  if (isDryRun) {
    const countRes = await db.execute(sql.raw(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM schedules s WHERE s.firebase_id = t.firebase_id)) as would_update,
             COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM schedules s WHERE s.firebase_id = t.firebase_id)) as would_insert
      FROM _tmp_schedules t
      LEFT JOIN routes r ON r.route_code = t.route_code
      LEFT JOIN operators o ON o.firebase_id = t.operator_fb_id
      WHERE r.id IS NOT NULL AND o.id IS NOT NULL
    `))
    const c = (countRes as any)[0]
    console.log(`  [DRY] Would insert: ${c.would_insert}, Would update: ${c.would_update} (total: ${c.total})`)
  } else {
    await db.execute(sql.raw(upsertSql))
    console.log('  Upsert complete')
  }

  // [5/5] Summary
  console.log('[5/5] Summary...')
  await db.execute(sql.raw(`DROP TABLE IF EXISTS _tmp_schedules`))

  const total = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM schedules`))
  const synced = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM schedules WHERE source = 'sheet_sync'`))
  const byDir = await db.execute(sql.raw(`SELECT direction, COUNT(*) as cnt FROM schedules GROUP BY direction`))
  const byStatus = await db.execute(sql.raw(`SELECT trip_status, COUNT(*) as cnt FROM schedules GROUP BY trip_status`))

  console.log(`\nDone!`)
  console.log(`  Total schedules: ${(total as any)[0]?.cnt}`)
  console.log(`  Synced from sheet: ${(synced as any)[0]?.cnt}`)
  console.log(`  By direction:`, (byDir as any).map((r: any) => `${r.direction || 'NULL'}: ${r.cnt}`).join(', '))
  console.log(`  By trip_status:`, (byStatus as any).map((r: any) => `${r.trip_status || 'NULL'}: ${r.cnt}`).join(', '))
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
