/**
 * Đọc SoCho / SoChoNgoi từ bảng AppSheet «Xe» khi biển khớp BienSo (hoặc BienKiemSoat).
 * Chỉ dùng Filter (nhẹ) — không tải cả bảng ~19k dòng (tránh chậm / timeout).
 * Cache ngắn + gộp request trùng biển.
 */
import { appsheetConfig } from '@/config/appsheet.config'
import { appsheetClient } from '@/services/appsheet-client.service'
import { normPlate } from '@/utils/plate-utils'

const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_CACHE_ENTRIES = 400

const seatCache = new Map<string, { value: number | null; at: number }>()
const inflight = new Map<string, Promise<number | null>>()

function escSelector(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function int(val: unknown): number | undefined {
  if (val === null || val === undefined || val === '') return undefined
  const n = Number(val)
  return Number.isFinite(n) ? Math.floor(n) : undefined
}

function pickSeat(rows: Record<string, unknown>[]): number | null {
  for (const row of rows) {
    const n = int(row['SoChoNgoi'] ?? row['SoCho'])
    if (n != null && n > 0) return n
  }
  return null
}

function cacheGet(key: string): number | null | undefined {
  const hit = seatCache.get(key)
  if (!hit) return undefined
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    seatCache.delete(key)
    return undefined
  }
  return hit.value
}

function cacheSet(key: string, value: number | null): void {
  if (seatCache.size >= MAX_CACHE_ENTRIES) {
    const first = seatCache.keys().next().value as string | undefined
    if (first) seatCache.delete(first)
  }
  seatCache.set(key, { value, at: Date.now() })
}

async function findSeatBySelectors(
  variants: string[],
  signal: AbortSignal | undefined,
): Promise<number | null> {
  const cols = ['BienSo', 'BienKiemSoat'] as const
  for (const v of variants) {
    if (!v) continue
    const results = await Promise.all(
      cols.map(async (col) => {
        const selector = `Filter(Xe, [${col}]="${escSelector(v)}")`
        try {
          const rows = await appsheetClient.findByName('vehicles', { selector, signal })
          return pickSeat(rows)
        } catch {
          return null
        }
      }),
    )
    for (const n of results) {
      if (n != null) return n
    }
  }
  return null
}

/**
 * Trả số ghế từ cột SoCho (hoặc SoChoNgoi) khi BienSo khớp biển vào bến (chuẩn hoá biển).
 */
export async function fetchSeatFromAppsheetXeByPlate(
  rawPlate: string,
  signal?: AbortSignal,
): Promise<number | null> {
  const trimmed = (rawPlate || '').trim()
  if (!trimmed) return null
  if (!appsheetConfig.endpoints.vehicles?.trim()) {
    return null
  }
  if (!appsheetConfig.apiKey) return null

  const want = normPlate(trimmed)
  const cached = cacheGet(want)
  if (cached !== undefined) return cached

  const pending = inflight.get(want)
  if (pending) return pending

  const run = (async (): Promise<number | null> => {
    const variants = Array.from(
      new Set([want, trimmed.replace(/\s+/g, ' '), trimmed.toUpperCase()]),
    )
    try {
      const n = await findSeatBySelectors(variants, signal)
      const out = n ?? null
      cacheSet(want, out)
      return out
    } finally {
      inflight.delete(want)
    }
  })()

  inflight.set(want, run)
  return run
}
