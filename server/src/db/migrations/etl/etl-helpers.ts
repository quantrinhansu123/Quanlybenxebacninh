/**
 * ETL Helper Utilities
 * Shared functions for Firebase to Supabase migration
 */
import { db } from '../../drizzle'
import { idMappings } from '../../schema'
import { eq, and } from 'drizzle-orm'
import { promises as fs } from 'fs'
import * as path from 'path'

export type EntityType =
  | 'operators'
  | 'vehicle_types'
  | 'provinces'
  | 'users'
  | 'shifts'
  | 'vehicles'
  | 'drivers'
  | 'routes'
  | 'schedules'
  | 'vehicle_badges'
  | 'dispatch_records'
  | 'invoices'

/**
 * Get PostgreSQL UUID from Firebase ID
 */
export async function getPostgresId(
  firebaseId: string | undefined | null,
  entityType: EntityType
): Promise<string | null> {
  if (!firebaseId || !db) return null

  try {
    const [mapping] = await db
      .select()
      .from(idMappings)
      .where(
        and(
          eq(idMappings.firebaseId, firebaseId),
          eq(idMappings.entityType, entityType)
        )
      )
      .limit(1)

    return mapping?.postgresId || null
  } catch {
    return null
  }
}

/**
 * Store Firebase ID → PostgreSQL UUID mapping
 */
export async function storeIdMapping(
  firebaseId: string,
  postgresId: string,
  entityType: EntityType
): Promise<void> {
  if (!db) throw new Error('Database not initialized')

  await db.insert(idMappings).values({
    firebaseId,
    postgresId,
    entityType,
  })
}

/**
 * Clean phone number - remove non-numeric characters except +
 */
export function cleanPhoneNumber(phone?: string | null): string | null {
  if (!phone) return null
  return phone.replace(/[^0-9+]/g, '')
}

/**
 * Normalize status to lowercase
 */
export function normalizeStatus(status?: string | null, defaultValue = 'unknown'): string {
  if (!status) return defaultValue

  // Common status mappings
  const mapping: Record<string, string> = {
    ENTERED: 'entered',
    entered: 'entered',
    PERMIT_ISSUED: 'permit_issued',
    permit_issued: 'permit_issued',
    BOARDING: 'boarding',
    boarding: 'boarding',
    EXITED: 'exited',
    exited: 'exited',
    CANCELLED: 'cancelled',
    cancelled: 'cancelled',
    ACTIVE: 'active',
    active: 'active',
    INACTIVE: 'inactive',
    inactive: 'inactive',
  }

  return mapping[status] || status.toLowerCase()
}

/**
 * Parse date string to Date object, handling various formats
 */
export function parseDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null

  try {
    // Handle DD/MM/YYYY format (common in Vietnamese data)
    const ddmmyyyyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateStr.trim())
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch
      const date = new Date(+year, +month - 1, +day)
      return isNaN(date.getTime()) ? null : date
    }

    // Fallback to ISO format
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

/**
 * Parse boolean from various formats
 */
export function parseBoolean(value: unknown, defaultValue = true): boolean {
  if (value === undefined || value === null) return defaultValue
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1'
  }
  if (typeof value === 'number') return value !== 0
  return defaultValue
}

/**
 * Safely truncate string with optional warning
 */
export function safeTruncate(
  value: string | null | undefined,
  maxLength: number,
  fieldName?: string,
  recordId?: string
): string | null {
  if (!value) return null
  if (value.length <= maxLength) return value

  if (fieldName && recordId) {
    console.warn(`  ⚠ Truncated ${fieldName} for ${recordId}: ${value.length} → ${maxLength}`)
  }
  return value.substring(0, maxLength)
}

/**
 * Generate progress log
 */
export function logProgress(current: number, total: number, label: string): void {
  const percent = Math.round((current / total) * 100)
  const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5))
  process.stdout.write(`\r  [${bar}] ${percent}% (${current}/${total}) ${label}`)
}

/**
 * Check if database is initialized
 */
export function ensureDbInitialized(): void {
  if (!db) {
    throw new Error(
      'Database not initialized. Check DATABASE_URL environment variable.'
    )
  }
}

/**
 * Invalid FK Report Entry
 */
export interface InvalidFKRecord {
  timestamp: string
  collection: string
  recordId: string
  fkField: string
  fkValue: string
  targetCollection: string
}

/**
 * Log invalid foreign key reference to report file
 */
export async function logInvalidFK(
  exportDir: string,
  collection: string,
  recordId: string,
  fkField: string,
  fkValue: string,
  targetCollection: string
): Promise<void> {
  const reportPath = path.join(exportDir, 'invalid-fk-report.json')

  const record: InvalidFKRecord = {
    timestamp: new Date().toISOString(),
    collection,
    recordId,
    fkField,
    fkValue,
    targetCollection,
  }

  try {
    let records: InvalidFKRecord[] = []

    // Read existing report if exists
    try {
      const content = await fs.readFile(reportPath, 'utf-8')
      records = JSON.parse(content)
    } catch {
      // File doesn't exist or is invalid, start fresh
    }

    // Append new record
    records.push(record)

    // Write back
    await fs.writeFile(reportPath, JSON.stringify(records, null, 2), 'utf-8')
  } catch (error) {
    console.error(`Failed to log invalid FK: ${error}`)
  }
}

/**
 * Get invalid FK report if exists
 */
export async function getInvalidFKReport(
  exportDir: string
): Promise<InvalidFKRecord[]> {
  const reportPath = path.join(exportDir, 'invalid-fk-report.json')

  try {
    const content = await fs.readFile(reportPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
}
