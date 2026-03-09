/**
 * Sync operation_notices from Google Sheet CSV (THONGBAO_KHAITHAC)
 * Usage: npx tsx sync-operation-notices-from-sheet.ts [--dry-run]
 */
import 'dotenv/config'
import { db } from '../../drizzle.js'
import { operationNotices } from '../../schema/index.js'
import { sql } from 'drizzle-orm'

const SHEET_ID = '1hh1GKMiEXKb2KBYpyvzpqYuyc1Khzfjdxv2YMfIZ7cI'
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=1033980793`

interface SheetRow {
  ID_TB: string; Ref_Tuyen: string; Ref_DonVi: string; SoThongBao: string
  NgayBanHanh: string; NgayBatDau: string; File: string; 'link file': string
  CQBanHanh: string; TrangThai: string; GhiChu: string; User: string
  ThoiGianNhap: string; LoaiTB: string
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
const esc = (s: string | null): string => s === null ? 'NULL' : `'${s.replace(/'/g, "''")}'`

async function main() {
  const isDryRun = process.argv.includes('--dry-run')
  if (!db) { console.error('DATABASE_URL not set'); process.exit(1) }
  console.log(`=== Sync operation_notices ===\nMode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`)

  // 1. Fetch CSV
  console.log('\n[1/4] Fetching CSV...')
  const response = await fetch(SHEET_URL, { redirect: 'follow' })
  if (!response.ok) throw new Error(`CSV fetch failed: ${response.status}`)
  const csvText = await response.text()
  if (csvText.trimStart().startsWith('<')) throw new Error('CSV response is HTML — check sheet permissions')

  const rows = parseCSV<SheetRow>(csvText)
  console.log(`  Total rows: ${rows.length}`)

  // 2. Filter & map
  console.log('[2/4] Processing rows...')
  let skipped = 0
  const records: Array<{
    routeCode: string; operatorRef: string | null; noticeNumber: string
    issueDate: string | null; effectiveDate: string | null; filePath: string | null
    fileUrl: string | null; issuingAuthority: string | null; status: string | null
    noticeType: string | null
  }> = []

  for (const row of rows) {
    const routeCode = (row.Ref_Tuyen || '').trim()
    const noticeNumber = (row.SoThongBao || '').trim()
    const fileUrl = (row['link file'] || '').trim()

    // Skip rows without required fields
    if (!routeCode || !noticeNumber) { skipped++; continue }
    if (!fileUrl) { skipped++; continue }

    records.push({
      routeCode,
      operatorRef: row.Ref_DonVi?.trim() || null,
      noticeNumber,
      issueDate: row.NgayBanHanh?.trim() || null,
      effectiveDate: row.NgayBatDau?.trim() || null,
      filePath: row.File?.trim() || null,
      fileUrl,
      issuingAuthority: row.CQBanHanh?.trim() || null,
      status: row.TrangThai?.trim() || null,
      noticeType: row.LoaiTB?.trim() || null,
    })
  }
  console.log(`  Valid records: ${records.length}, Skipped: ${skipped}`)

  if (isDryRun) {
    console.log('\n[DRY RUN] Would upsert these records:')
    records.slice(0, 5).forEach(r => console.log(`  ${r.routeCode} | ${r.noticeNumber} | ${r.fileUrl?.substring(0, 60)}...`))
    if (records.length > 5) console.log(`  ... and ${records.length - 5} more`)
    return
  }

  // 3. Bulk upsert using temp table approach
  console.log('[3/4] Upserting records...')
  await db.execute(sql.raw(`DROP TABLE IF EXISTS _tmp_notices`))
  await db.execute(sql.raw(`
    CREATE TEMP TABLE _tmp_notices (
      route_code TEXT NOT NULL,
      operator_ref TEXT,
      notice_number TEXT NOT NULL,
      issue_date TEXT,
      effective_date TEXT,
      file_path TEXT,
      file_url TEXT,
      issuing_authority TEXT,
      status TEXT,
      notice_type TEXT
    )
  `))

  // Insert in chunks of 200
  const CHUNK = 200
  let inserted = 0
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK)
    const values = chunk.map(r =>
      `(${esc(r.routeCode)},${esc(r.operatorRef)},${esc(r.noticeNumber)},` +
      `${esc(r.issueDate)},${esc(r.effectiveDate)},${esc(r.filePath)},` +
      `${esc(r.fileUrl)},${esc(r.issuingAuthority)},${esc(r.status)},${esc(r.noticeType)})`
    ).join(',')
    await db.execute(sql.raw(`INSERT INTO _tmp_notices VALUES ${values}`))
    inserted += chunk.length
  }
  console.log(`  Inserted ${inserted} rows into temp table`)

  // Upsert: UPDATE existing + INSERT new
  const updateResult = await db.execute(sql.raw(`
    UPDATE operation_notices on2 SET
      operator_ref = t.operator_ref,
      issue_date = t.issue_date,
      effective_date = t.effective_date,
      file_path = t.file_path,
      file_url = t.file_url,
      issuing_authority = t.issuing_authority,
      status = t.status,
      notice_type = t.notice_type,
      updated_at = NOW()
    FROM _tmp_notices t
    WHERE on2.route_code = t.route_code AND on2.notice_number = t.notice_number
  `))
  console.log(`  Updated existing: ${(updateResult as any).count ?? 'ok'}`)

  const insertResult = await db.execute(sql.raw(`
    INSERT INTO operation_notices (route_code, operator_ref, notice_number, issue_date, effective_date, file_path, file_url, issuing_authority, status, notice_type)
    SELECT t.route_code, t.operator_ref, t.notice_number, t.issue_date, t.effective_date, t.file_path, t.file_url, t.issuing_authority, t.status, t.notice_type
    FROM _tmp_notices t
    WHERE NOT EXISTS (
      SELECT 1 FROM operation_notices on2
      WHERE on2.route_code = t.route_code AND on2.notice_number = t.notice_number
    )
  `))
  console.log(`  Inserted new: ${(insertResult as any).count ?? 'ok'}`)

  await db.execute(sql.raw(`DROP TABLE IF EXISTS _tmp_notices`))

  // 4. Summary
  console.log('[4/4] Summary...')
  const total = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM operation_notices`))
  const withUrl = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM operation_notices WHERE file_url IS NOT NULL AND file_url != ''`))
  console.log(`\nDone!`)
  console.log(`  Total notices: ${(total as any)[0]?.cnt}`)
  console.log(`  With file URL: ${(withUrl as any)[0]?.cnt}`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
