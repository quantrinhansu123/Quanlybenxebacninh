/**
 * Chuẩn hóa URL file/PDF
 */
export function normalizePdfHref(raw: string): string {
  const t = raw.trim()
  if (!t) return ""
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
