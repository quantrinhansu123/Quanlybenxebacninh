import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { vehicleBadges, vehicles as vehiclesTable, operators as operatorsTable, routes as routesTable, vehicleTypes as vehicleTypesTable } from '../db/schema/index.js'
import { users } from '../db/schema/users.js'
import { locations } from '../db/schema/locations.js'
import { eq, sql } from 'drizzle-orm'
import type { AuthRequest } from '../middleware/auth.js'

// Unified cache for all quanly data - pre-filtered for Buýt and Tuyến cố định
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

const ALLOWED_BADGE_TYPES = ['Buýt', 'Tuyến cố định']

// Normalize plate number
const normalizePlate = (plate: string): string => {
  return (plate || '').replace(/[.\-\s]/g, '').toUpperCase()
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

      // OPTIMIZED: Load only required columns (60-80% faster)
      const [badgeData, vehicleData, operatorData, routeData, vehicleTypeData] = await Promise.all([
        db.select({
          id: vehicleBadges.id,
          plateNumber: vehicleBadges.plateNumber,
          badgeNumber: vehicleBadges.badgeNumber,
          badgeType: vehicleBadges.badgeType,
          status: vehicleBadges.status,
          expiryDate: vehicleBadges.expiryDate,
          issueDate: vehicleBadges.issueDate,
          operatorId: vehicleBadges.operatorId,
          vehicleId: vehicleBadges.vehicleId,
          routeId: vehicleBadges.routeId,
          routeCode: vehicleBadges.routeCode,
          tuyenBusCode: vehicleBadges.tuyenBusCode,
          refGpkd: vehicleBadges.refGpkd,
          refThongBao: vehicleBadges.refThongBao,
          refDonViCapPhuHieu: vehicleBadges.refDonViCapPhuHieu,
          loaiCap: vehicleBadges.loaiCap,
          lyDoCapLai: vehicleBadges.lyDoCapLai,
          soPhuHieuCu: vehicleBadges.soPhuHieuCu,
          maHoSo: vehicleBadges.maHoSo,
        }).from(vehicleBadges),
        db.select({
          id: vehiclesTable.id,
          plateNumber: vehiclesTable.plateNumber,
          seatCount: vehiclesTable.seatCount,
          bedCapacity: vehiclesTable.bedCapacity,
          operatorId: vehiclesTable.operatorId,
          operatorName: vehiclesTable.operatorName,
          vehicleTypeId: vehiclesTable.vehicleTypeId,
          isActive: vehiclesTable.isActive,
          roadWorthinessExpiry: vehiclesTable.roadWorthinessExpiry,
          source: vehiclesTable.source,
          metadata: vehiclesTable.metadata,
        }).from(vehiclesTable),
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
          id: vehicleTypesTable.id,
          name: vehicleTypesTable.name,
        }).from(vehicleTypesTable),
      ])

      // Build vehicle plate lookup (Drizzle data is array)
      const vehiclePlateMap = new Map<string, string>()
      for (const vehicle of vehicleData) {
        const v = vehicle as any
        const plate = v.plateNumber || ''
        if (plate && v.id) {
          vehiclePlateMap.set(v.id, plate)
        }
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

      // Build vehicle type name lookup
      const vehicleTypeMap = new Map<string, string>()
      for (const vt of vehicleTypeData) {
        const t = vt as any
        if (t.id) {
          vehicleTypeMap.set(t.id, t.name || '')
        }
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
      const allowedPlates = new Set<string>()
      const platesWithValidBadge = new Set<string>() // plates with ≥1 non-expired badge
      const operatorIdsWithBadges = new Set<string>() // operators.id (uuid) từ badge Buýt / Tuyến cố định
      const vehicleOperatorMap = new Map<string, string>() // plate -> operator name
      const vehicleBadgeExpiryMap = new Map<string, string>() // plate -> badge expiry date
      const badges: any[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const badge of badgeData) {
        const b = badge as any
        const badgeType = b.badgeType || ''

        if (!ALLOWED_BADGE_TYPES.includes(badgeType)) continue

        // Get plate number (from plateNumber field or vehicle lookup)
        let plateNumber = b.plateNumber || ''
        const vehicleId = b.vehicleId || ''
        if (!plateNumber && vehicleId && vehiclePlateMap.has(vehicleId)) {
          plateNumber = vehiclePlateMap.get(vehicleId)!
        }

        // Early exit if no plate/vehicle reference
        if (!plateNumber && !vehicleId) {
          console.warn(`[QuanLyData] Badge ${b.id || 'unknown'} has no plate/vehicle reference, skipping`)
          continue
        }

        const opRef = (b.operatorId || b.refDonViCapPhuHieu || '').trim()
        const resolvedOpId = resolveOperatorUuid(opRef)
        if (resolvedOpId) {
          operatorIdsWithBadges.add(resolvedOpId)
        }

        if (plateNumber) {
          const normalizedPlate = normalizePlate(plateNumber)
          allowedPlates.add(normalizedPlate)

          if (resolvedOpId) {
            const opName = operatorNameMap.get(resolvedOpId)
            if (opName) vehicleOperatorMap.set(normalizedPlate, opName)
          }

          // Map vehicle plate to badge expiry date (keep latest expiry)
          const badgeExpiry = b.expiryDate || ''
          if (badgeExpiry) {
            const existing = vehicleBadgeExpiryMap.get(normalizedPlate)
            if (!existing || badgeExpiry > existing) {
              vehicleBadgeExpiryMap.set(normalizedPlate, badgeExpiry)
            }

            // Check if badge is not expired → mark plate as having valid badge
            const expiryDate = new Date(badgeExpiry)
            expiryDate.setHours(0, 0, 0, 0)
            if (expiryDate >= today) {
              platesWithValidBadge.add(normalizedPlate)
            }
          }
        }

        const routeId = b.routeId || ''
        const routeCode = b.routeCode || ''
        const itinerary = routeCode && routeItineraryByCode.has(routeCode)
          ? routeItineraryByCode.get(routeCode)!
          : ''

        badges.push({
          id: b.id,
          badge_number: b.badgeNumber || '',
          license_plate_sheet: plateNumber,
          badge_type: badgeType,
          badge_color: '',
          issue_date: b.issueDate || '',
          expiry_date: b.expiryDate || '',
          status: b.status || '',
          file_code: b.maHoSo || '',
          issue_type: b.loaiCap || '',
          issuing_authority_ref: b.refDonViCapPhuHieu || b.operatorId || '',
          business_license_ref: b.refGpkd || '',
          route_id: routeId,
          route_code: routeCode,
          route_name: routeDisplayByCode.get(routeCode) || '',
          tuyen_bus_code: b.tuyenBusCode || '',
          ref_thong_bao: b.refThongBao || '',
          ly_do_cap_lai: b.lyDoCapLai || '',
          so_phu_hieu_cu: b.soPhuHieuCu || '',
          itinerary,
          vehicle_type: '',
        })
      }

      // Build set of plates that have valid badges (Buýt/Tuyến cố định)
      // Use allowedPlates which contains ALL plates with valid badge types
      const platesWithBadge = allowedPlates

      // Include ALL vehicles (removed badge-based filtering)
      // Previous logic was too strict - excluded vehicles without badges
      // Vehicles created manually should also appear in the list
      const vehiclesByPlate = new Map<string, any[]>()
      for (const vehicle of vehicleData) {
        const v = vehicle as any
        const plateNumber = v.plateNumber || ''
        const normalizedPlate = normalizePlate(plateNumber)

        // Skip if no plate number
        if (!plateNumber) continue

        if (!vehiclesByPlate.has(normalizedPlate)) {
          vehiclesByPlate.set(normalizedPlate, [])
        }
        vehiclesByPlate.get(normalizedPlate)!.push({ key: v.id, v, plateNumber })
      }

      // Second pass: for each plate, pick the entry with most data
      const vehicles: any[] = []
      for (const [normalizedPlate, entries] of vehiclesByPlate) {
        // Sort by data completeness: prefer entries with operatorName, seatCount, etc.
        entries.sort((a, b) => {
          const scoreA = (a.v.operatorName ? 2 : 0) + (a.v.seatCount ? 1 : 0)
          const scoreB = (b.v.operatorName ? 2 : 0) + (b.v.seatCount ? 1 : 0)
          return scoreB - scoreA // Higher score first
        })

        const { key, v, plateNumber } = entries[0]

        // Get seat capacity from seatCount field
        const seatCapacity = v.seatCount || 0

        // Get operator name: prefer from badge reference, fallback to vehicle operatorName, then operators table
        const operatorFromBadge = vehicleOperatorMap.get(normalizedPlate) || ''
        const operatorFromRelation = v.operatorId ? (operatorNameMap.get(v.operatorId) || '') : ''
        const operatorName = operatorFromBadge || v.operatorName || operatorFromRelation || ''

        // Get vehicle type name from vehicle_types table
        const vehicleTypeName = v.vehicleTypeId ? (vehicleTypeMap.get(v.vehicleTypeId) || '') : ''

        // Get vehicle category from metadata
        const vehicleCategory = (v.metadata as any)?.vehicle_category || ''

        // Get badge expiry date for inspection display
        const badgeExpiryDate = vehicleBadgeExpiryMap.get(normalizedPlate) || ''

        vehicles.push({
          id: key,
          plateNumber: plateNumber,
          seatCapacity,
          bedCapacity: v.bedCapacity || 0,
          operatorId: v.operatorId || null,
          operatorName,
          vehicleType: vehicleTypeName,
          vehicleCategory,
          inspectionExpiryDate: badgeExpiryDate || v.roadWorthinessExpiry || '',
          isActive: v.isActive !== false,
          hasBadge: platesWithBadge.has(normalizedPlate),
          hasValidBadge: platesWithValidBadge.has(normalizedPlate),
          source: v.source || 'drizzle',
        })
      }

      // Filter operators to only those with ≥1 Buýt or Tuyến cố định badge
      const operators: any[] = []
      for (const op of operatorData) {
        const o = op as any
        const operatorId = o.id

        // Chỉ đơn vị có ≥1 phù hiệu Buýt/TCD: badge.operator_id (text) khớp operators.firebase_id
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
      console.log(`[QuanLyData] Debug: ${allowedPlates.size} allowed plates from badges, ${vehicleData.length} total vehicles in database, filter=all-vehicles`)
      console.log(`[QuanLyData] Debug: vehiclesByPlate unique plates = ${vehiclesByPlate.size}, final vehicles array = ${vehicles.length}`)
      console.log(`[QuanLyData] Route itinerary map: ${routeItineraryByCode.size} by code`)

      // Log first 5 plates for debugging
      const samplePlates = Array.from(allowedPlates).slice(0, 5)
      console.log(`[QuanLyData] Sample allowed plates: ${samplePlates.join(', ')}`)
      
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
        // ===== 1) Buýt: id_tuyen từ danh_muc_tuyen_bus hoặc fallback routes.firebase_id =====
        const allowedBusRouteIds = new Set<string>()
        if (stationCode) {
          try {
            const busRouteRows = await db.execute(
              // eslint-disable-next-line drizzle/enforce-query-usage
              sql`SELECT id_tuyen FROM danh_muc_tuyen_bus WHERE diem_dau = ${stationCode} OR diem_cuoi = ${stationCode} OR hanh_trinh ILIKE ${'%' + stationName + '%'}`,
            )
            for (const row of busRouteRows as any[]) {
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
          if (b.badge_type === 'Buýt') {
            if (allowedBusRouteIds.size === 0) return false
            const id = (b.tuyen_bus_code || '').trim()
            return !!id && allowedBusRouteIds.has(id)
          }

          // "Tuyến cố định" badges: routeCode thuộc tuyến có điểm đầu = bến (xem allowedFixedRouteCodes)
          if (b.badge_type === 'Tuyến cố định') {
            if (!stationName || allowedFixedRouteCodes.size === 0) {
              return false
            }
            const rc = (b.route_code || '').trim().toUpperCase()
            return rc && allowedFixedRouteCodes.has(rc)
          }

          // Other badge types: no filter (show all)
          return true
        })

        const busCount = data.badges.filter(b => b.badge_type === 'Buýt').length
        const fixedRouteCount = data.badges.filter(b => b.badge_type === 'Tuyến cố định').length
        const filteredBusCount = filteredBadges.filter(b => b.badge_type === 'Buýt').length
        const filteredFixedRouteCount = filteredBadges.filter(b => b.badge_type === 'Tuyến cố định').length
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
      // Optimizaton: Only return vehicles that match the filtered badges + manually allowed plates
      // This prevents sending 17MB of 10,000+ un-badged vehicles over the wire
      const allowedPlatesForStation = new Set<string>()
      for (const b of finalFilteredBadges) {
        if (b.license_plate_sheet) {
          allowedPlatesForStation.add(normalizePlate(b.license_plate_sheet))
        }
      }
      // Only include vehicles that have a matching badge for this station, or have any valid badge (fallback)
      if (stationCode || stationName) {
        response.vehicles = data.vehicles.filter(v => 
          allowedPlatesForStation.has(normalizePlate(v.plateNumber)) || v.hasValidBadge
        )
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
