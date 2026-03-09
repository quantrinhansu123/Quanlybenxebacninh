import { sql } from 'drizzle-orm'
import type { db } from '../db/drizzle.js'

export type DbExecutor = NonNullable<typeof db>

export const GTVT_SYNC_LOCK_KEY = 737001
export const NULL_FIREBASE_SENTINEL = '__NULL_FIREBASE__'
export const DEFAULT_DAYS_OF_WEEK = [1, 2, 3, 4, 5, 6, 7]
export const MAX_ROUTE_CODE_LENGTH = 50
export const MAX_SCHEDULE_CODE_LENGTH = 50

export const toLookupKey = (value: string | null | undefined): string => (value || '').trim().toUpperCase()

export const pickString = (row: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = row[key]
    if (value === undefined || value === null) continue
    if (typeof value === 'string') {
      const normalized = value.trim()
      if (normalized) return normalized
      continue
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
  }
  return null
}

export const pickNumber = (row: Record<string, unknown>, keys: string[]): number | null => {
  const value = pickString(row, keys)
  if (!value) return null
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export const parseDateValue = (value: string | null): string | null => {
  if (!value) return null
  const normalized = value.trim()
  const dmy = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) {
    const day = dmy[1].padStart(2, '0')
    const month = dmy[2].padStart(2, '0')
    const year = dmy[3]
    return `${year}-${month}-${day}`
  }
  const ymd = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) return ymd[0]
  return null
}

export const parseTimeValue = (value: string | null): string | null => {
  if (!value) return null
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/)
  if (!match) return null
  return `${match[1]}:${match[2]}`
}

export const parseIntArray = (value: unknown, min: number, max: number): number[] => {
  if (Array.isArray(value)) {
    return [...new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= min && item <= max)
    )].sort((a, b) => a - b)
  }

  if (typeof value === 'string') {
    const parsed = value
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item >= min && item <= max)
    return [...new Set(parsed)].sort((a, b) => a - b)
  }

  return []
}

export const stripBusPrefix = (value: string): string => value.replace(/^BUS-/i, '').trim()

export const escapeSqlString = (value: string | null): string => {
  if (value === null) return 'NULL'
  // Remove NULL bytes from external data, then escape single quotes for PostgreSQL
  return `'${value.replace(/\0/g, '').replace(/'/g, "''")}'`
}

export const countFromRow = (row: Record<string, unknown> | undefined, key: string): number => {
  const value = row?.[key]
  return Number(value || 0)
}

export const uniqueFirebaseIds = (firebaseIds: string[]): string[] => {
  const deduped = new Map<string, string>()
  firebaseIds.forEach((item) => {
    const trimmed = item.trim()
    if (!trimmed) return
    deduped.set(toLookupKey(trimmed), trimmed)
  })
  return [...deduped.values()]
}

export const insertSeenFirebaseTempTable = async (
  executor: DbExecutor,
  tableName: '_tmp_gtvt_route_seen_ids' | '_tmp_gtvt_schedule_seen_ids',
  firebaseIds: string[]
): Promise<void> => {
  await executor.execute(sql.raw(`DROP TABLE IF EXISTS ${tableName}`))
  await executor.execute(sql.raw(`
    CREATE TEMP TABLE ${tableName} (
      firebase_id TEXT PRIMARY KEY
    )
  `))

  const uniqueIds = uniqueFirebaseIds(firebaseIds)
  if (uniqueIds.length === 0) return

  const chunkSize = 500
  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize)
    const values = chunk.map((firebaseId) => `(${escapeSqlString(firebaseId)})`).join(',')
    await executor.execute(sql.raw(`INSERT INTO ${tableName} VALUES ${values}`))
  }
}

export const cleanupTempTables = async (executor: DbExecutor): Promise<void> => {
  await executor.execute(sql.raw('DROP TABLE IF EXISTS _tmp_gtvt_schedules'))
  await executor.execute(sql.raw('DROP TABLE IF EXISTS _tmp_gtvt_routes'))
  await executor.execute(sql.raw('DROP TABLE IF EXISTS _tmp_gtvt_route_seen_ids'))
  await executor.execute(sql.raw('DROP TABLE IF EXISTS _tmp_gtvt_schedule_seen_ids'))
}
