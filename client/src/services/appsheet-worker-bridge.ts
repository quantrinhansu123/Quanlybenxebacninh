/**
 * Worker bridge - wraps SharedWorker MessagePort communication
 * Singleton: all React hooks share one bridge instance
 * Falls back to main-thread polling on iOS Safari (no SharedWorker support)
 */
import { appsheetConfig } from '@/config/appsheet.config'
import { appsheetClient } from '@/services/appsheet-client.service'
import { normalizeVehicleRows } from '@/services/appsheet-normalize-vehicles'
import { normalizeBadgeRows } from '@/services/appsheet-normalize-badges'
import { normalizeOperatorRows } from '@/services/appsheet-normalize-operators'
import { normalizeFixedRouteRows } from '@/services/appsheet-normalize-fixed-routes'
import { normalizeBusRouteRows } from '@/services/appsheet-normalize-bus-routes'
import { normalizeScheduleRows } from '@/services/appsheet-normalize-schedules'
import { normalizeBusScheduleRows } from '@/services/appsheet-normalize-bus-schedules'
import { enrichRows } from '@/services/appsheet-sync-utils'
import type { WorkerEvent } from '@/workers/appsheet-shared-worker'

type WorkerEventCallback = (event: WorkerEvent) => void
type FallbackNormalizeResult = { normalized: unknown[]; keyField: string }

/** cyrb53 hash (same as worker) */
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

class AppSheetWorkerBridge {
  private port: MessagePort | null = null
  private listeners = new Map<string, Set<WorkerEventCallback>>()
  private fallbackMode = false

  // Fallback state (iOS Safari: main-thread polling)
  private fallbackTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private fallbackHashMaps = new Map<string, Map<string, string>>()
  private fallbackNoChangeCount = new Map<string, number>()
  private fallbackMatinhMap: Map<string, string> | null = null
  private fallbackNotificationsCache: Record<string, unknown>[] | null = null
  private fallbackBusLookupCache: Record<string, unknown>[] | null = null

  constructor() {
    if (typeof SharedWorker !== 'undefined') {
      this.initSharedWorker()
    } else {
      this.fallbackMode = true
      console.log('[WorkerBridge] Fallback mode (no SharedWorker)')
    }
  }

  private initSharedWorker() {
    try {
      const worker = new SharedWorker(
        new URL('../workers/appsheet-shared-worker.ts', import.meta.url),
        { type: 'module', name: 'appsheet-sync' },
      )
      this.port = worker.port
      this.port.start()

      // Send config to worker
      this.port.postMessage({
        type: 'config',
        config: {
          apiKey: appsheetConfig.apiKey,
          authHeader: appsheetConfig.authHeader,
          timeoutMs: appsheetConfig.timeoutMs,
          retries: appsheetConfig.retries,
          retryDelayMs: appsheetConfig.retryDelayMs,
          endpoints: appsheetConfig.endpoints,
          adaptive: appsheetConfig.adaptive,
        },
      })

      // Route worker events to listeners
      this.port.onmessage = (e: MessageEvent<WorkerEvent>) => {
        this.handleEvent(e.data)
      }

      // Track tab visibility for worker
      document.addEventListener('visibilitychange', this.handleVisibility)

      console.log('[WorkerBridge] SharedWorker connected')
    } catch (err) {
      console.warn('[WorkerBridge] SharedWorker failed, using fallback:', err)
      this.fallbackMode = true
    }
  }

  private handleVisibility = () => {
    this.port?.postMessage({
      type: 'visibility',
      hidden: document.hidden,
    })
  }

  private handleEvent(event: WorkerEvent) {
    const listeners = this.listeners.get(event.table)
    if (!listeners) return
    for (const cb of listeners) {
      try { cb(event) } catch { /* listener error */ }
    }
  }

  // ─── Fallback: main-thread polling (iOS Safari) ───────────────
  private async ensureFallbackMatinhMap() {
    if (this.fallbackMatinhMap) return
    try {
      const rows = await appsheetClient.fetchByName('matinh')
      const lookup = new Map<string, string>()
      for (const row of rows) {
        const code = typeof row['MaTinh'] === 'string' ? row['MaTinh'].trim() : ''
        const name = typeof row['TenTinh'] === 'string' ? row['TenTinh'].trim() : ''
        if (code && name) lookup.set(code, name)
      }
      this.fallbackMatinhMap = lookup
    } catch {
      this.fallbackMatinhMap = new Map()
    }
  }

  private async ensureFallbackNotifications() {
    if (this.fallbackNotificationsCache) return
    try {
      this.fallbackNotificationsCache = await appsheetClient.fetchByName('notifications')
    } catch {
      this.fallbackNotificationsCache = []
    }
  }

  private async ensureFallbackBusLookup() {
    if (this.fallbackBusLookupCache) return
    try {
      this.fallbackBusLookupCache = await appsheetClient.fetchByName('busLookup')
    } catch {
      this.fallbackBusLookupCache = []
    }
  }

  private async normalizeFallbackRows(
    table: string,
    rawRows: Record<string, unknown>[],
  ): Promise<FallbackNormalizeResult> {
    switch (table) {
      case 'vehicles':
        return { normalized: normalizeVehicleRows(rawRows), keyField: 'plateNumber' }
      case 'badges':
        return { normalized: normalizeBadgeRows(rawRows), keyField: 'badgeNumber' }
      case 'operators':
        return { normalized: normalizeOperatorRows(rawRows), keyField: 'firebaseId' }
      case 'fixedRoutes':
        return { normalized: normalizeFixedRouteRows(rawRows), keyField: 'routeCode' }
      case 'busRoutes':
        await this.ensureFallbackMatinhMap()
        return {
          normalized: normalizeBusRouteRows(rawRows, this.fallbackMatinhMap ?? undefined),
          keyField: 'firebaseId',
        }
      case 'fixedSchedules':
        await this.ensureFallbackNotifications()
        return {
          normalized: normalizeScheduleRows(
            enrichRows(rawRows, this.fallbackNotificationsCache || [], {
              refKey: 'Ref_ThongBaoKhaiThac',
              lookupIdKey: 'ID_TB',
              mappings: [
                { from: 'Ref_Tuyen', to: 'Ref_Tuyen' },
                { from: 'Ref_DonVi', to: 'Ref_DonVi' },
              ],
            }),
          ),
          keyField: 'firebaseId',
        }
      case 'busSchedules':
        await this.ensureFallbackBusLookup()
        return {
          normalized: normalizeBusScheduleRows(
            enrichRows(rawRows, this.fallbackBusLookupCache || [], {
              refKey: 'BieuDo',
              lookupIdKey: 'ID_BieuDo',
              mappings: [
                { from: 'TuyenBuyt', to: 'Ref_Tuyen' },
                { from: 'DonViKhaiThac', to: 'Ref_DonVi' },
              ],
            }),
          ),
          keyField: 'firebaseId',
        }
      default:
        return { normalized: rawRows, keyField: '' }
    }
  }

  private async fallbackPoll(table: string) {
    const endpoint = appsheetConfig.endpoints[table]
    if (!endpoint || !appsheetConfig.apiKey) return

    this.emitEvent(table, {
      type: 'status', table, polling: true,
      interval: this.getFallbackInterval(table),
      lastPollAt: null,
    })

    try {
      const rawRows = await appsheetClient.fetchTable(endpoint)
      const { normalized, keyField } = await this.normalizeFallbackRows(table, rawRows)
      const prevMap = this.fallbackHashMaps.get(table) || new Map()
      const newMap = new Map<string, string>()
      const changed: unknown[] = []

      for (let i = 0; i < normalized.length; i++) {
        const item = normalized[i] as Record<string, unknown>
        const key = keyField && item[keyField] ? String(item[keyField]) : String(i)
        const hash = hashRecord(item)
        newMap.set(key, hash)
        if (prevMap.get(key) !== hash) changed.push(item)
      }

      const hasChanges = changed.length > 0 || prevMap.size !== newMap.size
      const isInitial = prevMap.size === 0
      this.fallbackHashMaps.set(table, newMap)

      if (hasChanges) {
        this.fallbackNoChangeCount.set(table, 0)
        this.emitEvent(table, { type: 'data', table, data: normalized, changed, isInitial })
      } else {
        this.fallbackNoChangeCount.set(table, (this.fallbackNoChangeCount.get(table) || 0) + 1)
      }

      this.emitEvent(table, {
        type: 'status', table, polling: false,
        interval: this.getFallbackInterval(table),
        lastPollAt: new Date().toISOString(),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      this.emitEvent(table, { type: 'error', table, message: msg })
    } finally {
      this.scheduleFallbackPoll(table)
    }
  }

  private getFallbackInterval(table: string): number {
    const count = this.fallbackNoChangeCount.get(table) || 0
    const intervals = appsheetConfig.adaptive.intervals
    return intervals[Math.min(count, intervals.length - 1)]
  }

  private scheduleFallbackPoll(table: string) {
    const existing = this.fallbackTimers.get(table)
    if (existing) clearTimeout(existing)

    if (!this.listeners.has(table) || this.listeners.get(table)!.size === 0) return

    const timer = setTimeout(() => {
      void this.fallbackPoll(table)
    }, this.getFallbackInterval(table))
    this.fallbackTimers.set(table, timer)
  }

  private emitEvent(_table: string, event: WorkerEvent) {
    this.handleEvent(event)
  }

  // ─── Public API ───────────────────────────────────────────────
  /**
   * Subscribe to table updates. Returns unsubscribe function.
   * Worker handles normalization + diff internally via TABLE_CONFIG.
   */
  subscribe(table: string, callback: WorkerEventCallback): () => void {
    if (!this.listeners.has(table)) {
      this.listeners.set(table, new Set())
    }
    this.listeners.get(table)!.add(callback)

    if (this.fallbackMode) {
      // Start main-thread polling for this table
      if (this.listeners.get(table)!.size === 1) {
        void this.fallbackPoll(table)
      }
    } else {
      this.port?.postMessage({ type: 'subscribe', table })
    }

    return () => {
      const set = this.listeners.get(table)
      if (set) {
        set.delete(callback)
        if (set.size === 0) {
          this.listeners.delete(table)
          if (this.fallbackMode) {
            const timer = this.fallbackTimers.get(table)
            if (timer) { clearTimeout(timer); this.fallbackTimers.delete(table) }
          } else {
            this.port?.postMessage({ type: 'unsubscribe', table })
          }
        }
      }
    }
  }

  /** Force immediate poll, resets adaptive interval */
  pollNow(table: string) {
    if (this.fallbackMode) {
      this.fallbackNoChangeCount.set(table, 0)
      const timer = this.fallbackTimers.get(table)
      if (timer) clearTimeout(timer)
      void this.fallbackPoll(table)
    } else {
      this.port?.postMessage({ type: 'poll-now', table })
    }
  }

  /** Check if running in fallback mode (no SharedWorker) */
  get isFallback() {
    return this.fallbackMode
  }

  destroy() {
    document.removeEventListener('visibilitychange', this.handleVisibility)
    this.port?.close()
    for (const timer of this.fallbackTimers.values()) {
      clearTimeout(timer)
    }
  }
}

// Singleton instance shared by all hooks
export const workerBridge = new AppSheetWorkerBridge()
