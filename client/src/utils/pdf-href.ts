import {
  completeAppSheetGetTableFileUrl,
  gettableFileUrlHasNonEmptyFileName,
  resolveAppSheetStoredFileRef,
} from '@/utils/appsheet-table-file-url'

/**
 * Chuẩn hóa URL file/PDF từ AppSheet (đôi khi thiếu scheme, www/drive, hoặc chỉ có …_Files_/… trong storage)
 */
export function normalizePdfHref(raw: string): string {
  const t = raw.trim()
  if (!t) return ""
  if (/www\.appsheet\.com\/template\/gettablefileurl/i.test(t) && !gettableFileUrlHasNonEmptyFileName(t)) {
    return ''
  }
  /** Lỗi cũ: coi …_Files_/… là URL và thêm https:// → host sai; gỡ và ghép gettablefileurl đúng */
  if (/^https:\/\/[^/?#]*_Files_\//i.test(t)) {
    const pathOnly = t.replace(/^https:\/\//i, '')
    const fixed = resolveAppSheetStoredFileRef(pathOnly)
    if (fixed) return fixed
  }
  const completed = completeAppSheetGetTableFileUrl(t)
  if (completed) return completed
  const appsheetFileUrl = resolveAppSheetStoredFileRef(t)
  if (appsheetFileUrl) return appsheetFileUrl
  if (/^https?:\/\//i.test(t)) return t
  if (t.startsWith("//")) return `https:${t}`
  if (/^www\./i.test(t)) return `https://${t}`
  if (/^(drive|docs)\.google\./i.test(t)) return `https://${t}`
  if (t.startsWith("/") && t.length > 1) return t
  return t
}

/** Có thể mở trong tab (http(s), hoặc đường dẫn tương đối API) */
export function isOpenableDocumentUrl(raw: string | undefined | null): boolean {
  if (raw == null || typeof raw !== "string") return false
  const t = raw.trim()
  if (!t) return false
  const n = normalizePdfHref(t)
  if (/^https?:\/\//i.test(n)) return true
  if (t.startsWith("/") && t.length > 1 && !t.startsWith("//")) return true
  return false
}
