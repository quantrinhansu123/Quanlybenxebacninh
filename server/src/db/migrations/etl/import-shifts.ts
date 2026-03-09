/**
 * Import Shifts from Firebase Export
 * Level 1: No dependencies
 */
import { db } from '../../drizzle'
import { shifts } from '../../schema'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  storeIdMapping,
  parseBoolean,
  parseDate,
  logProgress,
  ensureDbInitialized,
} from './etl-helpers'

interface FirebaseShift {
  _firebase_id: string
  id: string
  name?: string
  start_time?: string
  end_time?: string
  is_active?: boolean | string
  created_at?: string
  updated_at?: string
}

export async function importShifts(exportDir: string): Promise<number> {
  ensureDbInitialized()

  const filePath = join(exportDir, 'shifts.json')
  let data: FirebaseShift[]

  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    console.log('  ⚠ shifts.json not found, skipping...')
    return 0
  }

  console.log(`  Importing ${data.length} shifts...`)

  let imported = 0
  let skipped = 0

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    try {
      const [inserted] = await db!.insert(shifts).values({
        firebaseId: item._firebase_id || item.id,
        name: (item.name || `Shift_${item.id}`).substring(0, 100),
        startTime: item.start_time?.substring(0, 10) || null,
        endTime: item.end_time?.substring(0, 10) || null,
        isActive: parseBoolean(item.is_active),
        createdAt: parseDate(item.created_at) || new Date(),
        updatedAt: parseDate(item.updated_at) || new Date(),
      }).returning()

      await storeIdMapping(item._firebase_id || item.id, inserted.id, 'shifts')
      imported++
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (!message.includes('duplicate')) {
        console.log(`\n  ✗ Failed: ${item.id} - ${message}`)
      }
      skipped++
    }

    if (i % 50 === 0) {
      logProgress(i + 1, data.length, 'shifts')
    }
  }

  console.log(`\n  ✓ Shifts: ${imported} imported, ${skipped} skipped`)
  return imported
}
