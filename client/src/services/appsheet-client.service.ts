/**
 * Generic AppSheet API v2 client for browser
 * Mirrors backend pattern from gtvt-appsheet-client.service.ts
 * POST-based with "Find" action + ApplicationAccessKey header
 */
import { appsheetConfig } from '@/config/appsheet.config'

const ARRAY_KEYS = ['data', 'rows', 'items', 'value', 'result', 'Data', 'Rows', 'Items', 'Value', 'Result']

/** Extract rows from flexible AppSheet response format */
function parseAppSheetResponse(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item)
    )
  }

  if (typeof payload === 'object' && payload !== null) {
    const obj = payload as Record<string, unknown>
    for (const key of ARRAY_KEYS) {
      const candidate = obj[key]
      if (Array.isArray(candidate) && candidate.length > 0) {
        return candidate.filter((item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null && !Array.isArray(item)
        )
      }
    }
  }

  return []
}

/** Fetch with retry + exponential backoff */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retriesLeft: number,
): Promise<Response> {
  try {
    const response = await fetch(url, init)
    if (!response.ok && retriesLeft > 0 && response.status >= 500) {
      await new Promise(r => setTimeout(r, appsheetConfig.retryDelayMs * (appsheetConfig.retries - retriesLeft + 1)))
      return fetchWithRetry(url, init, retriesLeft - 1)
    }
    return response
  } catch (error) {
    if (retriesLeft > 0) {
      await new Promise(r => setTimeout(r, appsheetConfig.retryDelayMs * (appsheetConfig.retries - retriesLeft + 1)))
      return fetchWithRetry(url, init, retriesLeft - 1)
    }
    throw error
  }
}

/** Fetch all rows from an AppSheet table */
async function fetchTable(
  endpoint: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>[]> {
  if (!endpoint) throw new Error('AppSheet endpoint not configured')
  if (!appsheetConfig.apiKey) throw new Error('AppSheet API key not configured')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), appsheetConfig.timeoutMs)

  // Chain caller signal with timeout signal
  if (signal) {
    signal.addEventListener('abort', () => controller.abort())
  }

  try {
    const response = await fetchWithRetry(
      endpoint,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          [appsheetConfig.authHeader]: appsheetConfig.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ Action: 'Find', Properties: {}, Rows: [] }),
      },
      appsheetConfig.retries,
    )

    if (!response.ok) {
      throw new Error(`AppSheet API error: ${response.status}`)
    }

    const payload = await response.json()
    return parseAppSheetResponse(payload)
  } catch (err) {
    // Browser abort errors are often surfaced as vague messages
    const e = err as Error
    if (e?.name === 'AbortError' || /aborted/i.test(e?.message || '')) {
      throw new Error(`AppSheet request timeout after ${Math.round(appsheetConfig.timeoutMs / 1000)}s`)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

type FindOptions = {
  /** AppSheet Selector expression (e.g. Filter(PHUHIEUXE, [Ref_DonViCapPhuHieu]="25fac009")) */
  selector?: string
  /** Provide key values to read selected rows; shape depends on table key column */
  rows?: Record<string, unknown>[]
  /** Optional AbortSignal from caller */
  signal?: AbortSignal
}

/** Find rows with optional Selector and/or input Rows (more efficient than full table scan) */
async function findTable(endpoint: string, options: FindOptions): Promise<Record<string, unknown>[]> {
  if (!endpoint) throw new Error('AppSheet endpoint not configured')
  if (!appsheetConfig.apiKey) throw new Error('AppSheet API key not configured')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), appsheetConfig.timeoutMs)

  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort())
  }

  try {
    const response = await fetchWithRetry(
      endpoint,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          [appsheetConfig.authHeader]: appsheetConfig.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          Action: 'Find',
          Properties: options.selector ? { Selector: options.selector } : {},
          Rows: options.rows ?? [],
        }),
      },
      appsheetConfig.retries,
    )

    if (!response.ok) {
      throw new Error(`AppSheet API error: ${response.status}`)
    }

    const payload = await response.json()
    return parseAppSheetResponse(payload)
  } catch (err) {
    const e = err as Error
    if (e?.name === 'AbortError' || /aborted/i.test(e?.message || '')) {
      throw new Error(`AppSheet request timeout after ${Math.round(appsheetConfig.timeoutMs / 1000)}s`)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Fetch a table by its logical name from appsheetConfig.endpoints */
async function fetchByName(
  tableName: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>[]> {
  const endpoint = appsheetConfig.endpoints[tableName]
  if (!endpoint) throw new Error(`AppSheet endpoint not configured for table: ${tableName}`)
  return fetchTable(endpoint, signal)
}

/** Find rows by logical name, with Selector and/or input Rows */
async function findByName(tableName: string, options: FindOptions): Promise<Record<string, unknown>[]> {
  const endpoint = appsheetConfig.endpoints[tableName]
  if (!endpoint) throw new Error(`AppSheet endpoint not configured for table: ${tableName}`)
  return findTable(endpoint, options)
}

/** Fetch multiple tables in parallel, returns { [tableName]: rows[] } */
async function fetchMultiple(
  tableNames: string[],
  signal?: AbortSignal,
): Promise<Record<string, Record<string, unknown>[]>> {
  const results = await Promise.allSettled(
    tableNames.map(name => fetchByName(name, signal))
  )
  const output: Record<string, Record<string, unknown>[]> = {}
  for (let i = 0; i < tableNames.length; i++) {
    const r = results[i]
    output[tableNames[i]] = r.status === 'fulfilled' ? r.value : []
  }
  return output
}

export const appsheetClient = { fetchTable, fetchByName, findByName, fetchMultiple }
