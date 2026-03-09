/**
 * In-memory cache with TTL support
 * Reduces Firebase RTDB reads by caching frequently accessed data
 */

interface CacheEntry<T> {
  data: T
  expiry: number
  tags: string[]
}

interface CacheOptions {
  ttl?: number // Time to live in seconds
  tags?: string[] // Tags for cache invalidation
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 60 // 60 seconds default

  // TTL presets for different data types
  static TTL = {
    SHORT: 30,      // 30s - for frequently changing data (dispatch)
    MEDIUM: 120,    // 2min - for moderately changing data (service charges)
    LONG: 300,      // 5min - for rarely changing data (vehicles, routes)
    STATIC: 600,    // 10min - for static data (provinces, vehicle types)
  }

  /**
   * Get cached value or execute getter function
   */
  async getOrSet<T>(
    key: string,
    getter: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== undefined) {
      return cached
    }

    const data = await getter()
    this.set(key, data, options)
    return data
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return undefined
    }

    return entry.data as T
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl ?? this.defaultTTL
    const tags = options.tags ?? []

    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl * 1000,
      tags,
    })
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Invalidate all entries with specific tag
   */
  invalidateByTag(tag: string): number {
    let count = 0
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  /**
   * Invalidate entries matching pattern
   */
  invalidateByPattern(pattern: string): number {
    let count = 0
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let count = 0
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }
}

// Singleton instance
export const cache = new MemoryCache()

// Cache key generators
export const cacheKeys = {
  // Collections
  vehicles: () => 'vehicles:all',
  vehicleById: (id: string) => `vehicles:${id}`,
  vehiclesByOperator: (operatorId: string) => `vehicles:operator:${operatorId}`,
  
  drivers: () => 'drivers:all',
  driverById: (id: string) => `drivers:${id}`,
  driversByOperator: (operatorId: string) => `drivers:operator:${operatorId}`,
  
  routes: () => 'routes:all',
  routeById: (id: string) => `routes:${id}`,
  
  operators: () => 'operators:all',
  operatorById: (id: string) => `operators:${id}`,
  
  schedules: () => 'schedules:all',
  schedulesByRoute: (routeId: string) => `schedules:route:${routeId}`,
  
  services: () => 'services:all',
  serviceFormulas: () => 'service-formulas:all',
  
  vehicleTypes: () => 'vehicle-types:all',
  vehicleBadges: () => 'vehicle-badges:all',
  shifts: () => 'shifts:all',
  locations: () => 'locations:all',
  provinces: () => 'provinces:all',
  
  // Dispatch - shorter TTL due to frequent changes
  dispatchAll: () => 'dispatch:all',
  dispatchById: (id: string) => `dispatch:${id}`,
  dispatchByStatus: (status: string) => `dispatch:status:${status}`,
  
  // Service charges
  serviceChargesByDispatch: (dispatchId: string) => `service-charges:dispatch:${dispatchId}`,
}

// Cache tags for invalidation
export const cacheTags = {
  VEHICLES: 'vehicles',
  DRIVERS: 'drivers',
  ROUTES: 'routes',
  OPERATORS: 'operators',
  SCHEDULES: 'schedules',
  SERVICES: 'services',
  DISPATCH: 'dispatch',
  SERVICE_CHARGES: 'service-charges',
  STATIC: 'static', // For rarely changing data
}

// Auto cleanup every 5 minutes
setInterval(() => {
  const cleaned = cache.cleanup()
  if (cleaned > 0) {
    console.log(`[Cache] Cleaned ${cleaned} expired entries`)
  }
}, 5 * 60 * 1000)
