/**
 * Đọc SoCho / SoChoNgoi từ bảng AppSheet «Xe» khi biển khớp BienSo (hoặc BienKiemSoat).
 * Ưu tiên Filter (nhẹ); fallback quét toàn bảng nếu định dạng cột khác với biển nhập.
 */
import { appsheetConfig } from '@/config/appsheet.config'
import { appsheetClient } from '@/services/appsheet-client.service'
import { normPlate } from '@/utils/plate-utils'

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

function rowPlate(row: Record<string, unknown>): string {
  const raw = row['BienSo'] ?? row['BienKiemSoat']
  return normPlate(typeof raw === 'string' ? raw : String(raw ?? ''))
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
  const variants = Array.from(new Set([want, trimmed.replace(/\s+/g, ' ')]))

  for (const v of variants) {
    if (!v) continue
    for (const col of ['BienSo', 'BienKiemSoat'] as const) {
      const selector = `Filter(Xe, [${col}]="${escSelector(v)}")`
      try {
        const rows = await appsheetClient.findByName('vehicles', { selector, signal })
        const n = pickSeat(rows)
        if (n != null) return n
      } catch {
        /* thử biến thể / cột khác */
      }
    }
  }

  try {
    const rows = await appsheetClient.fetchByName('vehicles', signal)
    for (const row of rows) {
      if (rowPlate(row as Record<string, unknown>) !== want) continue
      const n = int((row as Record<string, unknown>)['SoChoNgoi'] ?? (row as Record<string, unknown>)['SoCho'])
      if (n != null && n > 0) return n
    }
  } catch {
    return null
  }

  return null
}
