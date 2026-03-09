import { z } from 'zod'
import { GtvtConfigError } from '../types/gtvt-sync.types.js'

const envSchema = z.object({
  baseUrl: z.string().trim().default(''),
  routesEndpoint: z.string().trim().min(1, 'GTVT_APPSHEET_ROUTES_ENDPOINT is required'),
  schedulesEndpoint: z.string().trim().min(1, 'GTVT_APPSHEET_SCHEDULES_ENDPOINT is required'),
  notificationsEndpoint: z.string().trim().optional().default(''),
  busRoutesEndpoint: z.string().trim().optional().default(''),
  busSchedulesEndpoint: z.string().trim().optional().default(''),
  busLookupEndpoint: z.string().trim().optional().default(''),
  apiKey: z.string().trim().min(1, 'GTVT_APPSHEET_API_KEY is required'),
  authHeader: z.string().trim().default('ApplicationAccessKey'),
  timeoutMs: z.coerce.number().int().positive().max(120000).default(30000),
})

export interface GtvtAppsheetConfig {
  baseUrl: string
  routesEndpoint: string
  schedulesEndpoint: string
  notificationsEndpoint: string
  busRoutesEndpoint: string
  busSchedulesEndpoint: string
  busLookupEndpoint: string
  apiKey: string
  authHeader: string
  timeoutMs: number
}

let cachedConfig: GtvtAppsheetConfig | null = null

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value)

export function loadGtvtAppsheetConfig(): GtvtAppsheetConfig {
  if (cachedConfig) return cachedConfig

  const parsed = envSchema.safeParse({
    baseUrl: process.env.GTVT_APPSHEET_BASE_URL ?? '',
    routesEndpoint: process.env.GTVT_APPSHEET_ROUTES_ENDPOINT,
    schedulesEndpoint: process.env.GTVT_APPSHEET_SCHEDULES_ENDPOINT,
    notificationsEndpoint: process.env.GTVT_APPSHEET_NOTIFICATIONS_ENDPOINT,
    busRoutesEndpoint: process.env.GTVT_APPSHEET_BUS_ROUTES_ENDPOINT,
    busSchedulesEndpoint: process.env.GTVT_APPSHEET_BUS_SCHEDULES_ENDPOINT,
    busLookupEndpoint: process.env.GTVT_APPSHEET_BUS_LOOKUP_ENDPOINT,
    apiKey: process.env.GTVT_APPSHEET_API_KEY,
    authHeader: process.env.GTVT_APPSHEET_AUTH_HEADER,
    timeoutMs: process.env.GTVT_APPSHEET_TIMEOUT_MS,
  })

  if (!parsed.success) {
    const message = parsed.error.errors.map((item) => item.message).join('; ')
    throw new GtvtConfigError(message)
  }

  const config = parsed.data
  const normalizedBase = config.baseUrl.replace(/\/+$/, '')

  if (!normalizedBase && (!isAbsoluteUrl(config.routesEndpoint) || !isAbsoluteUrl(config.schedulesEndpoint))) {
    throw new GtvtConfigError(
      'GTVT_APPSHEET_BASE_URL is required when endpoint is not absolute URL'
    )
  }

  // Validate bus endpoints also need base URL if they are relative
  if (!normalizedBase) {
    const optionalEndpoints = [
      config.notificationsEndpoint,
      config.busRoutesEndpoint,
      config.busSchedulesEndpoint,
      config.busLookupEndpoint,
    ]
    const hasRelativeOptional = optionalEndpoints.some((ep) => ep && !isAbsoluteUrl(ep))
    if (hasRelativeOptional) {
      throw new GtvtConfigError(
        'GTVT_APPSHEET_BASE_URL is required when endpoint is not absolute URL'
      )
    }
  }

  cachedConfig = {
    baseUrl: normalizedBase,
    routesEndpoint: config.routesEndpoint,
    schedulesEndpoint: config.schedulesEndpoint,
    notificationsEndpoint: config.notificationsEndpoint || '',
    busRoutesEndpoint: config.busRoutesEndpoint || '',
    busSchedulesEndpoint: config.busSchedulesEndpoint || '',
    busLookupEndpoint: config.busLookupEndpoint || '',
    // Strip curly braces - AppSheet UI shows keys as {V2-xxx} but API expects V2-xxx
    apiKey: config.apiKey.replace(/^\{/, '').replace(/\}$/, ''),
    authHeader: config.authHeader,
    timeoutMs: config.timeoutMs,
  }

  return cachedConfig
}

export function clearGtvtAppsheetConfigCache(): void {
  cachedConfig = null
}

