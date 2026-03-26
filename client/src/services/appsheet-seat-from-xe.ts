/**
 * Đọc SoCho / SoChoNgoi và SoGiuong từ bảng AppSheet «Xe» khi biển khớp BienSo (hoặc BienKiemSoat).
 * 1) Filter (nhanh)  2) Nếu không có dòng: quét bảng + so khớp normPlate (chậm hơn nhưng đúng khi GTVT lưu biển có dấu cách/dấu chấm).
 * Tắt bước 2: VITE_APPSHEET_XE_SEAT_SKIP_FULL_SCAN=true
 * Cache ngắn + gộp request trùng biển.
 */
import { appsheetConfig } from '@/config/appsheet.config'
import { appsheetClient } from '@/services/appsheet-client.service'
import { normPlate } from '@/utils/plate-utils'

const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_CACHE_ENTRIES = 400

/** Số ghế + số giường từ cùng dòng Xe (AppSheet). */
export interface XeCapacities {
  seat: number | null
  bed: number | null
}

const seatCache = new Map<string, { value: XeCapacities; at: number }>()
const inflight = new Map<string, Promise<XeCapacities>>()

function escSelector(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function int(val: unknown): number | undefined {
  if (val === null || val === undefined || val === '') return undefined
  const n = Number(val)
  return Number.isFinite(n) ? Math.floor(n) : undefined
}

function capacitiesFromRow(row: Record<string, unknown>): XeCapacities {
  const seatRaw = int(row['SoChoNgoi'] ?? row['SoCho'])
  const bedRaw = int(row['SoGiuong'])
  return {
    seat: seatRaw != null && seatRaw > 0 ? seatRaw : null,
    bed: bedRaw != null && bedRaw > 0 ? bedRaw : null,
  }
}

function pickCapacities(rows: Record<string, unknown>[]): XeCapacities {
  for (const row of rows) {
    const c = capacitiesFromRow(row)
    if (c.seat != null || c.bed != null) return c
  }
  return { seat: null, bed: null }
}

function rowPlateNorm(row: Record<string, unknown>): string {
  const raw = row['BienSo'] ?? row['BienKiemSoat']
  return normPlate(typeof raw === 'string' ? raw : String(raw ?? ''))
}

function cacheGet(key: string): XeCapacities | undefined {
  const hit = seatCache.get(key)
  if (!hit) return undefined
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    seatCache.delete(key)
    return undefined
  }
  return hit.value
}

function cacheSet(key: string, value: XeCapacities): void {
  if (seatCache.size >= MAX_CACHE_ENTRIES) {
    const first = seatCache.keys().next().value as string | undefined
    if (first) seatCache.delete(first)
  }
  seatCache.set(key, { value, at: Date.now() })
}

async function findCapacitiesBySelectors(
  variants: string[],
  signal: AbortSignal | undefined,
): Promise<XeCapacities | null> {
  const cols = ['BienSo', 'BienKiemSoat'] as const
  for (const v of variants) {
    if (!v) continue
    const results = await Promise.all(
      cols.map(async (col) => {
        const selector = `Filter(Xe, [${col}]="${escSelector(v)}")`
        try {
          const rows = await appsheetClient.findByName('vehicles', { selector, signal })
          return pickCapacities(rows as Record<string, unknown>[])
        } catch {
          return { seat: null, bed: null } as XeCapacities
        }
      }),
    )
    for (const n of results) {
      if (n.seat != null || n.bed != null) return n
    }
  }
  return null
}

function emptyCapacities(): XeCapacities {
  return { seat: null, bed: null }
}

/**
 * Trả số ghế + số giường từ bảng Xe (theo biển vào bến, chuẩn hoá biển).
 */
export async function fetchXeCapacitiesFromAppsheetByPlate(
  rawPlate: string,
  signal?: AbortSignal,
): Promise<XeCapacities> {
  const trimmed = (rawPlate || '').trim()
  if (!trimmed) return emptyCapacities()
  if (!appsheetConfig.endpoints.vehicles?.trim()) {
    return emptyCapacities()
  }
  if (!appsheetConfig.apiKey) return emptyCapacities()

  const want = normPlate(trimmed)
  const cached = cacheGet(want)
  if (cached !== undefined) return cached

  const pending = inflight.get(want)
  if (pending) return pending

  const run = (async (): Promise<XeCapacities> => {
    const variants = Array.from(
      new Set([want, trimmed.replace(/\s+/g, ' '), trimmed.toUpperCase()]),
    )
    try {
      const fromFilter = await findCapacitiesBySelectors(variants, signal)
      if (fromFilter != null && (fromFilter.seat != null || fromFilter.bed != null)) {
        cacheSet(want, fromFilter)
        return fromFilter
      }

      const skipFull =
        (import.meta.env.VITE_APPSHEET_XE_SEAT_SKIP_FULL_SCAN as string | undefined) === 'true'
      if (skipFull) {
        const empty = emptyCapacities()
        cacheSet(want, empty)
        return empty
      }

      const rows = await appsheetClient.fetchByName('vehicles', signal)
      for (const row of rows) {
        if (signal?.aborted) return emptyCapacities()
        const r = row as Record<string, unknown>
        if (rowPlateNorm(r) !== want) continue
        const c = capacitiesFromRow(r)
        if (c.seat != null || c.bed != null) {
          cacheSet(want, c)
          return c
        }
      }
      const empty = emptyCapacities()
      cacheSet(want, empty)
      return empty
    } finally {
      inflight.delete(want)
    }
  })()

  inflight.set(want, run)
  return run
}

/**
 * Trả số ghế từ cột SoCho (hoặc SoChoNgoi) khi BienSo khớp biển vào bến (chuẩn hoá biển).
 */
export async function fetchSeatFromAppsheetXeByPlate(
  rawPlate: string,
  signal?: AbortSignal,
): Promise<number | null> {
  const caps = await fetchXeCapacitiesFromAppsheetByPlate(rawPlate, signal)
  return caps.seat
}
