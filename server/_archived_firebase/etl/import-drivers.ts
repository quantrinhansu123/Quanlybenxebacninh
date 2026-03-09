/**
 * Import Drivers from Firebase Export
 * Level 2: Depends on operators
 */
import { db } from '../../drizzle'
import { drivers } from '../../schema'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  storeIdMapping,
  getPostgresId,
  cleanPhoneNumber,
  parseBoolean,
  parseDate,
  logProgress,
  ensureDbInitialized,
  logInvalidFK,
} from './etl-helpers'

interface FirebaseDriver {
  _firebase_id: string
  id: string
  full_name?: string
  phone?: string
  license_number?: string
  license_expiry?: string
  operator_id?: string
  is_active?: boolean | string
  created_at?: string
  updated_at?: string
}

export async function importDrivers(exportDir: string): Promise<number> {
  ensureDbInitialized()

  const filePath = join(exportDir, 'drivers.json')
  let data: FirebaseDriver[]

  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    console.log('  ⚠ drivers.json not found, skipping...')
    return 0
  }

  console.log(`  Importing ${data.length} drivers...`)

  let imported = 0
  let skipped = 0

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    try {
      const operatorId = await getPostgresId(item.operator_id, 'operators')

      // Log invalid FK
      if (item.operator_id && !operatorId) {
        await logInvalidFK(exportDir, 'drivers', item.id, 'operator_id', item.operator_id, 'operators')
      }

      const [inserted] = await db!.insert(drivers).values({
        firebaseId: item._firebase_id || item.id,
        name: (item.full_name || `Driver_${item.id}`).substring(0, 255),
        phone: cleanPhoneNumber(item.phone),
        licenseNumber: item.license_number?.substring(0, 50) || null,
        licenseExpiry: item.license_expiry || null,
        operatorId,
        isActive: parseBoolean(item.is_active),
        createdAt: parseDate(item.created_at) || new Date(),
        updatedAt: parseDate(item.updated_at) || new Date(),
      }).returning()

      await storeIdMapping(item._firebase_id || item.id, inserted.id, 'drivers')
      imported++
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (!message.includes('duplicate')) {
        console.log(`\n  ✗ Failed: ${item.id} - ${message}`)
      }
      skipped++
    }

    if (i % 100 === 0) {
      logProgress(i + 1, data.length, 'drivers')
    }
  }

  console.log(`\n  ✓ Drivers: ${imported} imported, ${skipped} skipped`)
  return imported
}
