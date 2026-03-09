/**
 * SharedWorker for AppSheet polling coordination
 * - One poll request shared across all tabs
 * - Adaptive interval: 10s→30s→60s→5min when no changes
 * - Off-thread normalization + per-record hash diff
 * - Cached data for instant new-tab hydration
 * - Pauses when all tabs are hidden
 */
/// <reference lib="webworker" />
declare const self: SharedWorkerGlobalScope

import { normalizeVehicleRows } from '../services/appsheet-normalize-vehicles'
import { normalizeBadgeRows } from '../services/appsheet-normalize-badges'
import { normalizeOperatorRows } from '../services/appsheet-normalize-operators'
import { normalizeFixedRouteRows } from '../services/appsheet-normalize-fixed-routes'
import { normalizeBusRouteRows } from '../services/appsheet-normalize-bus-routes'
import { normalizeScheduleRows, type NormalizedAppSheetSchedule } from '../services/appsheet-normalize-schedules'
import { normalizeBusScheduleRows } from '../services/appsheet-normalize-bus-schedules'
import { enrichRows } from '../services/appsheet-sync-utils'

// ─── Types ───────────────────────────────────────────────────────
type NormalizerFn = (rows: Record<string, unknown>[]) => unknown[]

// MATINH lookup cache (mã tỉnh → tên tỉnh, fetched once from AppSheet)
let matinhMap: Map<string, string> | null = null

// Enrichment lookup caches — fetched once, rarely change
let notificationsCache: Record<string, unknown>[] | null = null
let busLookupCache: Record<string, unknown>[] | null = null

/** Bus route normalizer wrapper — injects cached matinhMap */
const normalizeBusRouteRowsWrapped: NormalizerFn = (rows) =>
  normalizeBusRouteRows(rows, matinhMap ?? undefined) as unknown[]

/** Fixed schedule normalizer wrapper — enriches with notificationsCache then normalizes */
const normalizeFixedScheduleRowsWrapped: NormalizerFn = (rows): NormalizedAppSheetSchedule[] => {
  const enriched = enrichRows(rows, notificationsCache || [], {
    refKey: 'Ref_ThongBaoKhaiThac',
    lookupIdKey: 'ID_TB',
    mappings: [
      { from: 'Ref_Tuyen', to: 'Ref_Tuyen' },
      { from: 'Ref_DonVi', to: 'Ref_DonVi' },
    ],
  })
  return normalizeScheduleRows(enriched)
}

/** Bus schedule normalizer wrapper — enriches with busLookupCache then normalizes */
const normalizeBusScheduleRowsWrapped: NormalizerFn = (rows): NormalizedAppSheetSchedule[] => {
  const enriched = enrichRows(rows, busLookupCache || [], {
    refKey: 'BieuDo',
    lookupIdKey: 'ID_BieuDo',
    mappings: [
      { from: 'TuyenBuyt', to: 'Ref_Tuyen' },
      { from: 'DonViKhaiThac', to: 'Ref_DonVi' },
    ],
  })
  return normalizeBusScheduleRows(enriched)
}

// Built-in normalizer + key config per table (Vite bundles these imports)
const TABLE_CONFIG: Record<string, { normalizer: NormalizerFn; keyField: string }> = {
  vehicles: { normalizer: normalizeVehicleRows as NormalizerFn, keyField: 'plateNumber' },
  badges: { normalizer: normalizeBadgeRows as NormalizerFn, keyField: 'badgeNumber' },
  operators: { normalizer: normalizeOperatorRows as NormalizerFn, keyField: 'firebaseId' },
  fixedRoutes: { normalizer: normalizeFixedRouteRows as NormalizerFn, keyField: 'routeCode' },
  busRoutes: { normalizer: normalizeBusRouteRowsWrapped, keyField: 'firebaseId' },
  fixedSchedules: { normalizer: normalizeFixedScheduleRowsWrapped, keyField: 'firebaseId' },
  busSchedules: { normalizer: normalizeBusScheduleRowsWrapped, keyField: 'firebaseId' },
}

// Messages: Main thread → Worker
type WorkerCommand =
  | { type: 'config'; config: WorkerConfig }
  | { type: 'subscribe'; table: string }
  | { type: 'unsubscribe'; table: string }
  | { type: 'poll-now'; table: string }
  | { type: 'visibility'; hidden: boolean }

// Messages: Worker → Main thread
export type WorkerEvent =
  | { type: 'data'; table: string; data: unknown[]; changed: unknown[]; isInitial: boolean }
  | { type: 'status'; table: string; polling: boolean; interval: number; lastPollAt: string | null }
  | { type: 'error'; table: string; message: string }
  | { type: 'cache'; table: string; data: unknown[] }

interface WorkerConfig {
  apiKey: string
  authHeader: string
  timeoutMs: number
  retries: number
  retryDelayMs: number
  endpoints: Record<string, string>
  adaptive: { intervals: number[] }
}

// ─── State ───────────────────────────────────────────────────────
const connectedPorts = new Set<MessagePort>()
const portVisibility = new Map<MessagePort, boolean>() // true = hidden
let config: WorkerConfig | null = null

interface TableState {
  subscribers: Set<MessagePort>
  consecutiveNoChanges: number
  timerId: ReturnType<typeof setTimeout> | null
  hashMap: Map<string, string>
  normalizedCache: unknown[]
  lastPollAt: string | null
  polling: boolean
}

const tableStates = new Map<string, TableState>()

// ─── Hash Function (cyrb53) ─────────────────────────────────────
function hashRecord(data: unknown): string {
  const str = JSON.stringify(data)
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

// ─── Adaptive Interval ──────────────────────────────────────────
function getInterval(noChangeCount: number): number {
  if (!config) return 10_000
  const intervals = config.adaptive.intervals
  return intervals[Math.min(noChangeCount, intervals.length - 1)]
}

// ─── Visibility ─────────────────────────────────────────────────
function allTabsHidden(): boolean {
  if (portVisibility.size === 0) return true
  for (const hidden of portVisibility.values()) {
    if (!hidden) return false
  }
  return true
}

// ─── MATINH Lookup Fetch ──────────────────────────────────────────
async function ensureMatinhLoaded(): Promise<void> {
  if (matinhMap || !config) return
  const endpoint = config.endpoints['matinh']
  if (!endpoint) return
  try {
    const rows = await fetchTable(endpoint)
    matinhMap = new Map<string, string>()
    for (const row of rows) {
      const code = typeof row['MaTinh'] === 'string' ? row['MaTinh'].trim() : ''
      const name = typeof row['TenTinh'] === 'string' ? row['TenTinh'].trim() : ''
      if (code && name) matinhMap.set(code, name)
    }
    console.log(`[SharedWorker] MATINH loaded: ${matinhMap.size} provinces`)
  } catch (err) {
    console.warn('[SharedWorker] MATINH fetch failed:', err)
  }
}

// ─── Enrichment Lookup Fetches ───────────────────────────────────
async function ensureNotificationsLoaded(): Promise<void> {
  if (notificationsCache || !config) return
  const endpoint = config.endpoints['notifications']
  if (!endpoint) return
  try {
    notificationsCache = await fetchTable(endpoint)
    console.log(`[SharedWorker] Notifications loaded: ${notificationsCache.length} rows`)
  } catch (err) {
    console.warn('[SharedWorker] Notifications fetch failed:', err)
    notificationsCache = []
  }
}

async function ensureBusLookupLoaded(): Promise<void> {
  if (busLookupCache || !config) return
  const endpoint = config.endpoints['busLookup']
  if (!endpoint) return
  try {
    busLookupCache = await fetchTable(endpoint)
    console.log(`[SharedWorker] BusLookup loaded: ${busLookupCache.length} rows`)
  } catch (err) {
    console.warn('[SharedWorker] BusLookup fetch failed:', err)
    busLookupCache = []
  }
}

// ─── AppSheet Fetch ─────────────────────────────────────────────
async function fetchTable(endpoint: string): Promise<Record<string, unknown>[]> {
  if (!config) throw new Error('Config not set')

  let lastErr: Error | null = null
  for (let attempt = 0; attempt <= config.retries; attempt++) {
    // Per-attempt controller: timeout resets on each retry
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          [config.authHeader]: config.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ Action: 'Find', Properties: {}, Rows: [] }),
      })

      if (!response.ok) {
        if (response.status >= 500 && attempt < config.retries) {
          clearTimeout(timeoutId)
          await new Promise(r => setTimeout(r, config!.retryDelayMs * (attempt + 1)))
          continue
        }
        throw new Error(`AppSheet API error: ${response.status}`)
      }

      clearTimeout(timeoutId)
      const payload = await response.json()
      return parseResponse(payload)
    } catch (err) {
      clearTimeout(timeoutId)
      lastErr = err as Error
      if ((err as Error).name === 'AbortError') throw err
      if (attempt < config.retries) {
        await new Promise(r => setTimeout(r, config!.retryDelayMs * (attempt + 1)))
      }
    }
  }
  throw lastErr || new Error('Fetch failed')
}

function parseResponse(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    )
  }
  if (typeof payload === 'object' && payload !== null) {
    const obj = payload as Record<string, unknown>
    for (const key of ['data', 'rows', 'items', 'value', 'result', 'Data', 'Rows', 'Items', 'Value', 'Result']) {
      const candidate = obj[key]
      if (Array.isArray(candidate) && candidate.length > 0) {
        return candidate.filter(
          (item): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null && !Array.isArray(item),
        )
      }
    }
  }
  return []
}

// ─── Broadcast to subscribers ───────────────────────────────────
function broadcast(table: string, event: WorkerEvent) {
  const state = tableStates.get(table)
  if (!state) return
  for (const port of state.subscribers) {
    try {
      port.postMessage(event)
    } catch {
      // Port closed — full cleanup to prevent memory leaks
      removePortFromAll(port)
    }
  }
}

// ─── Poll + Diff ────────────────────────────────────────────────
async function doPoll(table: string) {
  const state = tableStates.get(table)
  if (!state || !config) return
  const endpoint = config.endpoints[table]
  if (!endpoint) return

  state.polling = true
  broadcastStatus(table)

  try {
    // Ensure MATINH lookup is loaded before bus route normalization
    if (table === 'busRoutes') await ensureMatinhLoaded()
    // Ensure enrichment lookups are loaded before schedule normalization
    if (table === 'fixedSchedules') await ensureNotificationsLoaded()
    if (table === 'busSchedules') await ensureBusLookupLoaded()

    const rawRows = await fetchTable(endpoint)

    // Normalize via TABLE_CONFIG registry (off main thread)
    const tableConfig = TABLE_CONFIG[table]
    const normalized = tableConfig ? tableConfig.normalizer(rawRows) : rawRows

    // Per-record diff using configured key field
    const newHashMap = new Map<string, string>()
    const changedRecords: unknown[] = []
    const keyField = tableConfig?.keyField || ''

    for (let i = 0; i < normalized.length; i++) {
      const item = normalized[i] as Record<string, unknown>
      const key = keyField && item[keyField] ? String(item[keyField]) : String(i)
      const hash = hashRecord(item)
      newHashMap.set(key, hash)
      if (state.hashMap.get(key) !== hash) {
        changedRecords.push(item)
      }
    }

    const hasChanges = changedRecords.length > 0 || state.hashMap.size !== newHashMap.size
    const isInitial = state.hashMap.size === 0

    console.log(
      `[SharedWorker] ${table}: prev=${state.hashMap.size} new=${newHashMap.size} changed=${changedRecords.length}`,
    )

    state.hashMap = newHashMap
    state.normalizedCache = normalized
    state.lastPollAt = new Date().toISOString()

    if (hasChanges) {
      state.consecutiveNoChanges = 0
      broadcast(table, { type: 'data', table, data: normalized, changed: changedRecords, isInitial })
    } else {
      state.consecutiveNoChanges++
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.warn(`[SharedWorker] ${table} poll error: ${msg}`)
      broadcast(table, { type: 'error', table, message: msg })
    }
  } finally {
    state.polling = false
    broadcastStatus(table)
    scheduleNextPoll(table)
  }
}

function broadcastStatus(table: string) {
  const state = tableStates.get(table)
  if (!state) return
  broadcast(table, {
    type: 'status',
    table,
    polling: state.polling,
    interval: getInterval(state.consecutiveNoChanges),
    lastPollAt: state.lastPollAt,
  })
}

// ─── Schedule ───────────────────────────────────────────────────
function scheduleNextPoll(table: string) {
  const state = tableStates.get(table)
  if (!state || state.subscribers.size === 0) return

  if (state.timerId) clearTimeout(state.timerId)

  // Pause polling when all tabs are hidden
  if (allTabsHidden()) {
    console.log(`[SharedWorker] ${table}: all tabs hidden, pausing`)
    state.timerId = null
    return
  }

  const interval = getInterval(state.consecutiveNoChanges)
  state.timerId = setTimeout(() => doPoll(table), interval)
}

function resumePollingForVisibleTabs() {
  for (const [table, state] of tableStates) {
    if (state.subscribers.size > 0 && !state.timerId && !state.polling) {
      console.log(`[SharedWorker] ${table}: tab visible, resuming`)
      doPoll(table)
    }
  }
}

// ─── Subscriber Management ──────────────────────────────────────
function getOrCreateTableState(table: string): TableState {
  let state = tableStates.get(table)
  if (!state) {
    state = {
      subscribers: new Set(),
      consecutiveNoChanges: 0,
      timerId: null,
      hashMap: new Map(),
      normalizedCache: [],
      lastPollAt: null,
      polling: false,
    }
    tableStates.set(table, state)
  }
  return state
}

function addSubscriber(port: MessagePort, table: string) {
  const state = getOrCreateTableState(table)

  const isFirstSubscriber = state.subscribers.size === 0
  state.subscribers.add(port)

  // Send cached data immediately if available
  if (state.normalizedCache.length > 0) {
    port.postMessage({ type: 'cache', table, data: state.normalizedCache } satisfies WorkerEvent)
  }

  // First subscriber → start polling
  if (isFirstSubscriber && config) {
    console.log(`[SharedWorker] ${table}: first subscriber, starting poll`)
    doPoll(table)
  }
}

function removeSubscriber(port: MessagePort, table: string) {
  const state = tableStates.get(table)
  if (!state) return
  state.subscribers.delete(port)

  // No subscribers → stop polling
  if (state.subscribers.size === 0 && state.timerId) {
    clearTimeout(state.timerId)
    state.timerId = null
    console.log(`[SharedWorker] ${table}: no subscribers, stopped polling`)
  }
}

function removePortFromAll(port: MessagePort) {
  connectedPorts.delete(port)
  portVisibility.delete(port)
  for (const [table] of tableStates) {
    removeSubscriber(port, table)
  }
}

// ─── Connection Handler ─────────────────────────────────────────
self.onconnect = (event: MessageEvent) => {
  const port = event.ports[0]
  port.start()
  connectedPorts.add(port)
  portVisibility.set(port, false) // assume visible

  port.onmessage = (e: MessageEvent<WorkerCommand>) => {
    const msg = e.data

    switch (msg.type) {
      case 'config':
        config = msg.config
        break

      case 'subscribe':
        addSubscriber(port, msg.table)
        break

      case 'unsubscribe':
        removeSubscriber(port, msg.table)
        break

      case 'poll-now': {
        const state = tableStates.get(msg.table)
        if (state) {
          state.consecutiveNoChanges = 0 // reset adaptive interval
          if (state.timerId) clearTimeout(state.timerId)
          doPoll(msg.table)
        }
        break
      }

      case 'visibility': {
        const wasAllHidden = allTabsHidden()
        portVisibility.set(port, msg.hidden)
        const nowAllHidden = allTabsHidden()

        // Transition: all hidden → at least one visible → resume polling
        if (wasAllHidden && !nowAllHidden) {
          resumePollingForVisibleTabs()
        }
        break
      }
    }
  }

  // Cleanup on port close (tab navigated away or closed)
  port.addEventListener('messageerror', () => removePortFromAll(port))
}

export {}
