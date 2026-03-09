/**
 * Import Users from Firebase Export
 * Level 1: No dependencies
 */
import { db } from '../../drizzle'
import { users } from '../../schema'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  storeIdMapping,
  parseBoolean,
  parseDate,
  logProgress,
  ensureDbInitialized,
} from './etl-helpers'

interface FirebaseUser {
  _firebase_id: string
  id: string
  email?: string
  username?: string
  password_hash?: string
  full_name?: string
  phone?: string
  role?: string
  is_active?: boolean | string
  last_login?: string
  created_at?: string
  updated_at?: string
}

export async function importUsers(exportDir: string): Promise<number> {
  ensureDbInitialized()

  const filePath = join(exportDir, 'users.json')
  let data: FirebaseUser[]

  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    console.log('  ⚠ users.json not found, skipping...')
    return 0
  }

  console.log(`  Importing ${data.length} users...`)

  let imported = 0
  let skipped = 0

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    try {
      const [inserted] = await db!.insert(users).values({
        firebaseId: item._firebase_id || item.id,
        email: (item.email || `${item.id}@migration.local`).substring(0, 255),
        passwordHash: item.password_hash || 'MIGRATION_PLACEHOLDER',
        name: item.full_name?.substring(0, 255) || item.username?.substring(0, 255) || null,
        phone: item.phone?.substring(0, 20) || null,
        role: (item.role || 'user').substring(0, 50),
        isActive: parseBoolean(item.is_active),
        lastLoginAt: parseDate(item.last_login),
        createdAt: parseDate(item.created_at) || new Date(),
        updatedAt: parseDate(item.updated_at) || new Date(),
      }).returning()

      await storeIdMapping(item._firebase_id || item.id, inserted.id, 'users')
      imported++
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (!message.includes('duplicate')) {
        console.log(`\n  ✗ Failed: ${item.id} - ${message}`)
      }
      skipped++
    }

    if (i % 50 === 0) {
      logProgress(i + 1, data.length, 'users')
    }
  }

  console.log(`\n  ✓ Users: ${imported} imported, ${skipped} skipped`)
  return imported
}
