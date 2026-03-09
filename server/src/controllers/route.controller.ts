import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { routes } from '../db/schema/index.js'
import { users } from '../db/schema/users.js'
import { locations } from '../db/schema/locations.js'
import { eq, asc, and, or } from 'drizzle-orm'
import { z } from 'zod'
import type { AuthRequest } from '../middleware/auth.js'

// Cache for legacy routes
let legacyRoutesCache: { data: any[]; timestamp: number } | null = null
const LEGACY_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

interface ProvinceApiResponse {
  provinces?: Array<{ code: string; name: string }>
}

const PROVINCE_API_BASE_URL = 'https://production.cas.so/address-kit'
const PROVINCE_API_EFFECTIVE_DATE = '2024-01-01'
const PROVINCE_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
let provinceNameMapCache: { data: Map<string, string>; timestamp: number } | null = null
const LEGACY_PROVINCE_CODE_MAP: Record<string, string> = {
  '98': 'Bắc Giang',
  '99': 'Bắc Ninh',
  '29': 'Hà Nội',
  '20': 'Thái Nguyên',
}

const getProvinceNameMap = async (): Promise<Map<string, string>> => {
  if (provinceNameMapCache && Date.now() - provinceNameMapCache.timestamp < PROVINCE_CACHE_TTL) {
    return provinceNameMapCache.data
  }

  try {
    const res = await fetch(`${PROVINCE_API_BASE_URL}/${PROVINCE_API_EFFECTIVE_DATE}/provinces`)
    if (!res.ok) throw new Error(`Province API failed: ${res.status}`)

    const payload = await res.json() as ProvinceApiResponse
    const map = new Map<string, string>()
    for (const province of payload.provinces || []) {
      const code = (province.code || '').trim()
      const name = (province.name || '').trim()
      if (code && name) map.set(code, name)
    }

    provinceNameMapCache = { data: map, timestamp: Date.now() }
    return map
  } catch (error) {
    console.warn('[Routes] Failed to load province names, fallback to raw code:', error)
    return provinceNameMapCache?.data || new Map<string, string>()
  }
}

// Check if route type indicates a bus route (handles both old "bus" and normalized "Xe buýt")
const isBusRouteType = (routeType?: string | null, routeCode?: string | null): boolean => {
  const type = (routeType || '').trim().toLowerCase()
  const code = (routeCode || '').trim().toUpperCase()
  return type === 'bus' || type === 'xe buýt' || code.startsWith('BUS-')
}

const shouldUseRouteCodeOld = (routeCode?: string | null, routeCodeOld?: string | null, routeType?: string | null): boolean => {
  const oldCode = (routeCodeOld || '').trim()
  if (!oldCode) return false
  return isBusRouteType(routeType, routeCode)
}

const getDisplayRouteCode = (routeCode?: string | null, routeCodeOld?: string | null, routeType?: string | null): string => {
  if (shouldUseRouteCodeOld(routeCode, routeCodeOld, routeType)) {
    return (routeCodeOld || '').trim()
  }
  return (routeCode || '').trim()
}

const getDisplayProvince = (province?: string | null, provinceNameMap?: Map<string, string>): string | null => {
  const value = (province || '').trim()
  if (!value) return null
  if (!/^\d+$/.test(value)) return value

  const byRaw = provinceNameMap?.get(value)
  if (byRaw) return byRaw

  const byPad2 = provinceNameMap?.get(value.padStart(2, '0'))
  if (byPad2) return byPad2

  const byPad3 = provinceNameMap?.get(value.padStart(3, '0'))
  if (byPad3) return byPad3

  const byLegacy = LEGACY_PROVINCE_CODE_MAP[value]
  if (byLegacy) return byLegacy

  return value
}

const getDisplayRouteName = (
  departureStation?: string | null,
  arrivalStation?: string | null,
  routeCode?: string | null,
  routeCodeOld?: string | null,
  routeType?: string | null
): string => {
  const from = (departureStation || '').trim()
  const to = (arrivalStation || '').trim()
  if (from && to) return `${from} - ${to}`
  if (from) return from
  if (to) return to
  return getDisplayRouteCode(routeCode, routeCodeOld, routeType)
}

const normalizeBusRouteCode = (routeCode: string, routeCodeOld?: string | null): { routeCode: string; routeCodeOld: string | null } => {
  const rawCode = (routeCode || '').trim()
  const rawCodeOld = (routeCodeOld || '').trim()
  const withoutPrefix = rawCode.replace(/^BUS-/i, '').trim()
  const oldWithoutPrefix = rawCodeOld.replace(/^BUS-/i, '').trim()
  const normalizedOld = oldWithoutPrefix || withoutPrefix || null
  const normalizedCode = normalizedOld ? `BUS-${normalizedOld}` : `BUS-${withoutPrefix || rawCode}`
  return {
    routeCode: normalizedCode,
    routeCodeOld: normalizedOld,
  }
}

const formatRouteResponse = (route: any, provinceNameMap?: Map<string, string>) => ({
  id: route.id,
  routeCode: getDisplayRouteCode(route.routeCode, route.routeCodeOld, route.routeType),
  routeName: getDisplayRouteName(route.departureStation, route.arrivalStation, route.routeCode, route.routeCodeOld, route.routeType),
  routeCodeOld: route.routeCodeOld || null,
  departureProvince: getDisplayProvince(route.departureProvince, provinceNameMap),
  departureStation: route.departureStation || null,
  departureStationRef: route.departureStationRef || null,
  arrivalProvince: getDisplayProvince(route.arrivalProvince, provinceNameMap),
  arrivalStation: route.arrivalStation || null,
  arrivalStationRef: route.arrivalStationRef || null,
  distanceKm: route.distanceKm || null,
  itinerary: route.itinerary || null,
  routeType: route.routeType || null,
  totalTripsPerMonth: route.totalTripsPerMonth || null,
  tripsOperated: route.tripsOperated || null,
  remainingCapacity: route.remainingCapacity || null,
  minIntervalMinutes: route.minIntervalMinutes || null,
  decisionNumber: route.decisionNumber || null,
  decisionDate: route.decisionDate || null,
  issuingAuthority: route.issuingAuthority || null,
  operationStatus: route.operationStatus || null,
  isActive: route.isActive,
  createdAt: route.createdAt,
  updatedAt: route.updatedAt,
})

const routeSchema = z.object({
  routeCode: z.string().min(1, 'Route code is required'),
  routeCodeOld: z.string().optional(),
  departureProvince: z.string().optional(),
  departureStation: z.string().optional(),
  departureStationRef: z.string().optional(),
  arrivalProvince: z.string().optional(),
  arrivalStation: z.string().optional(),
  arrivalStationRef: z.string().optional(),
  distanceKm: z.number().int().positive().optional(),
  itinerary: z.string().optional(),
  routeType: z.string().optional(),
  totalTripsPerMonth: z.number().int().optional(),
  tripsOperated: z.number().int().optional(),
  remainingCapacity: z.number().int().optional(),
  minIntervalMinutes: z.number().int().optional(),
  decisionNumber: z.string().optional(),
  decisionDate: z.string().optional(),
  issuingAuthority: z.string().optional(),
  operationStatus: z.string().optional(),
})

export const getAllRoutes = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')
    const provinceNameMap = await getProvinceNameMap()

    const { departureStation, arrivalStation, isActive } = req.query

    // Build conditions
    const conditions = []

    if (departureStation) {
      conditions.push(eq(routes.departureStation, departureStation as string))
    }
    if (arrivalStation) {
      conditions.push(eq(routes.arrivalStation, arrivalStation as string))
    }
    if (isActive !== undefined) {
      conditions.push(eq(routes.isActive, isActive === 'true'))
    }

    // Build and execute query
    const routesData = conditions.length === 0
      ? await db.select().from(routes).orderBy(asc(routes.routeCode))
      : await db.select().from(routes).where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(asc(routes.routeCode))

    const routesFormatted = routesData.map((route) => formatRouteResponse(route, provinceNameMap))

    return res.json(routesFormatted)
  } catch (error) {
    console.error('Error fetching routes:', error)
    return res.status(500).json({ error: 'Failed to fetch routes' })
  }
}

export const getRouteById = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')
    const provinceNameMap = await getProvinceNameMap()

    const { id } = req.params

    const [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, id))
      .limit(1)

    if (!route) {
      return res.status(404).json({ error: 'Route not found' })
    }

    return res.json(formatRouteResponse(route, provinceNameMap))
  } catch (error) {
    console.error('Error fetching route:', error)
    return res.status(500).json({ error: 'Failed to fetch route' })
  }
}

export const createRoute = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')
    const provinceNameMap = await getProvinceNameMap()

    const validated = routeSchema.parse(req.body)
    const isBus = isBusRouteType(validated.routeType, validated.routeCode)
    const normalizedRoute = isBus
      ? normalizeBusRouteCode(validated.routeCode, validated.routeCodeOld || null)
      : { routeCode: validated.routeCode, routeCodeOld: validated.routeCodeOld || null }

    const [route] = await db
      .insert(routes)
      .values({
        routeCode: normalizedRoute.routeCode,
        routeCodeOld: normalizedRoute.routeCodeOld,
        departureProvince: validated.departureProvince || null,
        departureStation: validated.departureStation || null,
        departureStationRef: validated.departureStationRef || null,
        arrivalProvince: validated.arrivalProvince || null,
        arrivalStation: validated.arrivalStation || null,
        arrivalStationRef: validated.arrivalStationRef || null,
        distanceKm: validated.distanceKm || null,
        itinerary: validated.itinerary || null,
        routeType: validated.routeType || null,
        totalTripsPerMonth: validated.totalTripsPerMonth || null,
        tripsOperated: validated.tripsOperated || null,
        remainingCapacity: validated.remainingCapacity || null,
        minIntervalMinutes: validated.minIntervalMinutes || null,
        decisionNumber: validated.decisionNumber || null,
        decisionDate: validated.decisionDate || null,
        issuingAuthority: validated.issuingAuthority || null,
        operationStatus: validated.operationStatus || null,
        isActive: true,
      })
      .returning()

    return res.status(201).json(formatRouteResponse(route, provinceNameMap))
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Route with this code already exists' })
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to create route' })
  }
}

export const updateRoute = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')
    const provinceNameMap = await getProvinceNameMap()

    const { id } = req.params
    const validated = routeSchema.partial().parse(req.body)

    const [currentRoute] = await db
      .select({
        id: routes.id,
        routeCode: routes.routeCode,
        routeCodeOld: routes.routeCodeOld,
        routeType: routes.routeType,
      })
      .from(routes)
      .where(eq(routes.id, id))
      .limit(1)

    if (!currentRoute) {
      return res.status(404).json({ error: 'Route not found' })
    }

    // Build update object
    const updateData: any = {}
    const effectiveRouteType = (validated.routeType ?? currentRoute.routeType ?? '').trim()
    if (isBusRouteType(effectiveRouteType, currentRoute.routeCode)) {
      const candidateRouteCode =
        validated.routeCode ??
        validated.routeCodeOld ??
        currentRoute.routeCodeOld ??
        currentRoute.routeCode ??
        ''
      if (candidateRouteCode) {
        const normalizedRoute = normalizeBusRouteCode(candidateRouteCode, validated.routeCodeOld ?? currentRoute.routeCodeOld ?? null)
        updateData.routeCode = normalizedRoute.routeCode
        updateData.routeCodeOld = normalizedRoute.routeCodeOld
      }
    } else {
      if (validated.routeCode !== undefined) updateData.routeCode = validated.routeCode
      if (validated.routeCodeOld !== undefined) updateData.routeCodeOld = validated.routeCodeOld || null
    }
    if (validated.departureProvince !== undefined) updateData.departureProvince = validated.departureProvince || null
    if (validated.departureStation !== undefined) updateData.departureStation = validated.departureStation || null
    if (validated.departureStationRef !== undefined) updateData.departureStationRef = validated.departureStationRef || null
    if (validated.arrivalProvince !== undefined) updateData.arrivalProvince = validated.arrivalProvince || null
    if (validated.arrivalStation !== undefined) updateData.arrivalStation = validated.arrivalStation || null
    if (validated.arrivalStationRef !== undefined) updateData.arrivalStationRef = validated.arrivalStationRef || null
    if (validated.distanceKm !== undefined) updateData.distanceKm = validated.distanceKm || null
    if (validated.itinerary !== undefined) updateData.itinerary = validated.itinerary || null
    if (validated.routeType !== undefined) updateData.routeType = validated.routeType || null
    if (validated.totalTripsPerMonth !== undefined) updateData.totalTripsPerMonth = validated.totalTripsPerMonth || null
    if (validated.tripsOperated !== undefined) updateData.tripsOperated = validated.tripsOperated || null
    if (validated.remainingCapacity !== undefined) updateData.remainingCapacity = validated.remainingCapacity || null
    if (validated.minIntervalMinutes !== undefined) updateData.minIntervalMinutes = validated.minIntervalMinutes || null
    if (validated.decisionNumber !== undefined) updateData.decisionNumber = validated.decisionNumber || null
    if (validated.decisionDate !== undefined) updateData.decisionDate = validated.decisionDate || null
    if (validated.issuingAuthority !== undefined) updateData.issuingAuthority = validated.issuingAuthority || null
    if (validated.operationStatus !== undefined) updateData.operationStatus = validated.operationStatus || null

    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date()
      await db
        .update(routes)
        .set(updateData)
        .where(eq(routes.id, id))
    }

    // Fetch updated route
    const [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, id))
      .limit(1)

    if (!route) {
      return res.status(404).json({ error: 'Route not found' })
    }

    return res.json(formatRouteResponse(route, provinceNameMap))
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to update route' })
  }
}

export const deleteRoute = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    await db
      .delete(routes)
      .where(eq(routes.id, id))

    res.status(204).send()
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete route' })
  }
}

// Get legacy routes from Drizzle routes table
export const getLegacyRoutes = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')
    const provinceNameMap = await getProvinceNameMap()
    const authReq = req as AuthRequest

    const forceRefresh = req.query.refresh === 'true'

    // Get user's benPhuTrach (assigned station)
    let stationName: string | null = null
    let shouldFilterByStation = false

    if (authReq.user) {
      const [user] = await db
        .select({ benPhuTrach: users.benPhuTrach, role: users.role })
        .from(users)
        .where(eq(users.id, authReq.user.id))
        .limit(1)

      // Only filter if user is not admin and has benPhuTrach assigned
      if (user && user.role !== 'admin' && user.benPhuTrach) {
        const [location] = await db
          .select({ name: locations.name })
          .from(locations)
          .where(eq(locations.id, user.benPhuTrach))
          .limit(1)

        if (location) {
          stationName = location.name
          shouldFilterByStation = true
        }
      }
    }

    // Check cache (but invalidate if filtering by station)
    if (!forceRefresh && !shouldFilterByStation && legacyRoutesCache && Date.now() - legacyRoutesCache.timestamp < LEGACY_CACHE_TTL) {
      const remappedCachedData = legacyRoutesCache.data.map((route) => ({
        ...route,
        departureProvince: getDisplayProvince(route.departureProvince, provinceNameMap) || '',
        departureProvinceOld: getDisplayProvince(route.departureProvinceOld || route.departureProvince, provinceNameMap) || '',
        arrivalProvince: getDisplayProvince(route.arrivalProvince, provinceNameMap) || '',
        arrivalProvinceOld: getDisplayProvince(route.arrivalProvinceOld || route.arrivalProvince, provinceNameMap) || '',
      }))
      legacyRoutesCache = { data: remappedCachedData, timestamp: legacyRoutesCache.timestamp }
      return res.json(remappedCachedData)
    }

    // Build query conditions
    const baseCondition = eq(routes.source, 'appsheet')
    let whereCondition = baseCondition

    // Filter by station if user has benPhuTrach assigned
    if (shouldFilterByStation && stationName) {
      const stationCondition = or(
        eq(routes.departureStation, stationName),
        eq(routes.arrivalStation, stationName)
      )
      
      if (stationCondition) {
        whereCondition = and(baseCondition, stationCondition) || baseCondition
      }
      
      console.log(`[Routes] Filtering by station: ${stationName}`)
    }

    // Get routes from database — only AppSheet-synced routes (exclude legacy ETL/manual)
    const routesData = await db
      .select()
      .from(routes)
      .where(whereCondition)
      .orderBy(asc(routes.routeCode))
    
    console.log(`[Routes] Found ${routesData.length} routes`)

    const routesFormatted = routesData.map((route) => ({
      id: route.id,
      // Use actual DB routeCode (preserves BUS- prefix) — matches AppSheet normalizer keys
      routeCode: (route.routeCode || '').trim(),
      routeName: getDisplayRouteName(route.departureStation, route.arrivalStation, route.routeCode, route.routeCodeOld, route.routeType),
      routeCodeOld: route.routeCodeOld || '',
      routeCodeFixed: route.routeCode || '',
      routeClass: '',
      routeType: route.routeType || '',
      routePath: route.itinerary || '',

      departureStation: route.departureStation || '',
      departureStationRef: route.departureStationRef || '',
      departureProvince: getDisplayProvince(route.departureProvince, provinceNameMap) || '',
      departureProvinceOld: getDisplayProvince(route.departureProvince, provinceNameMap) || '',

      arrivalStation: route.arrivalStation || '',
      arrivalStationRef: route.arrivalStationRef || '',
      arrivalProvince: getDisplayProvince(route.arrivalProvince, provinceNameMap) || '',
      arrivalProvinceOld: getDisplayProvince(route.arrivalProvince, provinceNameMap) || '',

      distanceKm: route.distanceKm || 0,
      minIntervalMinutes: route.minIntervalMinutes || 0,
      totalTripsMonth: route.totalTripsPerMonth || 0,
      tripsInOperation: route.tripsOperated || 0,
      remainingCapacity: route.remainingCapacity || 0,

      operationStatus: route.operationStatus || '',
      calendarType: '',

      decisionNumber: route.decisionNumber || '',
      decisionDate: route.decisionDate || '',
      issuingAuthority: route.issuingAuthority || '',

      notes: '',
      filePath: '',

      _source: 'drizzle',
    }))

    // Update cache
    legacyRoutesCache = { data: routesFormatted, timestamp: Date.now() }

    return res.json(routesFormatted)
  } catch (error: any) {
    console.error('Error fetching legacy routes:', error)
    return res.status(500).json({ error: 'Failed to fetch legacy routes' })
  }
}

