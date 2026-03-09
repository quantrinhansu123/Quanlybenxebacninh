import { loadGtvtAppsheetConfig } from '../config/gtvt-appsheet.config.js'
import { GtvtSourceError } from '../types/gtvt-sync.types.js'
import { isRecord } from '../utils/type-guards.js'

const ARRAY_KEYS = ['data', 'rows', 'items', 'value', 'result', 'Data', 'Rows', 'Items', 'Value', 'Result']

const toObjectArray = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord)
}

interface ExtractRowsResult {
  rows: Record<string, unknown>[]
  hasArrayShape: boolean
  sourceLength: number
}

const extractRows = (payload: unknown): ExtractRowsResult => {
  if (Array.isArray(payload)) {
    return {
      rows: toObjectArray(payload),
      hasArrayShape: true,
      sourceLength: payload.length,
    }
  }

  if (!isRecord(payload)) {
    return {
      rows: [],
      hasArrayShape: false,
      sourceLength: 0,
    }
  }

  let hasArrayShape = false
  for (const key of ARRAY_KEYS) {
    const candidate = payload[key]
    if (!Array.isArray(candidate)) continue
    hasArrayShape = true
    if (candidate.length === 0) continue
    return {
      rows: toObjectArray(candidate),
      hasArrayShape: true,
      sourceLength: candidate.length,
    }
  }

  return {
    rows: [],
    hasArrayShape,
    sourceLength: 0,
  }
}

const resolveUrl = (baseUrl: string, endpoint: string): string => {
  if (/^https?:\/\//i.test(endpoint)) return endpoint
  const normalizedEndpoint = endpoint.replace(/^\/+/, '')
  return `${baseUrl}/${normalizedEndpoint}`
}

async function fetchRows(endpoint: string): Promise<Record<string, unknown>[]> {
  const config = loadGtvtAppsheetConfig()
  const url = resolveUrl(config.baseUrl, endpoint)
  const controller = new AbortController()
  const timeoutRef = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        [config.authHeader]: config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        Action: 'Find',
        Properties: {},
        Rows: [],
      }),
    })

    if (!response.ok) {
      throw new GtvtSourceError(`Upstream API failed with status ${response.status}`)
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new GtvtSourceError('Upstream API response is not valid JSON')
    }

    const extracted = extractRows(payload)
    if (!extracted.hasArrayShape) {
      throw new GtvtSourceError('Upstream API returned empty/unsupported payload shape')
    }

    if (extracted.sourceLength > 0 && extracted.rows.length === 0) {
      throw new GtvtSourceError('Upstream API returned rows in unsupported format')
    }

    return extracted.rows
  } catch (error) {
    if (error instanceof GtvtSourceError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GtvtSourceError('Upstream API request timed out')
    }
    throw new GtvtSourceError(
      error instanceof Error ? error.message : 'Unknown upstream API error'
    )
  } finally {
    clearTimeout(timeoutRef)
  }
}

export async function fetchGtvtRoutes(): Promise<Record<string, unknown>[]> {
  const config = loadGtvtAppsheetConfig()
  return fetchRows(config.routesEndpoint)
}

export async function fetchGtvtSchedules(): Promise<Record<string, unknown>[]> {
  const config = loadGtvtAppsheetConfig()
  return fetchRows(config.schedulesEndpoint)
}

export async function fetchGtvtNotifications(): Promise<Record<string, unknown>[]> {
  const config = loadGtvtAppsheetConfig()
  if (!config.notificationsEndpoint) return []
  return fetchRows(config.notificationsEndpoint)
}

export async function fetchGtvtBusRoutes(): Promise<Record<string, unknown>[]> {
  const config = loadGtvtAppsheetConfig()
  if (!config.busRoutesEndpoint) return []
  return fetchRows(config.busRoutesEndpoint)
}

export async function fetchGtvtBusSchedules(): Promise<Record<string, unknown>[]> {
  const config = loadGtvtAppsheetConfig()
  if (!config.busSchedulesEndpoint) return []
  return fetchRows(config.busSchedulesEndpoint)
}

export async function fetchGtvtBusLookup(): Promise<Record<string, unknown>[]> {
  const config = loadGtvtAppsheetConfig()
  if (!config.busLookupEndpoint) return []
  return fetchRows(config.busLookupEndpoint)
}
