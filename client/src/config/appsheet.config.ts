/**
 * AppSheet API config - reads from Vite env vars (VITE_ prefix required)
 * Used for frontend direct polling to AppSheet GTVT tables
 *
 * Mỗi *ENDPOINT có thể là URL đầy đủ HOẶC path tương đối (vd tables/Xe/Action)
 * khi đã set VITE_GTVT_APPSHEET_BASE_URL — cùng kiểu với server (GTVT_APPSHEET_*).
 * Lưu ý: biến server GTVT_* không có tiền tố VITE_ → Vite không đưa vào bundle trình duyệt.
 */
// Strip {} from API key if present (AppSheet UI shows as {V2-xxx} but API accepts both)
const rawKey = import.meta.env.VITE_GTVT_APPSHEET_API_KEY || ''

const viteAppsheetBase = (
  (import.meta.env.VITE_GTVT_APPSHEET_BASE_URL as string | undefined) || ''
)
  .trim()
  .replace(/\/+$/, '')

function isAbsoluteHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s)
}

/** URL đầy đủ hoặc ghép BASE + path (giống server loadGtvtAppsheetConfig). */
function resolveAppsheetEndpoint(value: string | undefined, base: string): string {
  const v = (value || '').trim()
  if (!v) return ''
  if (isAbsoluteHttpUrl(v)) return v
  if (!base) return ''
  return `${base}/${v.replace(/^\/+/, '')}`
}

export const appsheetConfig = {
  apiKey: rawKey.replace(/^\{/, '').replace(/\}$/, ''),
  authHeader: 'ApplicationAccessKey',
  /**
   * gettablefileurl bắt buộc dùng tên app (slug), không dùng UUID trong URL API.
   * GTVT BG: SMARTTRANSPORTBG_V11_Core-822150001 — ghi đè bằng env nếu app đổi tên.
   */
  fileUrlAppName:
    (import.meta.env.VITE_GTVT_APPSHEET_FILE_URL_APP_NAME as string | undefined)?.trim() ||
    'SMARTTRANSPORTBG_V11_Core-822150001',
  // AppSheet tables (PHUHIEUXE, Xe) can be large → 10s often times out
  timeoutMs: 30_000,
  retries: 3,
  retryDelayMs: 500,
  // Adaptive interval: escalates when no changes detected, resets on change
  adaptive: {
    intervals: [10_000, 10_000, 10_000, 30_000, 60_000, 300_000],
  },
  // Table endpoints keyed by logical name
  // vehicles = Xe table (frontend-only sync)
  // fixedRoutes/busRoutes = DANHMUCTUYENCODINH / DANHMUCTUYENBUYT
  // fixedSchedules/busSchedules = BieuDoChayXeChiTiet / GIOCHAY_BUYT
  // notifications/busLookup = enrichment tables for join
  endpoints: {
    vehicles: resolveAppsheetEndpoint(import.meta.env.VITE_GTVT_APPSHEET_VEHICLES_ENDPOINT, viteAppsheetBase),
    xe:
      resolveAppsheetEndpoint(import.meta.env.VITE_GTVT_APPSHEET_VEHICLES_ENDPOINT, viteAppsheetBase) ||
      resolveAppsheetEndpoint(import.meta.env.VITE_GTVT_APPSHEET_XE_ENDPOINT, viteAppsheetBase),
    badges: resolveAppsheetEndpoint(import.meta.env.VITE_GTVT_APPSHEET_BADGES_ENDPOINT, viteAppsheetBase),
    operators: resolveAppsheetEndpoint(import.meta.env.VITE_GTVT_APPSHEET_OPERATORS_ENDPOINT, viteAppsheetBase),
    fixedRoutes: resolveAppsheetEndpoint(import.meta.env.VITE_GTVT_APPSHEET_ROUTES_ENDPOINT, viteAppsheetBase),
    busRoutes: resolveAppsheetEndpoint(import.meta.env.VITE_GTVT_APPSHEET_BUS_ROUTES_ENDPOINT, viteAppsheetBase),
    fixedSchedules: resolveAppsheetEndpoint(
      import.meta.env.VITE_GTVT_APPSHEET_SCHEDULES_ENDPOINT,
      viteAppsheetBase,
    ),
    busSchedules: resolveAppsheetEndpoint(
      import.meta.env.VITE_GTVT_APPSHEET_BUS_SCHEDULES_ENDPOINT,
      viteAppsheetBase,
    ),
    notifications: resolveAppsheetEndpoint(
      import.meta.env.VITE_GTVT_APPSHEET_NOTIFICATIONS_ENDPOINT,
      viteAppsheetBase,
    ),
    busLookup: resolveAppsheetEndpoint(import.meta.env.VITE_GTVT_APPSHEET_BUS_LOOKUP_ENDPOINT, viteAppsheetBase),
    matinh: resolveAppsheetEndpoint(import.meta.env.VITE_GTVT_APPSHEET_MATINH_ENDPOINT, viteAppsheetBase),
  } as Record<string, string>,
}
