/**
 * Import Operators from Firebase Export
 * Level 1: No dependencies
 */
import { db } from '../../drizzle'
import { operators } from '../../schema'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  storeIdMapping,
  cleanPhoneNumber,
  parseBoolean,
  parseDate,
  logProgress,
  ensureDbInitialized,
} from './etl-helpers'

interface FirebaseOperator {
  _firebase_id: string
  id: string
  code?: string
  name?: string
  short_name?: string
  address?: string
  phone?: string
  email?: string
  tax_code?: string
  representative?: string
  business_license?: string
  is_active?: boolean | string
  metadata?: Record<string, unknown>
  synced_at?: string
  source?: string
  created_at?: string
  updated_at?: string
  // Alternative field names from datasheet (Vietnamese)
  DONVIVANTAI?: string
  ten_dvvt?: string
  TENDV?: string
  ten_dv?: string
  DIADV?: string
  dia_chi?: string
  DIENTHOAI?: string
  so_dien_thoai?: string
}

export async function importOperators(exportDir: string): Promise<number> {
  ensureDbInitialized()

  // Try both operators.json and datasheet_operators.json
  const operatorsFile = join(exportDir, 'operators.json')
  const datasheetFile = join(exportDir, 'datasheet_operators.json')

  let data: FirebaseOperator[] = []

  // Load operators.json (app-created, small)
  if (existsSync(operatorsFile)) {
    try {
      const appOperators = JSON.parse(readFileSync(operatorsFile, 'utf-8'))
      data = data.concat(appOperators)
      console.log(`  Loaded ${appOperators.length} operators from operators.json`)
    } catch {
      console.log('  ⚠ Failed to read operators.json')
    }
  }

  // Load datasheet_operators.json (datasheet, large)
  if (existsSync(datasheetFile)) {
    try {
      const datasheetOperators = JSON.parse(readFileSync(datasheetFile, 'utf-8'))
      data = data.concat(datasheetOperators)
      console.log(`  Loaded ${datasheetOperators.length} operators from datasheet_operators.json`)
    } catch {
      console.log('  ⚠ Failed to read datasheet_operators.json')
    }
  }

  if (data.length === 0) {
    console.log('  ⚠ No operators data found, skipping...')
    return 0
  }

  console.log(`  Importing ${data.length} operators total...`)

  let imported = 0
  let skipped = 0

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    try {
      // Extract name from various possible fields
      const name = item.name || item.TENDV || item.ten_dv || item.DONVIVANTAI || item.ten_dvvt || `Operator_${item.id}`

      // Generate code from various sources, normalize to uppercase
      const rawCode = item.code || item.DONVIVANTAI || item.ten_dvvt || item.id
      const code = rawCode.trim().toUpperCase().substring(0, 50)

      const [inserted] = await db!.insert(operators).values({
        firebaseId: item._firebase_id || item.id,
        code: code,
        name: name.substring(0, 255),
        shortName: item.short_name?.substring(0, 100) || null,
        address: item.address || item.DIADV || item.dia_chi || null,
        phone: cleanPhoneNumber(item.phone || item.DIENTHOAI || item.so_dien_thoai),
        email: item.email?.substring(0, 255) || null,
        taxCode: item.tax_code?.substring(0, 20) || null,
        representative: item.representative?.substring(0, 255) || null,
        businessLicense: item.business_license?.substring(0, 100) || null,
        isActive: parseBoolean(item.is_active),
        metadata: item.metadata || null,
        syncedAt: parseDate(item.synced_at),
        source: item.source?.substring(0, 50) || 'firebase_migration',
        createdAt: parseDate(item.created_at) || new Date(),
        updatedAt: parseDate(item.updated_at) || new Date(),
      }).returning()

      await storeIdMapping(item._firebase_id || item.id, inserted.id, 'operators')
      imported++
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      // Skip duplicates silently
      if (message.includes('duplicate')) {
        skipped++
      } else {
        console.log(`\n  ✗ Failed: ${item.id} - ${message}`)
        skipped++
      }
    }

    if (i % 100 === 0) {
      logProgress(i + 1, data.length, 'operators')
    }
  }

  console.log(`\n  ✓ Operators: ${imported} imported, ${skipped} skipped`)
  return imported
}
