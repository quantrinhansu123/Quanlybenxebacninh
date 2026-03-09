/**
 * Sync vehicle_badges from Google Sheet CSV (bulk operations)
 * - Fetches PHUHIEUXE sheet + DANHMUCXE sheet (for IDXe -> BienSo mapping)
 * - Resolves BienSoXe (Firebase vehicle ref) to real plate numbers
 * - Also fixes existing UNKNOWN_ plate_number records
 * Usage: npx tsx sync-vehicle-badges-from-sheet.ts [--dry-run]
 */
import 'dotenv/config'
import { db } from '../../drizzle.js'
import { sql } from 'drizzle-orm'

// Use /export?format=csv (NOT gviz) — gviz drops date values for some rows
const BADGE_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1hh1GKMiEXKb2KBYpyvzpqYuyc1Khzfjdxv2YMfIZ7cI/export?format=csv&gid=1560762265'

// Sheet DANHMUCXE - maps IDXe -> BienSo
const VEHICLE_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1hh1GKMiEXKb2KBYpyvzpqYuyc1Khzfjdxv2YMfIZ7cI/export?format=csv&gid=40001005'

interface SheetRow {
  ID_PhuHieu: string; MaHoSo: string; LoaiPH: string; SoPhuHieu: string; BienSoXe: string
  Ref_DonViCapPhuHieu: string; Ref_GPKD: string; Ref_Tuyen: string; Ref_TuyenBuyt: string; NgayCap: string
  NgayHetHan: string; LoaiCap: string; LyDoCapLai: string; SoPhuHieuCu: string
  TrangThai: string; QDThuHoi: string; LyDoThuHoi: string; NgayThuHoi: string
  XeThayThe: string; MauPhuHieu: string; GhiChu: string; Xebithaythe: string; Hancap: string
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
  // dd/MM/yyyy or M/D/YYYY (auto-detect by checking if second part > 12)
  const m1 = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) {
    let [, p1, p2, year] = m1
    // If p2 > 12, format is M/D/YYYY (US) — p1 is month, p2 is day
    if (+p2 > 12) return `${year}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`
    // Otherwise dd/MM/yyyy (VN) — p1 is day, p2 is month
    if (+p2 >= 1 && +p2 <= 12 && +p1 >= 1 && +p1 <= 31)
      return `${year}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`
  }
  // Google Sheets gviz format: Date(yyyy,M,d) (month is 0-based)
  const m2 = d.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/)
  if (m2) {
    const [, year, month0, day] = m2
    const month = +month0 + 1
    if (month >= 1 && month <= 12 && +day >= 1 && +day <= 31)
      return `${year}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  // ISO format: yyyy-MM-dd
  const m3 = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m3) return m3[0]
  return null
}

/** Map TrangThai -> status */
function mapStatus(s: string): string {
  if (!s) return 'active'
  const l = s.toLowerCase()
  if (l.includes('thu hồi')) return 'revoked'
  if (l.includes('hết hiệu lực') || l.includes('hết hạn')) return 'expired'
  if (l.includes('hiệu lực')) return 'active'
  return 'active'
}

function isBusBadgeType(badgeType: string): boolean {
  const normalized = (badgeType || '').trim().toLowerCase()
  return normalized === 'buýt' || normalized === 'buyt'
}

/** Build metadata JSONB */
function buildMeta(r: SheetRow): Record<string, string> {
  const m: Record<string, string> = {}
  if (r.LoaiPH) m.badge_type = r.LoaiPH
  if (r.MaHoSo) m.file_number = r.MaHoSo
  if (r.LoaiCap) m.issue_type = r.LoaiCap
  if (r.MauPhuHieu) m.badge_color = r.MauPhuHieu
  if (r.GhiChu) m.notes = r.GhiChu
  if (r.Ref_GPKD) m.business_license_ref = r.Ref_GPKD
  if (r.Ref_DonViCapPhuHieu) m.issuing_authority_ref = r.Ref_DonViCapPhuHieu
  if (r.Ref_Tuyen) m.route_ref = r.Ref_Tuyen
  if (r.Ref_TuyenBuyt) m.bus_route_ref = r.Ref_TuyenBuyt
  if (r.SoPhuHieuCu) m.old_badge_number = r.SoPhuHieuCu
  if (r.LyDoCapLai) m.renewal_reason = r.LyDoCapLai
  if (r.QDThuHoi) m.revoke_decision = r.QDThuHoi
  if (r.LyDoThuHoi) m.revoke_reason = r.LyDoThuHoi
  const rd = parseDate(r.NgayThuHoi); if (rd) m.revoke_date = rd
  if (r.XeThayThe) m.replacement_vehicle = r.XeThayThe
  if (r.Xebithaythe) m.vehicle_replaced = r.Xebithaythe
  if (r.Hancap) m.renewal_due_date = r.Hancap
  if (r.TrangThai) m.status = r.TrangThai
  return m
}

/** Escape string for SQL literal */
const esc = (s: string | null): string => s === null ? 'NULL' : `'${s.replace(/'/g, "''")}'`

async function main() {
  const isDryRun = process.argv.includes('--dry-run')
  if (!db) { console.error('DATABASE_URL not set'); process.exit(1) }
  console.log(`=== Sync vehicle_badges (bulk) ===\nMode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`)

  // 1. Fetch both CSVs in parallel
  console.log('\n[1/6] Fetching CSVs...')
  const [badgeRes, vehicleRes] = await Promise.all([
    fetch(BADGE_CSV_URL),
    fetch(VEHICLE_CSV_URL),
  ])
  if (!badgeRes.ok) throw new Error(`Badge CSV fetch failed: ${badgeRes.status}`)
  if (!vehicleRes.ok) throw new Error(`Vehicle CSV fetch failed: ${vehicleRes.status}`)

  const badgeText = await badgeRes.text()
  const vehicleText = await vehicleRes.text()
  // Validate responses are CSV (not HTML login/error page)
  if (badgeText.trimStart().startsWith('<')) throw new Error('Badge CSV response is HTML, not CSV — check sheet permissions')
  if (vehicleText.trimStart().startsWith('<')) throw new Error('Vehicle CSV response is HTML, not CSV — check sheet permissions')

  const rows = parseCSV<SheetRow>(badgeText).filter(r => r.ID_PhuHieu)
  const vehicleRows = parseCSV<{ IDXe: string; BienSo: string }>(vehicleText)

  // Build IDXe -> BienSo mapping
  const vehicleMap = new Map<string, string>()
  for (const v of vehicleRows) {
    if (v.IDXe && v.BienSo) vehicleMap.set(v.IDXe, v.BienSo)
  }
  console.log(`  Badge rows: ${rows.length}, Vehicle mapping: ${vehicleMap.size} entries`)

  // Build BUS route lookup map: Ref_TuyenBuyt (firebase_id) -> route_id/route_code/route_name
  const busRoutesRaw = await db.execute(sql.raw(`
    SELECT
      firebase_id,
      id::text AS route_id,
      route_code,
      route_code_old,
      departure_station,
      arrival_station
    FROM routes
    WHERE route_type = 'bus'
      AND firebase_id IS NOT NULL
  `))
  const busRouteMap = new Map<string, { routeId: string; routeCode: string | null; routeName: string | null }>()
  for (const route of (busRoutesRaw as any[])) {
    const firebaseId = String(route.firebase_id || '').trim()
    const routeId = String(route.route_id || '').trim()
    if (!firebaseId || !routeId) continue
    const routeCodeOld = String(route.route_code_old || '').trim()
    const routeCode = String(route.route_code || '').trim()
    const departureStation = String(route.departure_station || '').trim()
    const arrivalStation = String(route.arrival_station || '').trim()
    const routeName = departureStation && arrivalStation ? `${departureStation} - ${arrivalStation}` : null
    busRouteMap.set(firebaseId, {
      routeId,
      routeCode: routeCodeOld || routeCode || null,
      routeName,
    })
  }
  console.log(`  BUS route lookup: ${busRouteMap.size} routes`)

  // 2. Create temp table & insert all data
  console.log('[2/6] Creating temp table...')
  await db.execute(sql.raw(`DROP TABLE IF EXISTS _tmp_badges`))
  await db.execute(sql.raw(`
    CREATE TEMP TABLE _tmp_badges (
      firebase_id TEXT PRIMARY KEY, badge_number TEXT, badge_type TEXT,
      issue_date TEXT, expiry_date TEXT, status TEXT, is_active BOOLEAN,
      metadata JSONB, vehicle_fb_ref TEXT, resolved_plate TEXT,
      route_fb_ref TEXT, resolved_route_id UUID, resolved_route_code TEXT, resolved_route_name TEXT
    )
  `))

  // Build VALUES for batch insert (chunks of 500)
  const CHUNK = 500
  let inserted = 0
  let busBadgeTotal = 0
  let busWithRef = 0
  let busMissingRef = 0
  let busResolvedRoute = 0
  let busUnresolvedRoute = 0
  const unresolvedSamples: string[] = []

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const values = chunk.map(r => {
      const status = mapStatus(r.TrangThai)
      const meta = buildMeta(r)
      const isBus = isBusBadgeType(r.LoaiPH)
      if (isBus) {
        busBadgeTotal++
      }
      // Resolve BienSoXe (Firebase vehicle ref) -> real plate number
      const resolvedPlate = r.BienSoXe ? (vehicleMap.get(r.BienSoXe) || null) : null
      const routeFbRefRaw = (r.Ref_TuyenBuyt || '').trim()
      const routeFbRef = isBus && routeFbRefRaw ? routeFbRefRaw : null
      let resolvedRouteId: string | null = null
      let resolvedRouteCode: string | null = null
      let resolvedRouteName: string | null = null

      if (isBus) {
        if (!routeFbRef) {
          busMissingRef++
        } else {
          busWithRef++
          const matchedRoute = busRouteMap.get(routeFbRef)
          if (matchedRoute) {
            resolvedRouteId = matchedRoute.routeId
            resolvedRouteCode = matchedRoute.routeCode
            resolvedRouteName = matchedRoute.routeName
            busResolvedRoute++
          } else {
            busUnresolvedRoute++
            if (unresolvedSamples.length < 20) unresolvedSamples.push(`${r.ID_PhuHieu}:${routeFbRef}`)
          }
        }
      }

      return `(${esc(r.ID_PhuHieu)},${esc(r.SoPhuHieu || null)},${esc(r.LoaiPH || null)},` +
        `${esc(parseDate(r.NgayCap))},${esc(parseDate(r.NgayHetHan))},${esc(status)},` +
        `${status === 'active'},${esc(JSON.stringify(meta))},${esc(r.BienSoXe || null)},${esc(resolvedPlate)},` +
        `${esc(routeFbRef)},${esc(resolvedRouteId)}::uuid,${esc(resolvedRouteCode)},${esc(resolvedRouteName)})`
    }).join(',')
    await db.execute(sql.raw(`INSERT INTO _tmp_badges VALUES ${values}`))
    inserted += chunk.length
  }
  console.log(`  Inserted ${inserted} rows into temp table`)
  console.log(`  BUS mapping: total=${busBadgeTotal}, withRef=${busWithRef}, missingRef=${busMissingRef}, resolved=${busResolvedRoute}, unresolved=${busUnresolvedRoute}`)
  if (unresolvedSamples.length > 0) {
    console.warn(`  WARN unresolved BUS route refs (${unresolvedSamples.length} sample): ${unresolvedSamples.join(', ')}`)
  }

  // Stats on resolution
  const resolvedStats = await db.execute(sql.raw(`
    SELECT COUNT(*) FILTER (WHERE resolved_plate IS NOT NULL) as resolved,
           COUNT(*) FILTER (WHERE resolved_plate IS NULL AND vehicle_fb_ref IS NOT NULL) as unresolved,
           COUNT(*) FILTER (WHERE vehicle_fb_ref IS NULL OR vehicle_fb_ref = '') as no_ref
    FROM _tmp_badges
  `))
  const rs = (resolvedStats as any)[0]
  console.log(`  Plate resolution: ${rs.resolved} resolved, ${rs.unresolved} unresolved, ${rs.no_ref} no vehicle ref`)

  // 3. Bulk UPDATE existing records (now also update plate_number if resolved)
  console.log('[3/6] Bulk update badges...')
  const updateSql = `
    UPDATE vehicle_badges vb SET
      badge_number = COALESCE(NULLIF(t.badge_number, ''), vb.badge_number),
      badge_type = COALESCE(NULLIF(t.badge_type, ''), vb.badge_type),
      issue_date = COALESCE(NULLIF(t.issue_date, '')::date, vb.issue_date),
      expiry_date = COALESCE(NULLIF(t.expiry_date, '')::date, vb.expiry_date),
      status = t.status,
      is_active = t.is_active,
      metadata = COALESCE(vb.metadata, '{}'::jsonb) || t.metadata,
      plate_number = COALESCE(t.resolved_plate, vb.plate_number),
      route_id = COALESCE(t.resolved_route_id, vb.route_id),
      route_code = COALESCE(NULLIF(t.resolved_route_code, ''), vb.route_code),
      route_name = COALESCE(NULLIF(t.resolved_route_name, ''), vb.route_name),
      source = 'sheet_sync',
      synced_at = NOW(),
      updated_at = NOW()
    FROM _tmp_badges t
    WHERE vb.firebase_id = t.firebase_id
  `
  if (isDryRun) {
    const countRes = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM vehicle_badges vb JOIN _tmp_badges t ON vb.firebase_id = t.firebase_id`))
    console.log(`  [DRY] Would update: ${(countRes as any)[0]?.cnt || 0}`)
  } else {
    const upd = await db.execute(sql.raw(updateSql))
    console.log(`  Updated: ${(upd as any).count ?? 'ok'}`)
  }

  // 4. Fix UNKNOWN plate_number using resolved_plate from vehicle sheet
  // Note: step 3 already updates plate_number via COALESCE, but this catches
  // records that were previously inserted with UNKNOWN_ and not matched in step 3
  console.log('[4/6] Fix UNKNOWN plates...')
  const fixUnknownSql = `
    UPDATE vehicle_badges vb SET
      plate_number = t.resolved_plate,
      updated_at = NOW()
    FROM _tmp_badges t
    WHERE vb.firebase_id = t.firebase_id
      AND vb.plate_number LIKE 'UNKNOWN_%'
      AND t.resolved_plate IS NOT NULL
  `
  if (isDryRun) {
    const countRes = await db.execute(sql.raw(`
      SELECT COUNT(*) as cnt FROM vehicle_badges vb
      JOIN _tmp_badges t ON vb.firebase_id = t.firebase_id
      WHERE vb.plate_number LIKE 'UNKNOWN_%' AND t.resolved_plate IS NOT NULL
    `))
    console.log(`  [DRY] Would fix: ${(countRes as any)[0]?.cnt || 0} UNKNOWN plates`)
  } else {
    const fix = await db.execute(sql.raw(fixUnknownSql))
    console.log(`  Fixed: ${(fix as any).count ?? 'ok'} UNKNOWN plates`)
  }

  // 5. Bulk INSERT new records
  console.log('[5/6] Bulk insert new...')
  const insertSql = `
    INSERT INTO vehicle_badges (
      firebase_id, badge_number, plate_number, vehicle_id, badge_type,
      route_id, route_code, route_name,
      issue_date, expiry_date, status, is_active, metadata, source, synced_at, created_at, updated_at
    )
    SELECT
      t.firebase_id, t.badge_number,
      COALESCE(t.resolved_plate, v.plate_number, 'UNKNOWN_' || COALESCE(t.vehicle_fb_ref, 'NONE')),
      im.postgres_id::uuid,
      t.badge_type,
      t.resolved_route_id,
      NULLIF(t.resolved_route_code, ''),
      NULLIF(t.resolved_route_name, ''),
      NULLIF(t.issue_date, '')::date, NULLIF(t.expiry_date, '')::date, t.status, t.is_active,
      t.metadata, 'sheet_sync', NOW(), NOW(), NOW()
    FROM _tmp_badges t
    LEFT JOIN id_mappings im ON im.firebase_id = t.vehicle_fb_ref AND im.entity_type = 'vehicles'
    LEFT JOIN vehicles v ON v.id = im.postgres_id::uuid
    WHERE NOT EXISTS (SELECT 1 FROM vehicle_badges vb WHERE vb.firebase_id = t.firebase_id)
  `
  if (isDryRun) {
    const countRes = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM _tmp_badges t WHERE NOT EXISTS (SELECT 1 FROM vehicle_badges vb WHERE vb.firebase_id = t.firebase_id)`))
    console.log(`  [DRY] Would insert: ${(countRes as any)[0]?.cnt || 0}`)
  } else {
    const ins = await db.execute(sql.raw(insertSql))
    console.log(`  Inserted: ${(ins as any).count ?? 'ok'}`)
  }

  // 6. Summary
  console.log('[6/6] Summary...')
  await db.execute(sql.raw(`DROP TABLE IF EXISTS _tmp_badges`))
  const total = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM vehicle_badges`))
  const unknown = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM vehicle_badges WHERE plate_number LIKE 'UNKNOWN_%'`))
  const nullDates = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM vehicle_badges WHERE issue_date IS NULL AND expiry_date IS NULL`))
  console.log(`\nDone!`)
  console.log(`  Total badges: ${(total as any)[0]?.cnt}`)
  console.log(`  Remaining UNKNOWN plates: ${(unknown as any)[0]?.cnt}`)
  console.log(`  Records with NULL dates: ${(nullDates as any)[0]?.cnt}`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
