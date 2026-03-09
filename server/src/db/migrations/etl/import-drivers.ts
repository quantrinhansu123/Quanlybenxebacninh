/**
 * Import Drivers from Firebase Export
 * Level 2: Depends on operators
 */
import { db } from '../../drizzle'
import { drivers } from '../../schema'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  storeIdMapping,
  getPostgresId,
  cleanPhoneNumber,
  parseBoolean,
  parseDate,
  logProgress,
  ensureDbInitialized,
} from './etl-helpers'

interface FirebaseDriver {
  _firebase_id: string
  id: string
  full_name?: string
  phone?: string
  id_number?: string
  operator_id?: string
  license_number?: string
  license_class?: string
  license_expiry_date?: string
  date_of_birth?: string
  address?: string
  province?: string
  district?: string
  image_url?: string
  is_active?: boolean | string
  operator_name?: string
  operator_code?: string
  email?: string
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export async function importDrivers(exportDir: string): Promise<number> {
  ensureDbInitialized()

  const filePath = join(exportDir, 'drivers.json')

  if (!existsSync(filePath)) {
    console.log('  ⚠ drivers.json not found, skipping...')
    return 0
  }

  let data: FirebaseDriver[]

  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    console.log('  ⚠ Failed to read drivers.json')
    return 0
  }

  if (data.length === 0) {
    console.log('  ⚠ No drivers data found, skipping...')
    return 0
  }

  console.log(`  Importing ${data.length} drivers...`)

  let imported = 0
  let skipped = 0

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    try {
      // Resolve operator foreign key
      let operatorId = null
      if (item.operator_id) {
        operatorId = await getPostgresId(item.operator_id, 'operators')
      }

      // Get full name
      const fullName = item.full_name
      if (!fullName) {
        console.log(`\n  ⚠ Skipping driver ${item.id}: no full_name`)
        skipped++
        continue
      }

      const [inserted] = await db!.insert(drivers).values({
        firebaseId: item._firebase_id || item.id,
        fullName: fullName.substring(0, 255),
        phone: cleanPhoneNumber(item.phone),
        idNumber: item.id_number?.substring(0, 20) || null,
        operatorId: operatorId,
        licenseNumber: item.license_number?.substring(0, 50) || null,
        licenseClass: item.license_class?.substring(0, 10) || null,
        licenseExpiryDate: item.license_expiry_date || null,
        dateOfBirth: item.date_of_birth || null,
        address: item.address?.substring(0, 500) || null,
        province: item.province?.substring(0, 100) || null,
        district: item.district?.substring(0, 100) || null,
        imageUrl: item.image_url || null,
        isActive: parseBoolean(item.is_active),
        operatorName: item.operator_name?.substring(0, 255) || null,
        operatorCode: item.operator_code?.substring(0, 50) || null,
        metadata: item.metadata || null,
        createdAt: parseDate(item.created_at) || new Date(),
        updatedAt: parseDate(item.updated_at) || new Date(),
      }).returning()

      await storeIdMapping(item._firebase_id || item.id, inserted.id, 'drivers')
      imported++
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('duplicate')) {
        skipped++
      } else {
        console.log(`\n  ✗ Failed: ${item.id} - ${message}`)
        skipped++
      }
    }

    if (i % 50 === 0) {
      logProgress(i + 1, data.length, 'drivers')
    }
  }

  console.log(`\n  ✓ Drivers: ${imported} imported, ${skipped} skipped`)
  return imported
}
