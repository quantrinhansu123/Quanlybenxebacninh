/**
 * Cached Data Service
 * Provides cached access to frequently accessed static/semi-static data
 * Migrated to Drizzle ORM
 */

import { db, eq, desc, operators, vehicleTypes, vehicles, drivers, routes, vehicleBadges, shifts } from '../db/queries/index.js'
import { cache, cacheKeys, cacheTags, MemoryCache } from '../lib/cache.js'

// Type definitions
interface Operator {
  id: string
  name: string
  code: string
  [key: string]: any
}

interface VehicleType {
  id: string
  name: string
  [key: string]: any
}

interface Route {
  id: string
  routeCode: string
  departureStation?: string | null
  arrivalStation?: string | null
  [key: string]: any
}

interface Schedule {
  id: string
  routeId: string
  [key: string]: any
}

interface Vehicle {
  id: string
  plateNumber: string
  operatorId?: string | null
  vehicleTypeId?: string | null
  [key: string]: any
}

interface Driver {
  id: string
  fullName: string
  operatorId?: string | null
  [key: string]: any
}

/**
 * Cached Data Service - singleton
 */
class CachedDataService {
  // ================== OPERATORS ==================
  async getAllOperators(): Promise<Operator[]> {
    return cache.getOrSet(
      cacheKeys.operators(),
      async () => {
        if (!db) throw new Error('Database not initialized')
        return await db.select().from(operators)
      },
      { ttl: MemoryCache.TTL.LONG, tags: [cacheTags.OPERATORS] }
    )
  }

  async getOperatorById(id: string): Promise<Operator | null> {
    return cache.getOrSet(
      cacheKeys.operatorById(id),
      async () => {
        if (!db) throw new Error('Database not initialized')
        const results = await db.select().from(operators).where(eq(operators.id, id)).limit(1)
        return results[0] ?? null
      },
      { ttl: MemoryCache.TTL.LONG, tags: [cacheTags.OPERATORS] }
    )
  }

  async getOperatorsMap(): Promise<Map<string, Operator>> {
    const operators = await this.getAllOperators()
    return new Map(operators.map((op) => [op.id, op]))
  }

  // ================== VEHICLE TYPES ==================
  async getAllVehicleTypes(): Promise<VehicleType[]> {
    return cache.getOrSet(
      cacheKeys.vehicleTypes(),
      async () => {
        if (!db) throw new Error('Database not initialized')
        return await db.select().from(vehicleTypes)
      },
      { ttl: MemoryCache.TTL.STATIC, tags: [cacheTags.STATIC] }
    )
  }

  async getVehicleTypesMap(): Promise<Map<string, VehicleType>> {
    const types = await this.getAllVehicleTypes()
    return new Map(types.map((t) => [t.id, t]))
  }

  // ================== ROUTES ==================
  async getAllRoutes(): Promise<Route[]> {
    return cache.getOrSet(
      cacheKeys.routes(),
      async () => {
        if (!db) throw new Error('Database not initialized')
        return await db.select().from(routes)
      },
      { ttl: MemoryCache.TTL.LONG, tags: [cacheTags.ROUTES] }
    )
  }

  async getRouteById(id: string): Promise<Route | null> {
    return cache.getOrSet(
      cacheKeys.routeById(id),
      async () => {
        if (!db) throw new Error('Database not initialized')
        const results = await db.select().from(routes).where(eq(routes.id, id)).limit(1)
        return results[0] ?? null
      },
      { ttl: MemoryCache.TTL.LONG, tags: [cacheTags.ROUTES] }
    )
  }

  async getRoutesMap(): Promise<Map<string, Route>> {
    const routes = await this.getAllRoutes()
    return new Map(routes.map((r) => [r.id, r]))
  }

  // ================== SCHEDULES ==================
  // TODO: Schedules table not in Drizzle schema - create schema or add to existing tables
  async getAllSchedules(): Promise<Schedule[]> {
    return cache.getOrSet(
      cacheKeys.schedules(),
      async () => {
        // Stub: schedules table not in Drizzle schema
        console.warn('[CachedDataService] schedules table not migrated to Drizzle')
        return []
      },
      { ttl: MemoryCache.TTL.LONG, tags: [cacheTags.SCHEDULES] }
    )
  }

  async getSchedulesByRoute(routeId: string): Promise<Schedule[]> {
    return cache.getOrSet(
      cacheKeys.schedulesByRoute(routeId),
      async () => {
        // Stub: schedules table not in Drizzle schema
        console.warn('[CachedDataService] schedules table not migrated to Drizzle')
        return []
      },
      { ttl: MemoryCache.TTL.LONG, tags: [cacheTags.SCHEDULES] }
    )
  }

  // ================== VEHICLES ==================
  async getAllVehicles(activeOnly = true): Promise<Vehicle[]> {
    const cacheKey = activeOnly ? cacheKeys.vehicles() : `${cacheKeys.vehicles()}:all`
    return cache.getOrSet(
      cacheKey,
      async () => {
        if (!db) throw new Error('Database not initialized')
        let query = db.select().from(vehicles).orderBy(desc(vehicles.createdAt))
        if (activeOnly) {
          query = query.where(eq(vehicles.isActive, true)) as any
        }
        return await query
      },
      { ttl: MemoryCache.TTL.MEDIUM, tags: [cacheTags.VEHICLES] }
    )
  }

  async getVehicleById(id: string): Promise<Vehicle | null> {
    return cache.getOrSet(
      cacheKeys.vehicleById(id),
      async () => {
        if (!db) throw new Error('Database not initialized')
        const results = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1)
        return results[0] ?? null
      },
      { ttl: MemoryCache.TTL.MEDIUM, tags: [cacheTags.VEHICLES] }
    )
  }

  async getVehiclesMap(): Promise<Map<string, Vehicle>> {
    const vehicles = await this.getAllVehicles()
    return new Map(vehicles.map((v) => [v.id, v]))
  }

  // ================== DRIVERS ==================
  async getAllDrivers(): Promise<Driver[]> {
    return cache.getOrSet(
      cacheKeys.drivers(),
      async () => {
        if (!db) throw new Error('Database not initialized')
        return await db.select().from(drivers).orderBy(desc(drivers.createdAt))
      },
      { ttl: MemoryCache.TTL.MEDIUM, tags: [cacheTags.DRIVERS] }
    )
  }

  async getDriverById(id: string): Promise<Driver | null> {
    return cache.getOrSet(
      cacheKeys.driverById(id),
      async () => {
        if (!db) throw new Error('Database not initialized')
        const results = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1)
        return results[0] ?? null
      },
      { ttl: MemoryCache.TTL.MEDIUM, tags: [cacheTags.DRIVERS] }
    )
  }

  async getDriversMap(): Promise<Map<string, Driver>> {
    const drivers = await this.getAllDrivers()
    return new Map(drivers.map((d) => [d.id, d]))
  }

  // ================== SERVICES ==================
  // TODO: Services table not in Drizzle schema - create schema or add to existing tables
  async getAllServices(): Promise<any[]> {
    return cache.getOrSet(
      cacheKeys.services(),
      async () => {
        // Stub: services table not in Drizzle schema
        console.warn('[CachedDataService] services table not migrated to Drizzle')
        return []
      },
      { ttl: MemoryCache.TTL.LONG, tags: [cacheTags.SERVICES] }
    )
  }

  async getAllServiceFormulas(): Promise<any[]> {
    return cache.getOrSet(
      cacheKeys.serviceFormulas(),
      async () => {
        // Stub: service_formulas table not in Drizzle schema
        console.warn('[CachedDataService] service_formulas table not migrated to Drizzle')
        return []
      },
      { ttl: MemoryCache.TTL.LONG, tags: [cacheTags.SERVICES] }
    )
  }

  // ================== STATIC DATA ==================
  async getAllShifts(): Promise<any[]> {
    return cache.getOrSet(
      cacheKeys.shifts(),
      async () => {
        if (!db) throw new Error('Database not initialized')
        return await db.select().from(shifts)
      },
      { ttl: MemoryCache.TTL.STATIC, tags: [cacheTags.STATIC] }
    )
  }

  async getAllLocations(): Promise<any[]> {
    return cache.getOrSet(
      cacheKeys.locations(),
      async () => {
        // Stub: locations table not in Drizzle schema
        console.warn('[CachedDataService] locations table not migrated to Drizzle')
        return []
      },
      { ttl: MemoryCache.TTL.STATIC, tags: [cacheTags.STATIC] }
    )
  }

  async getAllProvinces(): Promise<any[]> {
    return cache.getOrSet(
      cacheKeys.provinces(),
      async () => {
        // Stub: provinces table not in Drizzle schema
        console.warn('[CachedDataService] provinces table not migrated to Drizzle')
        return []
      },
      { ttl: MemoryCache.TTL.STATIC, tags: [cacheTags.STATIC] }
    )
  }

  async getAllVehicleBadges(): Promise<any[]> {
    return cache.getOrSet(
      cacheKeys.vehicleBadges(),
      async () => {
        if (!db) throw new Error('Database not initialized')
        return await db.select().from(vehicleBadges)
      },
      { ttl: MemoryCache.TTL.LONG, tags: [cacheTags.STATIC] }
    )
  }

  // ================== CACHE INVALIDATION ==================
  invalidateVehicles(): void {
    cache.invalidateByTag(cacheTags.VEHICLES)
  }

  invalidateDrivers(): void {
    cache.invalidateByTag(cacheTags.DRIVERS)
  }

  invalidateOperators(): void {
    cache.invalidateByTag(cacheTags.OPERATORS)
  }

  invalidateRoutes(): void {
    cache.invalidateByTag(cacheTags.ROUTES)
  }

  invalidateSchedules(): void {
    cache.invalidateByTag(cacheTags.SCHEDULES)
  }

  invalidateServices(): void {
    cache.invalidateByTag(cacheTags.SERVICES)
  }

  invalidateDispatch(): void {
    cache.invalidateByTag(cacheTags.DISPATCH)
  }

  invalidateAll(): void {
    cache.clear()
  }

  // ================== PRELOAD ==================
  async preloadCommonData(): Promise<void> {
    console.log('[Cache] Preloading common data...')
    const start = Date.now()

    // Load in batches to avoid exhausting connection pool
    // Batch 1: Small, critical data (fast) - BLOCKING
    await Promise.all([
      this.getAllOperators(),
      this.getAllVehicleTypes(),
      this.getAllRoutes(),
      this.getAllShifts(),
    ])

    // Batch 2: Medium data - BLOCKING
    await Promise.all([
      this.getAllSchedules(),
      this.getAllServices(),
    ])

    console.log(`[Cache] Preloaded critical data in ${Date.now() - start}ms`)

    // Batch 3: Large data - BACKGROUND (non-blocking)
    // These run after critical data is ready
    setImmediate(() => {
      Promise.all([
        this.getAllVehicles(),
        this.getAllDrivers(),
        this.getAllVehicleBadges(),
      ]).then(() => {
        console.log(`[Cache] Background data loaded in ${Date.now() - start}ms`)
      }).catch(err => {
        console.error('[Cache] Background data load failed:', err)
      })
    })
  }
}

// Singleton export
export const cachedData = new CachedDataService()
