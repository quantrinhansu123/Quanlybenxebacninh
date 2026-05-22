import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { vehicleBadges, vehicles as vehiclesTable, operators as operatorsTable, routes as routesTable } from '../db/schema/index.js'
import { users } from '../db/schema/users.js'
import { locations } from '../db/schema/locations.js'
import { eq, inArray, sql } from 'drizzle-orm'
import type { AuthRequest } from '../middleware/auth.js'
import {
  isQuanLyAllowedBadgeType,
  QUANLY_ALLOWED_BADGE_TYPES,
  QUANLY_BADGE_TYPE_BUS,
  QUANLY_BADGE_TYPE_FIXED_ROUTE,
} from '../constants/quanly-badge-types.js'

// Unified cache — chỉ phù hiệu «Buýt» hoặc «Tuyến cố định» (khớp chính xác)
interface QuanLyCache {
  badges: any[]
  vehicles: any[]
  operators: any[]
  routes: any[]
  timestamp: number
}

let quanLyCache: QuanLyCache | null = null
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes - stable numbers for users
let cacheLoading: Promise<QuanLyCache> | null = null

// Normalize plate / firebase ref for matching
const normalizePlate = (plate: string): string => {
  return (plate || '').replace(/[.\-\s]/g, '').toUpperCase()
}

/** vehicles.firebase_id ↔ vehicle_badges.plate_number */
const vehicleBadgeLinkKey = (value: string): string => normalizePlate(value)

const IN_CHUNK_SIZE = 500
const STATION_BUS_ROUTE_CACHE_TTL = 10 * 60 * 1000
const stationBusRouteCache = new Map<string, { ids: Set<string>; at: number }>()

async function loadVehiclesByFirebaseRefs(refs: string[]) {
  if (!db || refs.length === 0) return []
  const rows: Array<{
    id: string
    firebaseId: string | null
    plateNumber: string
    seatCount: number | null
    bedCapacity: number | null
    isActive: boolean
  }> = []
  for (let i = 0; i < refs.length; i += IN_CHUNK_SIZE) {
    const chunk = refs.slice(i, i + IN_CHUNK_SIZE)
    const part = await db
      .select({
        id: vehiclesTable.id,
        firebaseId: vehiclesTable.firebaseId,
        plateNumber: vehiclesTable.plateNumber,
        seatCount: vehiclesTable.seatCount,
        bedCapacity: vehiclesTable.bedCapacity,
        isActive: vehiclesTable.isActive,
      })
      .from(vehiclesTable)
      .where(inArray(vehiclesTable.firebaseId, chunk))
    rows.push(...part)
  }
  return rows
}

async function loadOperatorsByIds(ids: string[]) {
  if (!db || ids.length === 0) return []
  const rows: Array<Record<string, unknown>> = []
  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + IN_CHUNK_SIZE)
    const part = await db
      .select({
        id: operatorsTable.id,
        firebaseId: operatorsTable.firebaseId,
        code: operatorsTable.code,
        name: operatorsTable.name,
        province: operatorsTable.province,
        phone: operatorsTable.phone,
        email: operatorsTable.email,
        address: operatorsTable.address,
        representative: operatorsTable.representative,
        taxCode: operatorsTable.taxCode,
        isTicketDelegated: operatorsTable.isTicketDelegated,
        isActive: operatorsTable.isActive,
        source: operatorsTable.source,
      })
      .from(operatorsTable)
      .where(inArray(operatorsTable.id, chunk))
    rows.push(...part)
  }
  return rows
}

// Load all data in parallel and pre-filter
async function loadQuanLyData(): Promise<QuanLyCache> {
  const now = Date.now()

  // Return cached data if valid
  if (quanLyCache && (now - quanLyCache.timestamp) < CACHE_TTL) {
    return quanLyCache
  }

  // Prevent multiple simultaneous loads
  if (cacheLoading) {
    return cacheLoading
  }

  cacheLoading = (async () => {
    try {
      if (!db) throw new Error('Database not initialized')

      const startTime = Date.now()

      const badgeData = await db
        .select({
          id: vehicleBadges.id,
          plateNumber: vehicleBadges.plateNumber,
          badgeNumber: vehicleBadges.badgeNumber,
          badgeType: vehicleBadges.badgeType,
          status: vehicleBadges.status,
          expiryDate: vehicleBadges.expiryDate,
          issueDate: vehicleBadges.issueDate,
          operatorId: vehicleBadges.operatorId,
          routeCode: vehicleBadges.routeCode,
          tuyenBusCode: vehicleBadges.tuyenBusCode,
          refDonViCapPhuHieu: vehicleBadges.refDonViCapPhuHieu,
          maHoSo: vehicleBadges.maHoSo,
        })
        .from(vehicleBadges)
        .where(inArray(vehicleBadges.badgeType, [...QUANLY_ALLOWED_BADGE_TYPES]))

      const vehicleFirebaseRefs = [
        ...new Set(
          badgeData
            .map((b) => (b.plateNumber || '').trim())
            .filter(Boolean),
        ),
      ]

      const [vehicleData, routeData, operatorData] = await Promise.all([
        loadVehiclesByFirebaseRefs(vehicleFirebaseRefs),
        db.select({
          id: routesTable.id,
          routeCode: routesTable.routeCode,
          routeCodeOld: routesTable.routeCodeOld,
          departureStation: routesTable.departureStation,
          departureStationRef: routesTable.departureStationRef,
          arrivalStation: routesTable.arrivalStation,
          arrivalStationRef: routesTable.arrivalStationRef,
          distanceKm: routesTable.distanceKm,
          routeType: routesTable.routeType,
          itinerary: routesTable.itinerary,
          firebaseId: routesTable.firebaseId,
        }).from(routesTable),
        db.select({
          id: operatorsTable.id,
          firebaseId: operatorsTable.firebaseId,
          code: operatorsTable.code,
          name: operatorsTable.name,
          province: operatorsTable.province,
          phone: operatorsTable.phone,
          email: operatorsTable.email,
          address: operatorsTable.address,
          representative: operatorsTable.representative,
          taxCode: operatorsTable.taxCode,
          isTicketDelegated: operatorsTable.isTicketDelegated,
          isActive: operatorsTable.isActive,
          source: operatorsTable.source,
        }).from(operatorsTable),
      ])

      // vehicles.firebase_id ↔ vehicle_badges.plate_number
      const vehicleByLinkKey = new Map<string, { id: string; plateNumber: string; firebaseId: string }>()
      for (const vehicle of vehicleData) {
        const v = vehicle as any
        const firebaseId = (v.firebaseId || '').trim()
        if (!firebaseId) continue
        const linkKey = vehicleBadgeLinkKey(firebaseId)
        vehicleByLinkKey.set(linkKey, {
          id: v.id,
          plateNumber: v.plateNumber || '',
          firebaseId,
        })
      }

      // Operator lookup: uuid id + firebase_id (vehicle_badges.operator_id lưu text → khớp firebase_id)
      const operatorNameMap = new Map<string, string>()
      const operatorUuidSet = new Set<string>()
      const operatorUuidByFirebaseId = new Map<string, string>()
      for (const op of operatorData) {
        const o = op as any
        if (o.id) {
          operatorUuidSet.add(o.id)
          operatorNameMap.set(o.id, o.name || '')
        }
        const fid = (o.firebaseId || '').trim()
        if (fid && o.id) {
          operatorUuidByFirebaseId.set(fid, o.id)
        }
      }
      const resolveOperatorUuid = (ref: string): string | null => {
        const key = ref.trim()
        if (!key) return null
        if (operatorUuidSet.has(key)) return key
        return operatorUuidByFirebaseId.get(key) ?? null
      }

      // Build route lookup by routeCode AND routeName (badges use routeName as ref)
      const routeItineraryByCode = new Map<string, string>()
      const routeDisplayByCode = new Map<string, string>()

      for (const route of routeData) {
        const r = route as any
        const displayName =
          r.departureStation && r.arrivalStation
            ? `${r.departureStation} - ${r.arrivalStation}`
            : r.routeCode || ''
        if (r.routeCode) {
          if (r.itinerary) routeItineraryByCode.set(r.routeCode, r.itinerary)
          routeDisplayByCode.set(r.routeCode, displayName)
        }
        if (r.routeCodeOld) {
          if (r.itinerary) routeItineraryByCode.set(r.routeCodeOld, r.itinerary)
          routeDisplayByCode.set(r.routeCodeOld, displayName)
        }
      }

      // Filter badges by allowed types (Drizzle data is array)
      const linkedVehicleKeys = new Set<string>() // có phù hiệu Buýt hoặc Tuyến cố định (link firebase_id)
      const linkedVehicleKeysValid = new Set<string>() // có phù hiệu còn hạn
      const operatorIdsWithBadges = new Set<string>() // operators.id (uuid) từ badge Buýt / Tuyến cố định
      const vehicleOperatorMap = new Map<string, string>() // linkKey (firebase_id) -> operator name
      const vehicleBadgeExpiryMap = new Map<string, string>() // linkKey -> badge expiry date
      const badges: any[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const badge of badgeData) {
        const b = badge as any
        const badgeType = b.badgeType || ''

        if (!isQuanLyAllowedBadgeType(badgeType)) continue

        const badgePlateRef = (b.plateNumber || '').trim()
        if (!badgePlateRef) {
          console.warn(`[QuanLyData] Badge ${b.id || 'unknown'} missing plate_number (vehicle ref), skipping`)
          continue
        }

        const linkKey = vehicleBadgeLinkKey(badgePlateRef)
        const matchedVehicle = vehicleByLinkKey.get(linkKey)
        const displayPlate = matchedVehicle?.plateNumber || badgePlateRef

        const opRef = (b.operatorId || b.refDonViCapPhuHieu || '').trim()
        const resolvedOpId = resolveOperatorUuid(opRef)
        if (resolvedOpId) {
          operatorIdsWithBadges.add(resolvedOpId)
        }

        if (matchedVehicle) {
          linkedVehicleKeys.add(linkKey)

          if (resolvedOpId) {
            const opName = operatorNameMap.get(resolvedOpId)
            if (opName) vehicleOperatorMap.set(linkKey, opName)
          }

          const badgeExpiry = b.expiryDate || ''
          if (badgeExpiry) {
            const existing = vehicleBadgeExpiryMap.get(linkKey)
            if (!existing || badgeExpiry > existing) {
              vehicleBadgeExpiryMap.set(linkKey, badgeExpiry)
            }

            const expiryDate = new Date(badgeExpiry)
            expiryDate.setHours(0, 0, 0, 0)
            if (expiryDate >= today) {
              linkedVehicleKeysValid.add(linkKey)
            }
          }
        }

        const routeCode = b.routeCode || ''
        const itinerary = routeCode && routeItineraryByCode.has(routeCode)
          ? routeItineraryByCode.get(routeCode)!
          : ''

        badges.push({
          id: b.id,
          badge_number: b.badgeNumber || '',
          license_plate_sheet: displayPlate,
          vehicle_match_key: linkKey,
          badge_type: badgeType,
          badge_color: '',
          issue_date: b.issueDate || '',
          expiry_date: b.expiryDate || '',
          status: b.status || '',
          file_code: b.maHoSo || '',
          issue_type: '',
          issuing_authority_ref: b.refDonViCapPhuHieu || b.operatorId || '',
          business_license_ref: '',
          route_id: '',
          route_code: routeCode,
          route_name: routeDisplayByCode.get(routeCode) || '',
          tuyen_bus_code: b.tuyenBusCode || '',
          ref_thong_bao: '',
          ly_do_cap_lai: '',
          so_phu_hieu_cu: '',
          itinerary,
          vehicle_type: '',
        })
      }

      const vehicles: any[] = []
      for (const v of vehicleData) {
        const row = v as {
          id: string
          firebaseId: string | null
          plateNumber: string | null
          seatCount: number | null
          bedCapacity: number | null
          isActive: boolean
        }
        const plateNumber = row.plateNumber || ''
        if (!plateNumber) continue

        const vehicleLinkKey = vehicleBadgeLinkKey((row.firebaseId || '').trim())
        vehicles.push({
          id: row.id,
          firebaseId: (row.firebaseId || '').trim(),
          plateNumber,
          seatCapacity: row.seatCount || 0,
          bedCapacity: row.bedCapacity || 0,
          operatorId: null,
          operatorName: vehicleOperatorMap.get(vehicleLinkKey) || '',
          vehicleType: '',
          vehicleCategory: '',
          inspectionExpiryDate: vehicleBadgeExpiryMap.get(vehicleLinkKey) || '',
          isActive: row.isActive !== false,
          hasBadge: linkedVehicleKeys.has(vehicleLinkKey),
          hasValidBadge: linkedVehicleKeysValid.has(vehicleLinkKey),
          source: 'drizzle',
        })
      }

      const operators: any[] = []
      for (const op of operatorData) {
        const o = op as any
        const operatorId = o.id

        // Chỉ đơn vị có ≥1 phù hiệu Buýt hoặc Tuyến cố định
        if (!operatorIdsWithBadges.has(operatorId)) continue

        operators.push({
          id: operatorId,
          code: o.code || '',
          name: o.name || '',
          province: o.province || '',
          phone: o.phone || '',
          email: o.email || '',
          address: o.address || '',
          representativeName: o.representative || '',
          taxCode: o.taxCode || '',
          isTicketDelegated: o.isTicketDelegated || false,
          isActive: o.isActive !== false,
          source: o.source || 'drizzle',
        })
      }

      // Parse routes (Drizzle data is array)
      const routes: any[] = []
      for (const route of routeData) {
        const r = route as any
        // Note: routes schema doesn't have routeName field, using departureStation-arrivalStation as name
        const routeName = r.departureStation && r.arrivalStation
          ? `${r.departureStation} - ${r.arrivalStation}`
          : ''
        routes.push({
          id: r.id,
          code: (r.routeCode || '').trim(),
          name: routeName,
          startPoint: r.departureStation || '',
          endPoint: r.arrivalStation || '',
          departureStationRef: r.departureStationRef || '',
          arrivalStationRef: r.arrivalStationRef || '',
          distance: r.distanceKm || '',
          routeType: r.routeType || '',
          itinerary: r.itinerary || '',
          firebaseId: r.firebaseId || '',
        })
      }
      
      // Sort data
      badges.sort((a, b) => b.badge_number.localeCompare(a.badge_number))
      vehicles.sort((a, b) => a.plateNumber.localeCompare(b.plateNumber))
      // Sort operators: those with taxCode first, then by name
      operators.sort((a, b) => {
        const aHasTax = a.taxCode ? 1 : 0
        const bHasTax = b.taxCode ? 1 : 0
        if (bHasTax !== aHasTax) return bHasTax - aHasTax // Has tax first
        return a.name.localeCompare(b.name, 'vi')
      })
      routes.sort((a, b) => a.code.localeCompare(b.code))

      const loadTime = Date.now() - startTime
      console.log(`[QuanLyData] Loaded ${badges.length} badges, ${vehicles.length} vehicles, ${operators.length} operators, ${routes.length} routes in ${loadTime}ms (source: Drizzle ORM)`)
      console.log(
        `[QuanLyData] Linked ${linkedVehicleKeys.size} keys, ${vehicles.length} vehicles (from ${vehicleFirebaseRefs.length} badge refs, ${badgeData.length} badges)`,
      )
      
      quanLyCache = {
        badges,
        vehicles,
        operators,
        routes,
        timestamp: Date.now(),
      }
      
      return quanLyCache
    } finally {
      cacheLoading = null
    }
  })()
  
  return cacheLoading
}

// Invalidate cache
export const invalidateQuanLyCache = () => {
  quanLyCache = null
  cacheLoading = null
}

// Pre-warm cache on server startup (BACKGROUND - non-blocking)
export const preWarmQuanLyCache = async () => {
  // Start loading in background, don't await
  console.log('[QuanLyData] Starting background cache warm...')
  loadQuanLyData().then(() => {
    console.log('[QuanLyData] Background cache warm complete')
  }).catch(error => {
    console.error('[QuanLyData] Background cache warm failed:', error)
  })
}

// Unified endpoint - returns all data for Quản lý thông tin module
export const getQuanLyData = async (req: Request, res: Response) => {
  try {
    if (!db) {
      console.error('[QuanLyData] Database not initialized')
      res.status(500).json({ error: 'Database not initialized' })
      return
    }

    const { include } = req.query
    const forceRefresh = req.query.refresh === 'true'
    
    if (forceRefresh) {
      invalidateQuanLyCache()
    }
    
    const data = await loadQuanLyData()

    // Resolve station filter for users with benPhuTrach assigned
    let stationName: string | null = null
    let stationCode: string | null = null // ma_ben from locations.code
    const authReq = req as AuthRequest
    if (authReq.user) {
      const [user] = await db
        .select({ benPhuTrach: users.benPhuTrach, role: users.role })
        .from(users)
        .where(eq(users.id, authReq.user.id))
        .limit(1)

      const skipStationFilter = user?.role === 'admin'
      if (user && user.benPhuTrach && !skipStationFilter) {
        const [location] = await db
          .select({
            name: locations.name,
            code: locations.code,
            // Some databases store mã bến separately (maBen); fallback to code when missing
            maBen: (locations as any).maBen,
          })
          .from(locations)
          .where(eq(locations.id, user.benPhuTrach))
          .limit(1)

        if (location) {
          stationName = location.name.trim()
          const rawMaBen = (location as any).maBen as string | null | undefined
          const effectiveCode = (rawMaBen || location.code || '').trim()
          stationCode = effectiveCode || null
        }
      }
    }
    
    // Allow selective data loading
    const includes = include ? (include as string).split(',') : ['badges', 'vehicles', 'operators', 'routes']
    
    const response: Record<string, any> = {}
    let finalFilteredBadges = data.badges
    if (includes.includes('badges')) {
      let filteredBadges = data.badges
      if (stationCode || stationName) {
        const cacheKey = `${stationCode || ''}|${stationName || ''}`
        const cachedBus = stationBusRouteCache.get(cacheKey)
        const allowedBusRouteIds =
          cachedBus && Date.now() - cachedBus.at < STATION_BUS_ROUTE_CACHE_TTL
            ? cachedBus.ids
            : new Set<string>()

        if (!cachedBus || Date.now() - cachedBus.at >= STATION_BUS_ROUTE_CACHE_TTL) {
          if (stationCode) {
            try {
              const busRouteRows = await db.execute(
                sql`SELECT id_tuyen FROM danh_muc_tuyen_bus WHERE diem_dau = ${stationCode} OR diem_cuoi = ${stationCode}`,
              )
              for (const row of busRouteRows as { id_tuyen?: string }[]) {
                const id = (row.id_tuyen || '').trim()
                if (id) allowedBusRouteIds.add(id)
              }
            } catch (error) {
              console.error('[QuanLyData] Failed to load Buýt route ids via danh_muc_tuyen_bus:', error)
            }
          }

          if (allowedBusRouteIds.size === 0 && stationName) {
            const stationLower = stationName.trim().toLowerCase()
            for (const r of data.routes) {
              const route = r as { routeType?: string; startPoint?: string; firebaseId?: string }
              const rt = (route.routeType || '').toLowerCase()
              const isBus =
                rt === 'bus' || rt.includes('buýt') || rt.includes('buyt') || rt.includes('xe buýt')
              if (!isBus) continue
              const startPoint = (route.startPoint || '').trim().toLowerCase()
              if (startPoint === stationLower) {
                const fid = (route.firebaseId || '').trim()
                if (fid) allowedBusRouteIds.add(fid)
              }
            }
          }

          stationBusRouteCache.set(cacheKey, { ids: allowedBusRouteIds, at: Date.now() })
        }

        // ===== 2) Tuyến cố định: chỉ tuyến có điểm đầu (bến đi) trùng tên bến — không lấy theo điểm cuối / hành trình =====
        const allowedFixedRouteCodes = new Set<string>()
        if (stationName) {
          const stationLower = stationName.trim().toLowerCase()
          for (const r of data.routes) {
            const route = r as any
            const startPoint = (route.startPoint || '').trim().toLowerCase()
            if (startPoint === stationLower) {
              const rc = (route.code || '').trim().toUpperCase()
              if (rc) allowedFixedRouteCodes.add(rc)
            }
          }
        }

        // ===== 3) Apply filters to badges =====
        filteredBadges = data.badges.filter(b => {
          // "Buýt" badges: chỉ hiển thị nếu tuyen_bus_code thuộc danh sách id_tuyen của bến
          if (b.badge_type === QUANLY_BADGE_TYPE_BUS) {
            if (allowedBusRouteIds.size === 0) return false
            const id = (b.tuyen_bus_code || '').trim()
            return !!id && allowedBusRouteIds.has(id)
          }

          if (b.badge_type === QUANLY_BADGE_TYPE_FIXED_ROUTE) {
            if (!stationName || allowedFixedRouteCodes.size === 0) {
              return false
            }
            const rc = (b.route_code || '').trim().toUpperCase()
            return rc && allowedFixedRouteCodes.has(rc)
          }

          return false
        })

        const busCount = data.badges.filter(b => b.badge_type === QUANLY_BADGE_TYPE_BUS).length
        const fixedRouteCount = data.badges.filter(b => b.badge_type === QUANLY_BADGE_TYPE_FIXED_ROUTE).length
        const filteredBusCount = filteredBadges.filter(b => b.badge_type === QUANLY_BADGE_TYPE_BUS).length
        const filteredFixedRouteCount = filteredBadges.filter(b => b.badge_type === QUANLY_BADGE_TYPE_FIXED_ROUTE).length
        console.log(
          `[QuanLyData] Station filter (ma_ben: ${stationCode}, name: ${stationName}): ` +
          `${allowedBusRouteIds.size} Buýt route ids, ${allowedFixedRouteCodes.size} Tuyến cố định routes, ` +
          `${filteredBusCount}/${busCount} Buýt badges, ${filteredFixedRouteCount}/${fixedRouteCount} Tuyến cố định badges`
        )
      }
      finalFilteredBadges = filteredBadges
      response.badges = filteredBadges
    }
    
    if (includes.includes('vehicles')) {
      const allowedLinkKeysForStation = new Set<string>()
      for (const b of finalFilteredBadges) {
        if (b.vehicle_match_key) {
          allowedLinkKeysForStation.add(b.vehicle_match_key)
        }
      }
      if (stationCode || stationName) {
        response.vehicles = data.vehicles.filter(v => {
          const linkKey = vehicleBadgeLinkKey((v.firebaseId || '').trim())
          return linkKey && allowedLinkKeysForStation.has(linkKey)
        })
      } else {
        response.vehicles = data.vehicles
      }
    }
    if (includes.includes('operators')) response.operators = data.operators
    if (includes.includes('routes')) response.routes = data.routes
    
    response.meta = {
      badgeCount: data.badges.length,
      vehicleCount: data.vehicles.length,
      operatorCount: data.operators.length,
      routeCount: data.routes.length,
      cachedAt: new Date(data.timestamp).toISOString(),
    }
    
    res.json(response)
  } catch (error) {
    console.error('[QuanLyData] Error:', error)
    res.status(500).json({ error: 'Failed to fetch data' })
  }
}

// Stats endpoint - lightweight
export const getQuanLyStats = async (_req: Request, res: Response) => {
  try {
    const data = await loadQuanLyData()
    
    res.json({
      badges: data.badges.length,
      vehicles: data.vehicles.length,
      operators: data.operators.length,
      routes: data.routes.length,
      cachedAt: new Date(data.timestamp).toISOString(),
    })
  } catch (error) {
    console.error('[QuanLyStats] Error:', error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
}
