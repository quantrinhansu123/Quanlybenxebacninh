/**
 * Lightweight query cache using Zustand
 * Provides caching, deduplication, and background refresh for API calls
 */

import { useEffect, useRef } from 'react'
import { create } from 'zustand'

interface CacheEntry<T> {
  data: T
  timestamp: number
  isStale: boolean
}

interface QueryState {
  cache: Map<string, CacheEntry<any>>
  pending: Map<string, Promise<any>>
  
  // Get cached data
  get: <T>(key: string) => T | undefined
  
  // Set cache entry
  set: <T>(key: string, data: T, ttl?: number) => void
  
  // Check if data is stale
  isStale: (key: string, maxAge: number) => boolean
  
  // Invalidate cache entries
  invalidate: (pattern: string) => void
  invalidateAll: () => void
  
  // Deduplicated fetch
  fetchWithCache: <T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; staleTime?: number; forceRefresh?: boolean }
  ) => Promise<T>
}

// Default TTL values in milliseconds
export const CACHE_TTL = {
  SHORT: 30 * 1000,       // 30 seconds - frequently changing data
  MEDIUM: 2 * 60 * 1000,  // 2 minutes - moderately changing data
  LONG: 5 * 60 * 1000,    // 5 minutes - rarely changing data
  STATIC: 10 * 60 * 1000, // 10 minutes - static data
}

export const useQueryCache = create<QueryState>((set, get) => ({
  cache: new Map(),
  pending: new Map(),

  get: <T>(key: string): T | undefined => {
    const entry = get().cache.get(key)
    return entry?.data as T | undefined
  },

  set: <T>(key: string, data: T, ttl = CACHE_TTL.MEDIUM) => {
    set((state) => {
      const newCache = new Map(state.cache)
      newCache.set(key, {
        data,
        timestamp: Date.now(),
        isStale: false,
      })
      
      // Auto-mark as stale after TTL
      setTimeout(() => {
        set((s) => {
          const cache = new Map(s.cache)
          const entry = cache.get(key)
          if (entry) {
            cache.set(key, { ...entry, isStale: true })
          }
          return { cache }
        })
      }, ttl)
      
      return { cache: newCache }
    })
  },

  isStale: (key: string, maxAge: number): boolean => {
    const entry = get().cache.get(key)
    if (!entry) return true
    return entry.isStale || Date.now() - entry.timestamp > maxAge
  },

  invalidate: (pattern: string) => {
    set((state) => {
      const newCache = new Map(state.cache)
      const regex = new RegExp(pattern)
      for (const key of newCache.keys()) {
        if (regex.test(key)) {
          newCache.delete(key)
        }
      }
      return { cache: newCache }
    })
  },

  invalidateAll: () => {
    set({ cache: new Map() })
  },

  fetchWithCache: async <T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl?: number; staleTime?: number; forceRefresh?: boolean } = {}
  ): Promise<T> => {
    const { ttl = CACHE_TTL.MEDIUM, staleTime = ttl, forceRefresh = false } = options
    const state = get()

    // Return cached data if fresh and not force refresh
    if (!forceRefresh) {
      const cached = state.cache.get(key)
      if (cached && !state.isStale(key, staleTime)) {
        return cached.data as T
      }
    }

    // Deduplicate concurrent requests
    const pending = state.pending.get(key)
    if (pending) {
      return pending as Promise<T>
    }

    // Fetch fresh data
    const promise = fetcher()
      .then((data) => {
        get().set(key, data, ttl)
        return data
      })
      .catch((error) => {
        // Remove from pending on error so next call can retry
        set((s) => {
          const newPending = new Map(s.pending)
          newPending.delete(key)
          return { pending: newPending }
        })
        throw error
      })
      .finally(() => {
        set((s) => {
          const newPending = new Map(s.pending)
          newPending.delete(key)
          return { pending: newPending }
        })
      })

    set((s) => {
      const newPending = new Map(s.pending)
      newPending.set(key, promise)
      return { pending: newPending }
    })

    return promise
  },
}))

// Cache key generators
export const cacheKeys = {
  vehicles: () => 'vehicles',
  vehicleById: (id: string) => `vehicle:${id}`,
  
  drivers: () => 'drivers',
  driverById: (id: string) => `driver:${id}`,
  
  routes: () => 'routes',
  routeById: (id: string) => `route:${id}`,
  
  operators: () => 'operators',
  operatorById: (id: string) => `operator:${id}`,
  
  schedules: () => 'schedules',
  schedulesByRoute: (routeId: string) => `schedules:route:${routeId}`,
  
  dispatch: () => 'dispatch',
  dispatchById: (id: string) => `dispatch:${id}`,
  
  services: () => 'services',
  serviceCharges: (dispatchId: string) => `service-charges:${dispatchId}`,
  
  vehicleTypes: () => 'vehicle-types',
  vehicleBadges: () => 'vehicle-badges',
  shifts: () => 'shifts',
  locations: () => 'locations',
}

// Hook for cached queries - fixed to avoid setState during render
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttl?: number; staleTime?: number; enabled?: boolean } = {}
) {
  const { ttl, staleTime, enabled = true } = options
  const { fetchWithCache, get: getCached, isStale } = useQueryCache()

  // Use ref to store latest fetcher to avoid stale closure issues
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const cachedData = getCached<T>(key)
  const needsFetch = enabled && (cachedData === undefined || isStale(key, staleTime || ttl || CACHE_TTL.MEDIUM))

  // Move fetch to useEffect to avoid setState during render
  useEffect(() => {
    if (needsFetch) {
      fetchWithCache(key, () => fetcherRef.current(), { ttl, staleTime })
    }
  }, [needsFetch, key, fetchWithCache, ttl, staleTime])

  return {
    data: cachedData,
    isLoading: needsFetch && cachedData === undefined,
    refetch: () => fetchWithCache(key, () => fetcherRef.current(), { ttl, staleTime, forceRefresh: true }),
  }
}
