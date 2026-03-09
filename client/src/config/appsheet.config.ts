/**
 * AppSheet API config - reads from Vite env vars (VITE_ prefix required)
 * Used for frontend direct polling to AppSheet GTVT tables
 */
export const appsheetConfig = {
  apiKey: import.meta.env.VITE_GTVT_APPSHEET_API_KEY || '',
  authHeader: 'ApplicationAccessKey',
  timeoutMs: 10_000,
  retries: 2,
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
    vehicles: import.meta.env.VITE_GTVT_APPSHEET_VEHICLES_ENDPOINT || '',
    badges: import.meta.env.VITE_GTVT_APPSHEET_BADGES_ENDPOINT || '',
    operators: import.meta.env.VITE_GTVT_APPSHEET_OPERATORS_ENDPOINT || '',
    fixedRoutes: import.meta.env.VITE_GTVT_APPSHEET_ROUTES_ENDPOINT || '',
    busRoutes: import.meta.env.VITE_GTVT_APPSHEET_BUS_ROUTES_ENDPOINT || '',
    fixedSchedules: import.meta.env.VITE_GTVT_APPSHEET_SCHEDULES_ENDPOINT || '',
    busSchedules: import.meta.env.VITE_GTVT_APPSHEET_BUS_SCHEDULES_ENDPOINT || '',
    notifications: import.meta.env.VITE_GTVT_APPSHEET_NOTIFICATIONS_ENDPOINT || '',
    busLookup: import.meta.env.VITE_GTVT_APPSHEET_BUS_LOOKUP_ENDPOINT || '',
    matinh: import.meta.env.VITE_GTVT_APPSHEET_MATINH_ENDPOINT || '',
  } as Record<string, string>,
}
