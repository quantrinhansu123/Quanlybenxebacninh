/**
 * AppSheet lưu file trong cột kiểu File bằng đường dẫn tương đối, ví dụ:
 * THONGBAO_KHAITHAC_Files_/91d91868.File.094400.pdf
 * URL đầy đủ (fileName không được rỗng):
 * https://www.appsheet.com/template/gettablefileurl?appName=...&tableName=THONGBAO_KHAITHAC&fileName=THONGBAO_KHAITHAC_Files_%2F91d91868.File.094400.pdf
 */
import { appsheetConfig } from '@/config/appsheet.config'

const GETTABLE_FILE_URL_BASE = 'https://www.appsheet.com/template/gettablefileurl'

const V2_APPS_TABLE_RE = /\/apps\/([0-9a-f-]{36})\/tables\/([^/]+)\/Action/i

/** Chuẩn hóa giá trị cột File từ AppSheet trước khi ghép gettablefileurl */
export function normalizeAppSheetFilePathInput(raw: string): string {
  return raw
    .trim()
    .replace(/^\.\/+/, '')
    .replace(/^\.\\+/, '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
}

function parseSearchParamsFromUrlOrQuery(input: string): URLSearchParams {
  const t = input.trim()
  try {
    if (/^https?:\/\//i.test(t)) {
      return new URL(t).searchParams
    }
  } catch {
    /* fall through */
  }
  const q = t.includes('?') ? t.split('?').slice(1).join('?') : t.replace(/^\?/, '')
  return new URLSearchParams(q.startsWith('?') ? q.slice(1) : q)
}

/** gettablefileurl bắt buộc có fileName không rỗng */
export function gettableFileUrlHasNonEmptyFileName(urlOrQuery: string): boolean {
  try {
    const p = parseSearchParamsFromUrlOrQuery(urlOrQuery)
    return !!p.get('fileName')?.trim()
  } catch {
    return false
  }
}

function parseTableFromNotificationsEndpoint(): string | null {
  const ep = appsheetConfig.endpoints.notifications?.trim()
  if (!ep) return null
  const m = ep.match(V2_APPS_TABLE_RE)
  return m ? m[2] : null
}

function resolveAppNameForGetTableFileUrl(): string | null {
  const slug = appsheetConfig.fileUrlAppName?.trim()
  return slug || null
}

function buildGetTableFileUrl(appName: string, tableName: string, fileName: string): string | null {
  const fn = fileName?.trim()
  if (!appName?.trim() || !tableName?.trim() || !fn) return null
  const params = new URLSearchParams({
    appName: appName.trim(),
    tableName: tableName.trim(),
    fileName: fn,
  })
  return `${GETTABLE_FILE_URL_BASE}?${params.toString()}`
}

/**
 * Chuỗi chỉ là query (hoặc thiếu host): ghép tiền tố gettablefileurl đầy đủ.
 * Không trả URL nếu fileName rỗng (tránh link hỏng).
 */
export function completeAppSheetGetTableFileUrl(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null

  if (/^https:\/\/www\.appsheet\.com\/template\/gettablefileurl\?/i.test(t)) {
    return gettableFileUrlHasNonEmptyFileName(t) ? t : null
  }

  const rel = t.match(/^\/?template\/gettablefileurl\?(.*)$/i)
  if (rel?.[1]) {
    const full = `${GETTABLE_FILE_URL_BASE}?${rel[1]}`
    return gettableFileUrlHasNonEmptyFileName(full) ? full : null
  }

  if (/appName=/i.test(t) && /fileName=/i.test(t)) {
    const qs = t.replace(/^\?/, '').replace(/^.*?gettablefileurl\?/i, '')
    if (/^https?:/i.test(qs)) return null
    const full = `${GETTABLE_FILE_URL_BASE}?${qs}`
    return gettableFileUrlHasNonEmptyFileName(full) ? full : null
  }

  return null
}

function resolveAppSheetStoredFileRefInner(normalizedPath: string): string | null {
  const t = normalizedPath
  if (!t) return null
  if (/^(https?:|\/\/|www\.)/i.test(t)) return null

  const appName = resolveAppNameForGetTableFileUrl()
  if (!appName) return null

  const filesPath = t.match(/^([A-Za-z0-9_]+)_Files_\/(.+)$/i)
  if (filesPath) {
    const tableName = filesPath[1]
    return buildGetTableFileUrl(appName, tableName, t)
  }

  if (
    /^[A-Za-z0-9_.-]+\.(pdf|png|jpe?g|gif|webp)$/i.test(t) &&
    !t.includes('/') &&
    !t.includes(':')
  ) {
    const tableName = parseTableFromNotificationsEndpoint()
    if (!tableName) return null
    const fileName = `${tableName}_Files_/${t}`
    return buildGetTableFileUrl(appName, tableName, fileName)
  }

  return null
}

/**
 * Trả về URL https đầy đủ nếu nhận dạng được AppSheet file ref / query thiếu host.
 */
export function expandAppSheetFileRefToHttps(raw: string): string | null {
  const t = normalizeAppSheetFilePathInput(raw)
  if (!t) return null
  if (/^https?:\/\//i.test(t)) {
    if (/www\.appsheet\.com\/template\/gettablefileurl/i.test(t)) {
      return gettableFileUrlHasNonEmptyFileName(t) ? t : null
    }
    return t
  }
  const c = completeAppSheetGetTableFileUrl(t)
  if (c) return c
  return resolveAppSheetStoredFileRefInner(t)
}

export function resolveAppSheetStoredFileRef(raw: string): string | null {
  return resolveAppSheetStoredFileRefInner(normalizeAppSheetFilePathInput(raw))
}
