/**
 * Fix seat_count and bed_capacity from Google Sheets SoCho column
 *
 * SoCho format examples:
 *   "2 người" | "15 ngườ" | "6 Người" → seats=N, beds=0
 *   "45" | "01" | "02"                 → seats=N, beds=0
 *   "1/40" | "01/44" | "2/43 người"   → seats=X, beds=Y
 *   "0" | ""                           → skip
 *
 * Usage: npx tsx fix-seat-bed-from-sheet.ts [--dry-run]
 */
import 'dotenv/config'
import { db } from '../../drizzle'
import { vehicles } from '../../schema'
import { sql } from 'drizzle-orm'

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1hh1GKMiEXKb2KBYpyvzpqYuyc1Khzfjdxv2YMfIZ7cI/export?format=csv&gid=40001005'

interface ParsedSoCho {
  seats: number
  beds: number | null // null = don't touch bed_capacity (no bed data in SoCho)
}

/** Parse SoCho string into seats + beds */
function parseSoCho(raw: string): ParsedSoCho | null {
  if (!raw || raw.trim() === '' || raw.trim() === '0') return null

  // Strip suffix: "người", "ngườ", "Người"
  const cleaned = raw.trim().replace(/\s*(người|ngườ|Người)\s*$/i, '').trim()

  if (cleaned.includes('/')) {
    const [left, right] = cleaned.split('/')
    const seats = parseInt(left, 10)
    const beds = parseInt(right, 10)
    if (isNaN(seats) || isNaN(beds)) return null
    return { seats, beds }
  }

  const seats = parseInt(cleaned, 10)
  if (isNaN(seats)) return null
  return { seats, beds: null } // No bed info in pure seat count
}

/** Simple CSV parser - handles quoted fields with commas */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  const parseRow = (line: string): string[] => {
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
    fields.push(current)
    return fields
  }

  const headers = parseRow(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseRow(line)
    const record: Record<string, string> = {}
    headers.forEach((h, i) => (record[h] = values[i] || ''))
    return record
  })
}

/** Normalize plate: uppercase, remove spaces/dots/dashes */
function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/[\s.\-]/g, '')
}

async function fetchSheetCSV(): Promise<string> {
  const res = await fetch(SHEET_CSV_URL)
  if (!res.ok) throw new Error(`Failed to fetch sheet: ${res.status}`)
  return res.text()
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  if (!db) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  console.log(`=== Fix seat_count & bed_capacity from Sheet ===`)
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE UPDATE'}`)

  // Step 1: Fetch CSV
  console.log('\nFetching CSV from Google Sheets...')
  const csvText = await fetchSheetCSV()
  const records = parseCSV(csvText)
  console.log(`Loaded ${records.length} rows from sheet`)

  // Step 2: Load all vehicles from DB in one query (build lookup maps)
  console.log('Loading vehicles from DB...')
  const allVehicles = await db
    .select({
      id: vehicles.id,
      plateNumber: vehicles.plateNumber,
      firebaseId: vehicles.firebaseId,
      seatCount: vehicles.seatCount,
      bedCapacity: vehicles.bedCapacity,
    })
    .from(vehicles)

  const byPlate = new Map<string, (typeof allVehicles)[0]>()
  const byFirebaseId = new Map<string, (typeof allVehicles)[0]>()
  for (const v of allVehicles) {
    if (v.plateNumber) byPlate.set(v.plateNumber, v)
    if (v.firebaseId) byFirebaseId.set(v.firebaseId, v)
  }
  console.log(`Loaded ${allVehicles.length} vehicles (plate: ${byPlate.size}, fbId: ${byFirebaseId.size})`)

  // Step 3: Match & compute updates
  let skipped = 0
  let notFound = 0
  let noChange = 0
  const seatOnlyUpdates: { id: string; seats: number }[] = []
  const seatBedUpdates: { id: string; seats: number; beds: number }[] = []
  const dryLogs: string[] = []

  for (const row of records) {
    const firebaseId = row['IDXe']?.trim()
    const rawPlate = row['BienSo']?.trim()
    const rawSoCho = row['SoCho']?.trim()

    if (!firebaseId && !rawPlate) { skipped++; continue }

    const parsed = parseSoCho(rawSoCho || '')
    if (!parsed) { skipped++; continue }

    // Match: plate first, then firebase_id
    const plate = rawPlate ? normalizePlate(rawPlate) : ''
    const vehicle = (plate && byPlate.get(plate)) || (firebaseId && byFirebaseId.get(firebaseId)) || null

    if (!vehicle) { notFound++; continue }

    const seatChanged = vehicle.seatCount !== parsed.seats
    const bedChanged = parsed.beds !== null && vehicle.bedCapacity !== parsed.beds

    if (!seatChanged && !bedChanged) { noChange++; continue }

    if (parsed.beds !== null && bedChanged) {
      seatBedUpdates.push({ id: vehicle.id, seats: parsed.seats, beds: parsed.beds })
    } else if (seatChanged) {
      seatOnlyUpdates.push({ id: vehicle.id, seats: parsed.seats })
    } else {
      noChange++
      continue
    }

    if (isDryRun) {
      const seatMsg = seatChanged ? `seat ${vehicle.seatCount}→${parsed.seats}` : ''
      const bedMsg = bedChanged ? `bed ${vehicle.bedCapacity}→${parsed.beds}` : ''
      dryLogs.push(`  [DRY] ${firebaseId || rawPlate}: ${[seatMsg, bedMsg].filter(Boolean).join(', ')} (raw: "${rawSoCho}")`)
    }
  }

  const totalUpdates = seatOnlyUpdates.length + seatBedUpdates.length

  if (isDryRun) {
    dryLogs.forEach((l) => console.log(l))
  } else if (totalUpdates > 0) {
    // Step 4: Batch UPDATE via raw SQL using CASE expressions
    console.log(`\nExecuting batch updates...`)
    const BATCH_SIZE = 500

    // Seat-only updates
    for (let i = 0; i < seatOnlyUpdates.length; i += BATCH_SIZE) {
      const batch = seatOnlyUpdates.slice(i, i + BATCH_SIZE)
      const ids = batch.map((u) => `'${u.id}'`).join(',')
      const seatCases = batch.map((u) => `WHEN '${u.id}' THEN ${u.seats}`).join(' ')
      await db.execute(sql.raw(
        `UPDATE vehicles SET seat_count = CASE id ${seatCases} END, updated_at = NOW() WHERE id IN (${ids})`
      ))
      console.log(`  Seat-only batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} rows`)
    }

    // Seat+bed updates
    for (let i = 0; i < seatBedUpdates.length; i += BATCH_SIZE) {
      const batch = seatBedUpdates.slice(i, i + BATCH_SIZE)
      const ids = batch.map((u) => `'${u.id}'`).join(',')
      const seatCases = batch.map((u) => `WHEN '${u.id}' THEN ${u.seats}`).join(' ')
      const bedCases = batch.map((u) => `WHEN '${u.id}' THEN ${u.beds}`).join(' ')
      await db.execute(sql.raw(
        `UPDATE vehicles SET seat_count = CASE id ${seatCases} END, bed_capacity = CASE id ${bedCases} END, updated_at = NOW() WHERE id IN (${ids})`
      ))
      console.log(`  Seat+bed batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} rows`)
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Updated: ${totalUpdates} (seat-only: ${seatOnlyUpdates.length}, seat+bed: ${seatBedUpdates.length})`)
  console.log(`No change needed: ${noChange}`)
  console.log(`Skipped (empty/zero SoCho): ${skipped}`)
  console.log(`Not found in DB: ${notFound}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
