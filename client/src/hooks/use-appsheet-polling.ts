/**
 * AppSheet polling hook - subscribes to SharedWorker via bridge
 * Worker handles: fetch, normalize, hash diff, adaptive interval, caching
 * Hook handles: React state + leader-based DB sync
 *
 * BACKWARD COMPATIBLE: Same interface as Phase 0 - QuanLyXe.tsx needs ZERO changes
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { workerBridge } from '@/services/appsheet-worker-bridge'
import { createLeaderElection } from '@/services/appsheet-leader-election'
import type { WorkerEvent } from '@/workers/appsheet-shared-worker'

interface UseAppSheetPollingOptions<TNormalized> {
  /** Key from appsheetConfig.endpoints (e.g. 'vehicles') */
  endpointKey: string
  /** Transform raw rows → app-compatible format (used only in fallback mode) */
  normalize: (rows: Record<string, unknown>[]) => TNormalized[]
  /** Called with normalized data when diff detected */
  onData: (data: TNormalized[], isInitial: boolean) => void
  /** Optional: push changed data to backend for DB persistence */
  onSyncToDb?: (data: TNormalized[]) => void
  /** Polling interval in ms - ignored (worker uses adaptive intervals) */
  intervalMs?: number
  /** Enable/disable polling (default: true) */
  enabled?: boolean
  /** Extract unique key per record - ignored (worker uses TABLE_CONFIG) */
  getKey?: (item: TNormalized, index: number) => string
}

interface UseAppSheetPollingResult {
  isPolling: boolean
  lastPollAt: Date | null
  error: string | null
  pollNow: () => void
}

export function useAppSheetPolling<TNormalized>(
  options: UseAppSheetPollingOptions<TNormalized>,
): UseAppSheetPollingResult {
  const { endpointKey, onData, onSyncToDb, enabled = true } = options

  const [isPolling, setIsPolling] = useState(false)
  const [lastPollAt, setLastPollAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Stable refs for callbacks to avoid re-subscribing
  const onDataRef = useRef(onData)
  onDataRef.current = onData
  const onSyncToDbRef = useRef(onSyncToDb)
  onSyncToDbRef.current = onSyncToDb

  // Leader election: only leader tab syncs to DB
  const isLeaderRef = useRef(false)

  // Leader election setup
  useEffect(() => {
    const election = createLeaderElection((isLeader) => {
      isLeaderRef.current = isLeader
      workerBridge.pollNow(endpointKey) // re-evaluate on leader change
    })
    isLeaderRef.current = election.isLeader
    return () => election.destroy()
  }, [endpointKey])

  // Subscribe to worker bridge
  useEffect(() => {
    if (!enabled) return

    const handleEvent = (event: WorkerEvent) => {
      switch (event.type) {
        case 'data':
          onDataRef.current(event.data as TNormalized[], event.isInitial)
          // Only leader tab syncs changed records to backend
          if (
            event.changed.length > 0 &&
            isLeaderRef.current &&
            onSyncToDbRef.current
          ) {
            Promise.resolve()
              .then(() => onSyncToDbRef.current?.(event.changed as TNormalized[]))
              .catch(() => {/* silent - fire and forget */})
          }
          break

        case 'cache':
          // New tab: receive cached data immediately (no poll wait)
          onDataRef.current(event.data as TNormalized[], true)
          break

        case 'status':
          setIsPolling(event.polling)
          if (event.lastPollAt) setLastPollAt(new Date(event.lastPollAt))
          break

        case 'error':
          setError(event.message)
          break
      }
    }

    const unsubscribe = workerBridge.subscribe(endpointKey, handleEvent)
    return unsubscribe
  }, [enabled, endpointKey])

  const pollNow = useCallback(() => {
    workerBridge.pollNow(endpointKey)
  }, [endpointKey])

  return { isPolling, lastPollAt, error, pollNow }
}
