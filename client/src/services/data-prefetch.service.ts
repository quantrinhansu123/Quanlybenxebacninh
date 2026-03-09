/**
 * Data Prefetch Service
 * Preloads commonly used data in background after user authentication
 * This makes subsequent page navigation instant (<50ms)
 */

import { quanlyDataService } from './quanly-data.service'
import { driverService } from './driver.service'
import { routeService } from './route.service'
import { dashboardService } from './dashboard.service'
import { dispatchService } from './dispatch.service'

let isPrefetching = false
let prefetchPromise: Promise<void> | null = null

/**
 * Prefetch all commonly used data in background
 * Call this after successful login
 */
export async function prefetchAppData(): Promise<void> {
  // Prevent duplicate prefetch calls
  if (isPrefetching && prefetchPromise) {
    return prefetchPromise
  }

  isPrefetching = true
  console.log('[Prefetch] Starting background data prefetch...')
  const startTime = Date.now()

  prefetchPromise = (async () => {
    try {
      // Priority 1: Critical data for main pages (parallel)
      await Promise.all([
        quanlyDataService.getAll().catch(err => console.warn('[Prefetch] quanlyData failed:', err)),
        dashboardService.getDashboardData().catch(err => console.warn('[Prefetch] dashboard failed:', err)),
        dispatchService.getAll().catch(err => console.warn('[Prefetch] dispatch failed:', err)),
      ])

      console.log(`[Prefetch] Critical data loaded in ${Date.now() - startTime}ms`)

      // Priority 2: Secondary data (parallel, non-blocking)
      Promise.all([
        driverService.getAll().catch(err => console.warn('[Prefetch] drivers failed:', err)),
        routeService.getLegacy().catch(err => console.warn('[Prefetch] routes failed:', err)),
      ]).then(() => {
        console.log(`[Prefetch] All data loaded in ${Date.now() - startTime}ms`)
      })

    } catch (error) {
      console.error('[Prefetch] Error during prefetch:', error)
    } finally {
      isPrefetching = false
    }
  })()

  return prefetchPromise
}

/**
 * Clear all cached data
 * Call on logout
 */
export function clearAllCaches(): void {
  quanlyDataService.clearCache()
  driverService.clearCache()
  // routeService cache is cleared internally
  console.log('[Prefetch] All caches cleared')
}

/**
 * Check if prefetch is in progress
 */
export function isPrefetchInProgress(): boolean {
  return isPrefetching
}
