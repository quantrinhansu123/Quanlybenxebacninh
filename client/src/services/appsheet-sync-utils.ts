/**
 * Shared utilities for AppSheet normalizers
 * Ported from server/src/services/gtvt-sync-utils.ts (browser-safe, no DB deps)
 */
import {
  expandAppSheetFileRefToHttps,
  gettableFileUrlHasNonEmptyFileName,
} from '@/utils/appsheet-table-file-url'
import { normalizePdfHref } from '@/utils/pdf-href'

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

/**
 * Số TB trên dòng BieuDo: ưu tiên SoThongBao; nhiều sheet chỉ có QD_KhaiThao cùng nội dung với SoThongBao TB.
 */
const SCHEDULE_SO_THONG_BAO_MATCH_KEYS = [
  'SoThongBao',
  'so_thong_bao',
  'SoThongbao',
  'notification_number',
  'notificationNumber',
  'SoTB',
  'SOTB',
  'QD_KhaiThac',
  'qd_khaithac',
  'QDKhaiThac',
  'SoThongBao_TB',
]
const THONGBAO_SO_THONG_BAO_KEYS = [
  'SoThongBao',
  'so_thong_bao',
  'SoThongbao',
  'SOTB',
  'So_tb',
  'SoTB',
]
const THONGBAO_FILE_KEYS = [
  'File',
  'file',
  'FILE',
  'link file',
  'Link file',
  'Link File',
  'URL',
  'url',
  'Link',
  'link',
  'FileUrl',
  'file_url',
]

function normalizeNoticeNumberKey(s: string): string {
  return (s || '')
    .trim()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .toUpperCase()
}

/** AppSheet: ô Hyperlink / Ref thường là object { Url, Value, … } */
export function extractAppSheetCellString(val: unknown): string | null {
  if (val == null) return null
  if (typeof val === 'string') {
    const t = val.trim()
    return t || null
  }
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (typeof val === 'object' && !Array.isArray(val)) {
    const o = val as Record<string, unknown>
    for (const k of [
      'url',
      'Url',
      'URL',
      'link',
      'Link',
      'href',
      'Address',
      'address',
      'Value',
      'value',
      'Text',
      'text',
      'Display',
      'display',
    ]) {
      const s = o[k]
      if (typeof s === 'string' && s.trim()) return s.trim()
    }
  }
  return null
}

function pickSoThongBaoFromNoticeRow(n: Record<string, unknown>): string | null {
  const direct = pickString(n, THONGBAO_SO_THONG_BAO_KEYS)
  if (direct?.trim()) return direct.trim()
  for (const [key, val] of Object.entries(n)) {
    const kl = key.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, '')
    if (!/thongbao|sothongbao|notification|sotb|so.*tb/i.test(kl)) continue
    const s = extractAppSheetCellString(val)
    if (s && s.length > 2) return s
  }
  return null
}

function pickScheduleSoTbFromRow(row: Record<string, unknown>): string | null {
  const direct = pickString(row, SCHEDULE_SO_THONG_BAO_MATCH_KEYS)
  if (direct?.trim()) return direct.trim()
  for (const [key, val] of Object.entries(row)) {
    if (/^TB_/i.test(key) && /file|link/i.test(key)) continue
    const kl = key.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, '')
    if (!/thongbao|sothongbao|notification|sotb|so.*tb|qd.*khai/i.test(kl)) continue
    const s = extractAppSheetCellString(val)
    if (s && s.length > 2 && /\d/.test(s)) return s
  }
  return null
}

/** Lấy URL hoặc đường dẫn storage AppSheet từ dòng THONGBAO (không thêm https:// sai vì .pdf) */
function pickThongBaoFileUrlFromNoticeRow(n: Record<string, unknown>): string | null {
  const tryString = (s: string): string | null => {
    const t = s.trim()
    if (!t) return null
    if (/^https?:\/\//i.test(t)) return t
    if (t.startsWith('//')) return `https:${t}`
    if (/^www\./i.test(t)) return `https://${t}`
    if (/drive\.google\.com|docs\.google\.com/i.test(t)) {
      return /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, '')}`
    }
    if (/_Files_\//i.test(t)) return t
    if (/\.(pdf|png|jpe?g|gif|webp)$/i.test(t) && !t.includes('://')) return t
    return null
  }
  for (const key of THONGBAO_FILE_KEYS) {
    const s = extractAppSheetCellString(n[key])
    if (s) {
      const out = tryString(s)
      if (out) return out
    }
  }
  for (const v of Object.values(n)) {
    const t = extractAppSheetCellString(v)
    if (!t) continue
    const out = tryString(t)
    if (out) return out
  }
  return null
}

/** Đường dẫn TB_File / URL → https hợp lệ; bỏ gettablefileurl thiếu fileName */
function resolveThongBaoFileToHttps(raw: string): string | null {
  const u = raw.trim()
  if (!u) return null
  const ex = expandAppSheetFileRefToHttps(u) || normalizePdfHref(u)
  if (!/^https?:\/\//i.test(ex)) return null
  if (/gettablefileurl/i.test(ex) && !gettableFileUrlHasNonEmptyFileName(ex)) return null
  return ex
}

function noticeEntriesWithFile(
  notificationRows: Record<string, unknown>[],
): { keyNorm: string; file: string }[] {
  const out: { keyNorm: string; file: string }[] = []
  for (const n of notificationRows) {
    const stb = pickSoThongBaoFromNoticeRow(n)
    const file = pickThongBaoFileUrlFromNoticeRow(n)
    if (!stb?.trim() || !file?.trim()) continue
    out.push({ keyNorm: normalizeNoticeNumberKey(stb), file: file.trim() })
  }
  return out
}

function findFileForScheduleSoTb(
  scheduleStb: string,
  entries: { keyNorm: string; file: string }[],
): string | null {
  const want = normalizeNoticeNumberKey(scheduleStb)
  if (!want) return null

  const exact = entries.find((e) => e.keyNorm === want)
  if (exact) return exact.file

  const minLen = 4
  for (const e of entries) {
    if (e.keyNorm.length < minLen || want.length < minLen) continue
    if (want.includes(e.keyNorm) || e.keyNorm.includes(want)) return e.file
  }
  return null
}

/**
 * Gán TB_File / TB_LinkFile: khớp Số TB (dòng lịch) ↔ SoThongBao (THONGBAO_KHAITHAC) → File / URL.
 */
export function applyThongBaoFileBySoThongBao(
  rows: Record<string, unknown>[],
  notificationRows: Record<string, unknown>[],
): Record<string, unknown>[] {
  if (!notificationRows.length) return rows

  const entries = noticeEntriesWithFile(notificationRows)
  if (entries.length === 0) return rows

  return rows.map((row) => {
    const stb = pickScheduleSoTbFromRow(row)
    if (!stb?.trim()) return row
    const file = findFileForScheduleSoTb(stb, entries)
    if (!file) return row
    const href = resolveThongBaoFileToHttps(file) ?? file
    return {
      ...row,
      TB_File: href,
      TB_LinkFile: href,
    }
  })
}

/** Sau normalizeScheduleRows: điền notificationFileUrl từ THONGBAO theo đúng Số TB hiển thị (notificationNumber). */
export function mergeThongBaoPdfIntoNormalizedSchedules<
  T extends { notificationNumber: string | null; notificationFileUrl: string | null },
>(schedules: T[], notificationRows: Record<string, unknown>[]): T[] {
  const entries = noticeEntriesWithFile(notificationRows)
  if (!entries.length) return schedules
  return schedules.map((s) => {
    const existing = resolveThongBaoFileToHttps(s.notificationFileUrl ?? '')
    if (existing) {
      if (existing === (s.notificationFileUrl ?? '').trim()) return s
      return { ...s, notificationFileUrl: existing }
    }
    const num = s.notificationNumber?.trim()
    if (!num) return s
    const file = findFileForScheduleSoTb(num, entries)
    if (!file) return s
    const href = resolveThongBaoFileToHttps(file)
    if (!href) return s
    return { ...s, notificationFileUrl: href }
  })
}
