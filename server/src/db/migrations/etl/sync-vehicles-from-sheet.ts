/**
 * Sync vehicles from Google Sheet CSV (tab "Xe", gid=40001005) to Supabase vehicles table.
 * - Fetches sheet, maps columns, upserts via temp table bulk approach
 * - Does NOT update operator_id or vehicle_type_id (resolved separately)
 * Usage: npx tsx sync-vehicles-from-sheet.ts [--dry-run] [--force-overwrite]
 *   --force-overwrite: Overwrite ALL data fields from Sheet (instead of COALESCE).
 *                      FK fields (operator_id, vehicle_type_id) are always preserved.
 */
import 'dotenv/config'
import { db } from '../../drizzle.js'
import { sql } from 'drizzle-orm'

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1hh1GKMiEXKb2KBYpyvzpqYuyc1Khzfjdxv2YMfIZ7cI/export?format=csv&gid=40001005'

interface SheetRow {
  IDXe: string; BienSo: string; TenDangKyXe: string; NhanHieu: string
  LoaiXe: string; SoKhung: string; SoMay: string; SoCho: string; SoGiuong: string
  MauSon: string; NamSanXuat: string; DiaChiChuXe: string; TaiTrong: string
  NienHan: string; Nienhan: string; LoaiPhuongTien: string
  LaBienDinhDanh: string; TrangThaiBienDinhDanh: string; LyDoThuBienDinhDanh: string
  ThongTinDangKyXe: string; CoKDVT: string
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

/** Escape string for SQL literal */
const esc = (s: string | null | undefined): string =>
  s == null || s === '' ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`

interface ParsedSoCho { seats: number; beds: number | null }

/**
 * Parse SoCho -> { seats, beds }
 * "2 người" | "15 ngườ" | "45" | "01" → seats=N, beds=null (no bed data)
 * "1/40" | "01/44" → beds=left, seats=right
 * "0" | ""        → null (skip)
 */
function parseSoCho(raw: string): ParsedSoCho | null {
  if (!raw || raw.trim() === '' || raw.trim() === '0') return null
  const cleaned = raw.trim().replace(/\s*(người|ngườ|Người)\s*$/i, '').trim()
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/')
    const beds = parseInt(parts[0], 10)
    // right part may have suffix like "43 người" — strip again
    const rightCleaned = parts[1].replace(/\s*(người|ngườ|Người)\s*$/i, '').trim()
    const seats = parseInt(rightCleaned, 10)
    if (isNaN(beds) || isNaN(seats)) return null
    return { seats, beds }
  }
  const seats = parseInt(cleaned, 10)
  if (isNaN(seats) || seats === 0) return null
  return { seats, beds: null }
}

/** Build metadata JSONB object for extra fields */
function buildMeta(r: SheetRow): Record<string, string> {
  const m: Record<string, string> = {}
  if (r.LoaiXe) m.vehicle_type_label = r.LoaiXe
  if (r.DiaChiChuXe) m.owner_address = r.DiaChiChuXe
  if (r.TaiTrong) m.payload_capacity = r.TaiTrong
  const nienHan = r.NienHan || r.Nienhan
  if (nienHan) m.registration_term = nienHan
  if (r.LoaiPhuongTien) m.vehicle_category = r.LoaiPhuongTien
  if (r.LaBienDinhDanh) m.is_numbered_plate = r.LaBienDinhDanh
  if (r.TrangThaiBienDinhDanh) m.numbered_plate_status = r.TrangThaiBienDinhDanh
  if (r.LyDoThuBienDinhDanh) m.numbered_plate_revoke_reason = r.LyDoThuBienDinhDanh
  if (r.ThongTinDangKyXe) m.registration_info = r.ThongTinDangKyXe
  if (r.CoKDVT) m.has_transport_license = r.CoKDVT
  if (r.TenDangKyXe) m.registration_name = r.TenDangKyXe
  return m
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run')
  const isForceOverwrite = process.argv.includes('--force-overwrite')
  if (!db) { console.error('DATABASE_URL not set'); process.exit(1) }
  const modeLabel = [isForceOverwrite ? 'FORCE OVERWRITE' : 'INCREMENTAL', isDryRun ? '(DRY RUN)' : '(LIVE)'].join(' ')
  console.log(`=== Sync vehicles from Sheet ===\nMode: ${modeLabel}`)

  // Step 1: Fetch CSV
  console.log('\n[1/6] Fetching CSV...')
  const res = await fetch(SHEET_CSV_URL)
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`)
  const csvText = await res.text()
  if (csvText.trimStart().startsWith('<')) throw new Error('Response is HTML, not CSV — check sheet permissions')

  const allRows = parseCSV<SheetRow>(csvText)
  const rows = allRows.filter(r => r.IDXe && r.BienSo)
  console.log(`  Total rows: ${allRows.length}, valid (have IDXe+BienSo): ${rows.length}`)

  // Step 2: Parse rows
  console.log('[2/6] Parsing rows...')
  let skippedSoCho = 0
  type MappedRow = {
    firebase_id: string; plate_number: string; operator_name: string | null; brand: string | null
    chassis_number: string | null; engine_number: string | null; color: string | null
    year_of_manufacture: number | null; seat_count: number | null; bed_capacity: number | null
    has_bed_data: boolean; metadata: Record<string, string>
  }
  const mapped: MappedRow[] = rows.map(r => {
    const soCho = parseSoCho(r.SoCho || '')
    if (!soCho) skippedSoCho++
    const soGiuong = r.SoGiuong ? parseInt(r.SoGiuong, 10) : NaN
    const yearRaw = parseInt(r.NamSanXuat, 10)
    const meta = buildMeta(r)

    const seatCount: number | null = soCho ? soCho.seats : null
    // SoGiuong overrides bed_capacity if > 0; fallback to SoCho beds
    const bedFromGiuong = !isNaN(soGiuong) && soGiuong > 0 ? soGiuong : null
    const bedCapacity: number | null = bedFromGiuong ?? soCho?.beds ?? null
    const hasBedData = bedCapacity !== null

    return {
      firebase_id: r.IDXe.trim(),
      plate_number: r.BienSo.trim().substring(0, 20),
      operator_name: null,  // TenDangKyXe is a classification code, not operator name; stored in metadata.registration_name
      brand: r.NhanHieu || null,
      chassis_number: r.SoKhung || null,
      engine_number: r.SoMay || null,
      color: r.MauSon || null,
      year_of_manufacture: !isNaN(yearRaw) && yearRaw > 1900 ? yearRaw : null,
      seat_count: seatCount,
      bed_capacity: bedCapacity,
      has_bed_data: hasBedData,
      metadata: meta,
    }
  })
  console.log(`  Parsed: ${mapped.length}, SoCho skipped (empty/zero): ${skippedSoCho}`)

  // Step 3: Create temp table
  console.log('[3/6] Creating temp table...')
  await db.execute(sql.raw(`DROP TABLE IF EXISTS _tmp_vehicles`))
  await db.execute(sql.raw(`
    CREATE TEMP TABLE _tmp_vehicles (
      firebase_id TEXT PRIMARY KEY,
      plate_number TEXT,
      operator_name TEXT,
      brand TEXT,
      chassis_number TEXT,
      engine_number TEXT,
      color TEXT,
      year_of_manufacture INT,
      seat_count INT,
      bed_capacity INT,
      has_bed_data BOOLEAN,
      metadata JSONB
    )
  `))

  const CHUNK = 500
  let insertedTmp = 0
  for (let i = 0; i < mapped.length; i += CHUNK) {
    const chunk = mapped.slice(i, i + CHUNK)
    const values = chunk.map(r =>
      `(${esc(r.firebase_id)},${esc(r.plate_number)},${esc(r.operator_name)},` +
      `${esc(r.brand)},${esc(r.chassis_number)},${esc(r.engine_number)},` +
      `${esc(r.color)},${r.year_of_manufacture ?? 'NULL'},` +
      `${r.seat_count ?? 'NULL'},${r.bed_capacity ?? 'NULL'},${r.has_bed_data},` +
      `${esc(JSON.stringify(r.metadata))})`
    ).join(',')
    await db.execute(sql.raw(`INSERT INTO _tmp_vehicles VALUES ${values}`))
    insertedTmp += chunk.length
  }
  console.log(`  Inserted ${insertedTmp} rows into temp table`)

  // Step 4: Detect plate_number conflicts (force-overwrite only)
  let conflictIds: string[] = []
  if (isForceOverwrite) {
    console.log('[3.5/6] Detecting plate_number conflicts...')
    const conflicts = await db.execute(sql.raw(`
      SELECT t.firebase_id, t.plate_number AS new_plate, v.plate_number AS old_plate, v2.firebase_id AS conflict_fid
      FROM _tmp_vehicles t
      JOIN vehicles v ON v.firebase_id = t.firebase_id
      JOIN vehicles v2 ON v2.plate_number = t.plate_number AND v2.firebase_id != t.firebase_id
      WHERE t.plate_number != v.plate_number
    `))
    const conflictRows = conflicts as any[]
    if (conflictRows.length > 0) {
      conflictIds = conflictRows.map((r: any) => r.firebase_id)
      console.warn(`  ⚠ ${conflictRows.length} plate conflicts found (plate update skipped for these):`)
      conflictRows.slice(0, 10).forEach((r: any) =>
        console.warn(`    ${r.firebase_id}: ${r.old_plate} → ${r.new_plate} (conflicts with ${r.conflict_fid})`)
      )
      if (conflictRows.length > 10) console.warn(`    ... and ${conflictRows.length - 10} more`)
    } else {
      console.log('  No plate conflicts detected')
    }
  }

  // Step 5: Bulk UPDATE existing vehicles
  // Force-overwrite: 2 queries (data fields first, then plate_number separately for safety)
  // Normal sync: COALESCE (only fill empty fields)
  console.log('[4/6] Bulk update existing vehicles...')

  if (isForceOverwrite) {
    // Query 1: Update ALL data fields EXCEPT plate_number (always safe, no UNIQUE conflicts)
    const updateDataSql = `
      UPDATE vehicles v SET
        operator_name = t.operator_name,
        brand = t.brand,
        chassis_number = t.chassis_number,
        engine_number = t.engine_number,
        color = t.color,
        year_of_manufacture = t.year_of_manufacture,
        seat_count = t.seat_count,
        bed_capacity = t.bed_capacity,
        metadata = COALESCE(v.metadata, '{}'::jsonb) || t.metadata,
        source = 'sheet_sync',
        synced_at = NOW(),
        updated_at = NOW()
      FROM _tmp_vehicles t
      WHERE v.firebase_id = t.firebase_id
    `
    // Query 2: Update plate_number only where safe (no duplicates in temp, no conflicts with other vehicles)
    const updatePlateSql = `
      UPDATE vehicles v SET
        plate_number = t.plate_number
      FROM _tmp_vehicles t
      WHERE v.firebase_id = t.firebase_id
        AND v.plate_number != t.plate_number
        AND NOT EXISTS (
          SELECT 1 FROM vehicles v2
          WHERE v2.plate_number = t.plate_number AND v2.id != v.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM _tmp_vehicles t2
          WHERE t2.plate_number = t.plate_number AND t2.firebase_id != t.firebase_id
        )
    `
    if (isDryRun) {
      const cnt = await db.execute(sql.raw(
        `SELECT COUNT(*) as cnt FROM vehicles v JOIN _tmp_vehicles t ON v.firebase_id = t.firebase_id`
      ))
      const plateCnt = await db.execute(sql.raw(
        `SELECT COUNT(*) as cnt FROM vehicles v JOIN _tmp_vehicles t ON v.firebase_id = t.firebase_id
         WHERE v.plate_number != t.plate_number
         AND NOT EXISTS (SELECT 1 FROM vehicles v2 WHERE v2.plate_number = t.plate_number AND v2.id != v.id)
         AND NOT EXISTS (SELECT 1 FROM _tmp_vehicles t2 WHERE t2.plate_number = t.plate_number AND t2.firebase_id != t.firebase_id)`
      ))
      console.log(`  [DRY] Would update data fields: ${(cnt as any)[0]?.cnt || 0}`)
      console.log(`  [DRY] Would update plate_number: ${(plateCnt as any)[0]?.cnt || 0}`)
    } else {
      const upd = await db.execute(sql.raw(updateDataSql))
      console.log(`  Updated data fields: ${(upd as any).count ?? 'ok'}`)
      const updPlate = await db.execute(sql.raw(updatePlateSql))
      console.log(`  Updated plate_number: ${(updPlate as any).count ?? 'ok'}`)
    }
  } else {
    const updateSql = `
      UPDATE vehicles v SET
        operator_name = COALESCE(NULLIF(t.operator_name, ''), v.operator_name),
        brand = COALESCE(NULLIF(t.brand, ''), v.brand),
        chassis_number = COALESCE(NULLIF(t.chassis_number, ''), v.chassis_number),
        engine_number = COALESCE(NULLIF(t.engine_number, ''), v.engine_number),
        color = COALESCE(NULLIF(t.color, ''), v.color),
        year_of_manufacture = COALESCE(t.year_of_manufacture, v.year_of_manufacture),
        seat_count = CASE WHEN t.seat_count IS NOT NULL THEN t.seat_count ELSE v.seat_count END,
        bed_capacity = CASE WHEN t.has_bed_data THEN t.bed_capacity ELSE v.bed_capacity END,
        metadata = COALESCE(v.metadata, '{}'::jsonb) || t.metadata,
        source = 'sheet_sync',
        synced_at = NOW(),
        updated_at = NOW()
      FROM _tmp_vehicles t
      WHERE v.firebase_id = t.firebase_id
    `
    if (isDryRun) {
      const cnt = await db.execute(sql.raw(
        `SELECT COUNT(*) as cnt FROM vehicles v JOIN _tmp_vehicles t ON v.firebase_id = t.firebase_id`
      ))
      console.log(`  [DRY] Would update: ${(cnt as any)[0]?.cnt || 0}`)
    } else {
      const upd = await db.execute(sql.raw(updateSql))
      console.log(`  Updated: ${(upd as any).count ?? 'ok'}`)
    }
  }

  // Step 6: Bulk INSERT new vehicles (not existing by firebase_id)
  console.log('[5/6] Bulk insert new vehicles...')
  const insertSql = `
    INSERT INTO vehicles (
      firebase_id, plate_number, operator_name, brand,
      chassis_number, engine_number, color, year_of_manufacture,
      seat_count, bed_capacity, metadata, source, synced_at, created_at, updated_at
    )
    SELECT
      t.firebase_id, t.plate_number, t.operator_name, t.brand,
      t.chassis_number, t.engine_number, t.color, t.year_of_manufacture,
      t.seat_count, t.bed_capacity, t.metadata, 'sheet_sync', NOW(), NOW(), NOW()
    FROM _tmp_vehicles t
    WHERE NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.firebase_id = t.firebase_id)
      AND NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.plate_number = t.plate_number)
      AND t.plate_number IS NOT NULL AND t.plate_number != ''
    ON CONFLICT (plate_number) DO NOTHING
  `
  if (isDryRun) {
    const cnt = await db.execute(sql.raw(
      `SELECT COUNT(*) as cnt FROM _tmp_vehicles t WHERE NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.firebase_id = t.firebase_id)`
    ))
    console.log(`  [DRY] Would insert: ${(cnt as any)[0]?.cnt || 0}`)
  } else {
    const ins = await db.execute(sql.raw(insertSql))
    console.log(`  Inserted: ${(ins as any).count ?? 'ok'}`)
  }

  // Step 7: Summary
  console.log('[6/6] Summary...')
  await db.execute(sql.raw(`DROP TABLE IF EXISTS _tmp_vehicles`))
  const total = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM vehicles`))
  const synced = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM vehicles WHERE source = 'sheet_sync'`))
  const noSeat = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM vehicles WHERE seat_count IS NULL`))
  console.log(`\nDone! (${isForceOverwrite ? 'FORCE OVERWRITE' : 'INCREMENTAL'})`)
  console.log(`  Total vehicles in DB: ${(total as any)[0]?.cnt}`)
  console.log(`  Synced from sheet: ${(synced as any)[0]?.cnt}`)
  console.log(`  Missing seat_count: ${(noSeat as any)[0]?.cnt}`)
  if (isForceOverwrite && conflictIds.length > 0) {
    console.log(`  Plate conflicts skipped: ${conflictIds.length}`)
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
