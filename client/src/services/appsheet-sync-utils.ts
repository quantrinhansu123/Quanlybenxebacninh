/**
 * Shared utilities for AppSheet normalizers
 * Ported from server/src/services/gtvt-sync-utils.ts (browser-safe, no DB deps)
 */

export const toLookupKey = (value: string | null | undefined): string =>
  (value || '').trim().toUpperCase()

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
        .filter((item) => Number.isInteger(item) && item >= min && item <= max),
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

export const DEFAULT_DAYS_OF_WEEK = [1, 2, 3, 4, 5, 6, 7]

/** Enrich rows by joining with a lookup table (port of backend enrichScheduleRows) */
export function enrichRows(
  rows: Record<string, unknown>[],
  lookupRows: Record<string, unknown>[],
  config: { refKey: string; lookupIdKey: string; mappings: { from: string; to: string }[] },
): Record<string, unknown>[] {
  if (lookupRows.length === 0) return rows

  const lookupMap = new Map<string, Record<string, unknown>>()
  for (const row of lookupRows) {
    const id = toLookupKey(String(row[config.lookupIdKey] ?? ''))
    if (id) lookupMap.set(id, row)
  }

  return rows.map((row) => {
    const refValue = toLookupKey(String(row[config.refKey] ?? ''))
    if (!refValue) return row
    const lookupRow = lookupMap.get(refValue)
    if (!lookupRow) return row
    const enriched = { ...row }
    for (const mapping of config.mappings) {
      const value = lookupRow[mapping.from]
      if (value !== undefined && value !== null && value !== '') {
        enriched[mapping.to] = value
      }
    }
    return enriched
  })
}
