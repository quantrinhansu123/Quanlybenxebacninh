import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { vehicleBadges, vehicles, dispatchRecords, auditLogs, routes } from '../db/schema/index.js'
import { eq, ne, and, sql } from 'drizzle-orm'
import { dashboardService } from '../services/dashboard.service.js'

// Constants
const BADGE_CACHE_CONFIG = {
  TTL: 30 * 60 * 1000, // 30 minutes - badges don't change often
} as const

// In-memory cache for vehicle badges
let badgesCache: any[] | null = null
let badgesCacheTime: number = 0
let cacheLoading: Promise<any[]> | null = null // Prevent race conditions

// Helper function to get active dispatch vehicle plates (vehicles currently in operation)
const getActiveDispatchPlates = async (): Promise<Set<string>> => {
  try {
    if (!db) throw new Error('Database not initialized')

    // Get all dispatch records that are NOT departed (still in process)
    const activeRecords = await db
      .select({
        vehiclePlateNumber: dispatchRecords.vehiclePlateNumber,
        status: dispatchRecords.status
      })
      .from(dispatchRecords)
      .where(ne(dispatchRecords.status, 'departed'))

    const activePlates = new Set<string>()
    for (const record of activeRecords) {
      if (record.vehiclePlateNumber) {
        // Normalize plate number for comparison
        activePlates.add(record.vehiclePlateNumber.replace(/[.\-\s]/g, '').toUpperCase())
      }
    }
    return activePlates
  } catch (error) {
    console.error('Error fetching active dispatch plates:', error)
    return new Set()
  }
}

// Helper function to normalize plate number for comparison
const normalizePlate = (plate: string): string => {
  return plate.replace(/[.\-\s]/g, '').toUpperCase()
}

// Helper function to map Supabase/Firebase data to VehicleBadge format
// Supports both Supabase (snake_case) and old format (Vietnamese field names)
// Also supports Drizzle camelCase output
const mapFirebaseDataToBadge = (data: any, activePlates?: Set<string>) => {
  // Drizzle uses camelCase, Supabase uses snake_case, Firebase uses Vietnamese names
  const status = data.status || data.TrangThai || ''
  // Support both camelCase (Drizzle) and snake_case (raw DB) for plateNumber
  const vehicleRef = data.plateNumber || data.plate_number || data.BienSoXe || data.vehicle_id || ''
  const vehicleId = data.vehicleId || data.vehicle_id || ''

  // Extract metadata fields (stored in JSONB)
  const metadata = (data.metadata as any) || {}

  return {
    id: data.id || data.ID_PhuHieu || '',
    badge_number: data.badgeNumber || data.badge_number || data.SoPhuHieu || '',
    license_plate_sheet: data.plateNumber || data.plate_number || vehicleRef,
    badge_type: data.badgeType || data.badge_type || data.LoaiPH || '',
    badge_color: metadata.badgeColor || metadata.badge_color || data.badge_color || data.MauPhuHieu || '',
    issue_date: data.issueDate || data.issue_date || data.NgayCap || '',
    expiry_date: data.expiryDate || data.expiry_date || data.NgayHetHan || '',
    status: status,
    file_code: metadata.fileCode || metadata.file_number || data.file_code || data.MaHoSo || '',
    issue_type: metadata.issueType || metadata.issue_type || data.issue_type || data.LoaiCap || '',
    business_license_ref: metadata.business_license_ref || data.business_license_ref || data.Ref_GPKD || '',
    issuing_authority_ref: metadata.issuing_authority_ref || data.operatorId || data.operator_id || data.Ref_DonViCapPhuHieu || '',
    vehicle_id: vehicleId,
    route_id: metadata.route_ref || data.routeId || data.route_id || data.Ref_Tuyen || '',
    bus_route_ref: data.routeCode || data.bus_route_ref || data.TuyenDuong || '',
    route_code: data.routeCode || data.route_code || '',
    route_name: data.routeName || data.route_name || '',
    itinerary: data.itinerary || '',
    vehicle_type: metadata.vehicleType || metadata.vehicle_type || data.vehicle_type || data.LoaiXe || '',
    notes: metadata.notes || data.notes || data.GhiChu || '',
    created_at: data.createdAt || data.created_at || data.synced_at || new Date().toISOString(),
    created_by: data.created_by || data.User || '',
    email_notification_sent: data.email_notification_sent || data.GuiEmailbao || false,
    notification_ref: data.notification_ref || data.Ref_ThongBao || '',
    previous_badge_number: metadata.old_badge_number || data.previous_badge_number || data.SoPhuHieuCu || '',
    renewal_due_date: data.renewal_due_date || data.Hancap || '',
    renewal_reason: data.renewal_reason || data.LyDoCapLai || '',
    renewal_reminder_shown: data.renewal_reminder_shown || data.CanCapLaiPopup || false,
    replacement_vehicle_id: metadata.replacement_vehicle || metadata.vehicle_replaced || data.replacement_vehicle_id || data.XeThayThe || '',
    revocation_date: metadata.revoke_date || data.revocation_date || data.NgayThuHoi || '',
    revocation_decision: metadata.revoke_decision || data.revocation_decision || data.QDThuHoi || '',
    revocation_reason: metadata.revoke_reason || data.revocation_reason || data.LyDoThuHoi || '',
    warn_duplicate_plate: data.warn_duplicate_plate || data.CanhBaoTrungBienSoKhiCapPH || false,
    // Compute operational_status based on active dispatch records
    operational_status: activePlates && vehicleRef
      ? (activePlates.has(normalizePlate(vehicleRef)) ? 'dang_chay' : 'trong_ben')
      : 'trong_ben',
  }
}

// Cache for vehicle ID to plate number mapping
let vehiclePlateCache: Map<string, string> | null = null
let vehiclePlateCacheTime: number = 0

// Helper to load vehicle plate numbers for resolving badge vehicle_id
const loadVehiclePlates = async (): Promise<Map<string, string>> => {
  const now = Date.now()
  if (vehiclePlateCache && (now - vehiclePlateCacheTime) < BADGE_CACHE_CONFIG.TTL) {
    return vehiclePlateCache
  }

  try {
    if (!db) throw new Error('Database not initialized')

    const data = await db
      .select({
        id: vehicles.id,
        plateNumber: vehicles.plateNumber
      })
      .from(vehicles)

    vehiclePlateCache = new Map()
    for (const vehicle of data) {
      if (vehicle.plateNumber) {
        vehiclePlateCache.set(vehicle.id, vehicle.plateNumber)
      }
    }

    vehiclePlateCacheTime = Date.now()
    return vehiclePlateCache
  } catch (error) {
    console.error('Error loading vehicle plates:', error)
    return new Map()
  }
}

// Helper to load and cache badges with deduplication
const loadBadgesFromDB = async (): Promise<any[]> => {
  const now = Date.now()

  // Return cached data if valid
  if (badgesCache && (now - badgesCacheTime) < BADGE_CACHE_CONFIG.TTL) {
    return badgesCache
  }

  // If already loading, wait for that instead of starting another load
  if (cacheLoading) {
    return cacheLoading
  }

  // Start loading
  const loadPromise = (async (): Promise<any[]> => {
    try {
      if (!db) throw new Error('Database not initialized')

      // Load from Drizzle with LEFT JOIN to routes
      const [badgeData, vehiclePlates] = await Promise.all([
        db.select({
          badge: vehicleBadges,
          route: routes
        })
        .from(vehicleBadges)
        .leftJoin(routes, eq(vehicleBadges.routeId, routes.id)),
        loadVehiclePlates()
      ])

      // Convert and cache
      const mappedBadges = badgeData.map((item: any) => {
        const badge = item.badge
        const route = item.route

        // Merge badge data with route itinerary
        const mergedData = {
          ...badge,
          itinerary: route?.itinerary || ''
        }

        const mapped = mapFirebaseDataToBadge(mergedData)
        // Resolve vehicle_id to actual plate number
        if (mapped.vehicle_id && vehiclePlates.has(mapped.vehicle_id)) {
          mapped.license_plate_sheet = vehiclePlates.get(mapped.vehicle_id)!
        }
        return mapped
      })

      // Sort once during caching
      mappedBadges.sort((a: any, b: any) => b.badge_number.localeCompare(a.badge_number))
      badgesCache = mappedBadges
      badgesCacheTime = Date.now()

      return mappedBadges
    } finally {
      cacheLoading = null
    }
  })()

  cacheLoading = loadPromise
  return loadPromise
}

// Invalidate cache (call after create/update/delete)
export const invalidateBadgesCache = () => {
  badgesCache = null
  badgesCacheTime = 0
  cacheLoading = null
  vehiclePlateCache = null
  vehiclePlateCacheTime = 0
}

export const getAllVehicleBadges = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { status, badgeType, badgeColor, vehicleId, routeId, page, limit } = req.query

    // Load from cache
    let badges = await loadBadgesFromDB()

    // Apply all filters in single pass for efficiency (W3 fix)
    const hasFilters = status || badgeType || badgeColor || vehicleId || routeId
    if (hasFilters) {
      badges = badges.filter(badge => {
        if (status && badge.status !== status) return false
        if (badgeType && badge.badge_type !== badgeType) return false
        if (badgeColor && badge.badge_color !== badgeColor) return false
        if (vehicleId && badge.vehicle_id !== vehicleId) return false
        if (routeId && badge.route_id !== routeId) return false
        return true
      })
    }

    // Server-side pagination
    const pageNum = parseInt(page as string) || 1
    const limitNum = parseInt(limit as string) || 0 // 0 = no limit
    
    if (limitNum > 0) {
      const startIndex = (pageNum - 1) * limitNum
      badges = badges.slice(startIndex, startIndex + limitNum)
    }

    res.json(badges)
  } catch (error) {
    console.error('Error fetching vehicle badges:', error)
    res.status(500).json({ 
      error: 'Failed to fetch vehicle badges',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const getVehicleBadgeById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    // Get active dispatch plates to compute operational_status
    const activePlates = await getActiveDispatchPlates()

    // Get data from Drizzle
    const [data] = await db
      .select()
      .from(vehicleBadges)
      .where(eq(vehicleBadges.id, id))

    if (!data) {
      res.status(404).json({ error: 'Vehicle badge not found' })
      return
    }

    const badge = mapFirebaseDataToBadge(data, activePlates)
    res.json(badge)
  } catch (error) {
    console.error('Error fetching vehicle badge:', error)
    res.status(500).json({
      error: 'Failed to fetch vehicle badge',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const getVehicleBadgeByPlateNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { plateNumber } = req.params

    if (!plateNumber) {
      res.status(400).json({ error: 'Plate number is required' })
      return
    }

    // Get active dispatch plates to compute operational_status
    const activePlates = await getActiveDispatchPlates()

    // Normalize plate number for comparison (remove dots, dashes, spaces)
    const normalizedPlate = plateNumber.replace(/[.\-\s]/g, '').toUpperCase()

    // Use normalized exact match to avoid matching similar plates
    const normalizedPlateExpr = sql<string>`UPPER(REPLACE(REPLACE(REPLACE(${vehicleBadges.plateNumber}, '.', ''), '-', ''), ' ', ''))`

    const results = await db
      .select()
      .from(vehicleBadges)
      .where(sql`${normalizedPlateExpr} = ${normalizedPlate}`)
      .limit(1)

    const data = results[0]

    if (!data) {
      res.status(404).json({ error: 'Vehicle badge not found for this plate number' })
      return
    }

    const badge = mapFirebaseDataToBadge(data, activePlates)
    res.json(badge)
  } catch (error) {
    console.error('Error fetching vehicle badge by plate number:', error)
    res.status(500).json({
      error: 'Failed to fetch vehicle badge',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Get ALL badges for a plate number (for KiemTraGiayToDialog - multiple badges per plate)
export const getAllBadgesByPlateNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { plateNumber } = req.params
    if (!plateNumber) {
      res.status(400).json({ error: 'Plate number is required' })
      return
    }

    const activePlates = await getActiveDispatchPlates()
    const normalizedPlate = plateNumber.replace(/[.\-\s]/g, '').toUpperCase()
    const normalizedPlateExpr = sql<string>`UPPER(REPLACE(REPLACE(REPLACE(${vehicleBadges.plateNumber}, '.', ''), '-', ''), ' ', ''))`

    const results = await db
      .select()
      .from(vehicleBadges)
      .where(sql`${normalizedPlateExpr} = ${normalizedPlate}`)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const badges = results.map(data => {
      const badge = mapFirebaseDataToBadge(data, activePlates)
      const expiryDate = data.expiryDate ? new Date(data.expiryDate) : null
      if (expiryDate) expiryDate.setHours(0, 0, 0, 0)
      return {
        ...badge,
        is_expired: expiryDate ? expiryDate < today : true,
      }
    })

    // Sort: valid first, then expired; within each group sort by expiry desc
    badges.sort((a, b) => {
      if (a.is_expired !== b.is_expired) return a.is_expired ? 1 : -1
      return (b.expiry_date || '').localeCompare(a.expiry_date || '')
    })

    const validCount = badges.filter(b => !b.is_expired).length
    const expiredCount = badges.filter(b => b.is_expired).length

    res.json({ badges, validCount, expiredCount })
  } catch (error) {
    console.error('Error fetching all badges by plate number:', error)
    res.status(500).json({
      error: 'Failed to fetch badges',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Create a new vehicle badge
export const createVehicleBadge = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) throw new Error('Database not initialized')

    // Log request body for debugging
    console.log('[CREATE BADGE] Request body:', JSON.stringify(req.body, null, 2))

    const {
      badge_number,
      license_plate_sheet,
      badge_type,
      issue_date,
      expiry_date,
      status,
      bus_route_ref,
      badge_color,
      file_code,
      issue_type,
      vehicle_type,
      notes,
    } = req.body

    // Validate required fields
    if (!badge_number || !license_plate_sheet) {
      res.status(400).json({ error: 'Số phù hiệu và biển số xe là bắt buộc' })
      return
    }

    // Check for duplicate badge number
    if (!db) throw new Error('Database not initialized')

    const existingBadges = await db
      .select({ id: vehicleBadges.id })
      .from(vehicleBadges)
      .where(eq(vehicleBadges.badgeNumber, badge_number))
      .limit(1)

    if (existingBadges.length > 0) {
      res.status(400).json({ error: 'Số phù hiệu đã tồn tại' })
      return
    }

    // Build metadata object for fields not in schema
    const metadata: any = {}
    if (badge_color) metadata.badgeColor = badge_color
    if (file_code) metadata.fileCode = file_code
    if (issue_type) metadata.issueType = issue_type
    if (vehicle_type) metadata.vehicleType = vehicle_type
    if (notes) metadata.notes = notes

    // Create new badge in Drizzle
    const [data] = await db
      .insert(vehicleBadges)
      .values({
        badgeNumber: badge_number,
        plateNumber: license_plate_sheet,
        badgeType: badge_type || null,
        issueDate: issue_date || null,
        expiryDate: expiry_date || null,
        status: status || 'active',
        routeCode: bus_route_ref || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        source: 'manual',
      })
      .returning()

    console.log('[CREATE BADGE] Created badge:', data)

    // Create audit log for tracking
    try {
      await db.insert(auditLogs).values({
        tableName: 'vehicle_badges',
        recordId: data.id,
        action: 'INSERT',
        userId: (req as any).user?.id || null,
        oldValues: null,
        newValues: {
          badgeNumber: data.badgeNumber,
          plateNumber: data.plateNumber,
          issueDate: data.issueDate,
          expiryDate: data.expiryDate,
          metadata: data.metadata,
        },
      })
      console.log('[CREATE BADGE] Audit log created')
    } catch (auditError) {
      console.error('[CREATE BADGE] Failed to create audit log:', auditError)
    }

    // Invalidate cache
    invalidateBadgesCache()

    // Return mapped badge
    const createdBadge = mapFirebaseDataToBadge(data)

    res.status(201).json(createdBadge)
  } catch (error) {
    console.error('Error creating vehicle badge:', error)
    res.status(500).json({
      error: 'Failed to create vehicle badge',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Update an existing vehicle badge
export const updateVehicleBadge = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) throw new Error('Database not initialized')

    // Log request body for debugging
    console.log('[UPDATE BADGE] Request body:', JSON.stringify(req.body, null, 2))

    const { id } = req.params
    const {
      badge_number,
      license_plate_sheet,
      badge_type,
      issue_date,
      expiry_date,
      status,
      bus_route_ref,
      badge_color,
      file_code,
      issue_type,
      vehicle_type,
      notes,
    } = req.body

    // Check for duplicate badge number (excluding current badge)
    if (badge_number) {
      if (!db) throw new Error('Database not initialized')

      const duplicateBadges = await db
        .select({ id: vehicleBadges.id })
        .from(vehicleBadges)
        .where(and(
          eq(vehicleBadges.badgeNumber, badge_number),
          ne(vehicleBadges.id, id)
        ))
        .limit(1)

      if (duplicateBadges.length > 0) {
        res.status(400).json({ error: 'Số phù hiệu đã tồn tại' })
        return
      }
    }

    // Get current badge to preserve existing metadata
    const [currentBadge] = await db
      .select()
      .from(vehicleBadges)
      .where(eq(vehicleBadges.id, id))
      .limit(1)

    if (!currentBadge) {
      res.status(404).json({ error: 'Vehicle badge not found' })
      return
    }

    // Build metadata object for fields not in schema
    const currentMetadata = (currentBadge.metadata as any) || {}
    const metadata: any = { ...currentMetadata }
    if (badge_color !== undefined) metadata.badgeColor = badge_color
    if (file_code !== undefined) metadata.fileCode = file_code
    if (issue_type !== undefined) metadata.issueType = issue_type
    if (vehicle_type !== undefined) metadata.vehicleType = vehicle_type
    if (notes !== undefined) metadata.notes = notes

    // Build update data
    const updateData: any = {}
    if (badge_number !== undefined) updateData.badgeNumber = badge_number
    if (license_plate_sheet !== undefined) updateData.plateNumber = license_plate_sheet
    if (badge_type !== undefined) updateData.badgeType = badge_type
    if (issue_date !== undefined) updateData.issueDate = issue_date
    if (expiry_date !== undefined) updateData.expiryDate = expiry_date
    if (status !== undefined) updateData.status = status
    if (bus_route_ref !== undefined) updateData.routeCode = bus_route_ref
    if (Object.keys(metadata).length > 0) updateData.metadata = metadata

    // Always update timestamp
    updateData.updatedAt = new Date()

    // Update in Drizzle
    if (!db) throw new Error('Database not initialized')

    const results = await db
      .update(vehicleBadges)
      .set(updateData)
      .where(eq(vehicleBadges.id, id))
      .returning()

    const data = results[0]

    if (!data) {
      res.status(404).json({ error: 'Vehicle badge not found' })
      return
    }

    console.log('[UPDATE BADGE] Updated badge:', data)

    // Create audit log for tracking changes
    try {
      await db.insert(auditLogs).values({
        tableName: 'vehicle_badges',
        recordId: id,
        action: 'UPDATE',
        userId: (req as any).user?.id || null,
        oldValues: {
          badgeNumber: currentBadge.badgeNumber,
          plateNumber: currentBadge.plateNumber,
          issueDate: currentBadge.issueDate,
          expiryDate: currentBadge.expiryDate,
          metadata: currentBadge.metadata,
        },
        newValues: {
          badgeNumber: data.badgeNumber,
          plateNumber: data.plateNumber,
          issueDate: data.issueDate,
          expiryDate: data.expiryDate,
          metadata: data.metadata,
        },
      })
      console.log('[UPDATE BADGE] Audit log created')
    } catch (auditError) {
      console.error('[UPDATE BADGE] Failed to create audit log:', auditError)
      // Don't fail update if audit logging fails
    }

    // Invalidate badge cache
    invalidateBadgesCache()

    // Invalidate dashboard cache since warnings depend on badge expiry dates
    dashboardService.clearCache()

    // Return mapped badge
    const updatedBadge = mapFirebaseDataToBadge(data)

    res.json(updatedBadge)
  } catch (error) {
    console.error('Error updating vehicle badge:', error)
    res.status(500).json({
      error: 'Failed to update vehicle badge',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Delete a vehicle badge
export const deleteVehicleBadge = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    // Get badge before delete for audit log
    const [currentBadge] = await db
      .select()
      .from(vehicleBadges)
      .where(eq(vehicleBadges.id, id))
      .limit(1)

    // Delete from Drizzle
    await db
      .delete(vehicleBadges)
      .where(eq(vehicleBadges.id, id))

    // Create audit log if badge existed
    if (currentBadge) {
      try {
        await db.insert(auditLogs).values({
          tableName: 'vehicle_badges',
          recordId: id,
          action: 'DELETE',
          userId: (req as any).user?.id || null,
          oldValues: {
            badgeNumber: currentBadge.badgeNumber,
            plateNumber: currentBadge.plateNumber,
            issueDate: currentBadge.issueDate,
            expiryDate: currentBadge.expiryDate,
            metadata: currentBadge.metadata,
          },
          newValues: null,
        })
        console.log('[DELETE BADGE] Audit log created')
      } catch (auditError) {
        console.error('[DELETE BADGE] Failed to create audit log:', auditError)
      }
    }

    // Invalidate cache
    invalidateBadgesCache()

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting vehicle badge:', error)
    res.status(500).json({
      error: 'Failed to delete vehicle badge',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const getVehicleBadgeStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!db) throw new Error('Database not initialized')

    // Get data from Drizzle
    const badges = await db.select().from(vehicleBadges)

    // Calculate stats
    const totalCount = badges.length
    const activeCount = badges.filter((b: any) => b.status === 'active').length
    const expiredCount = badges.filter((b: any) => b.status === 'expired').length

    // Get badges expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const expiringSoonCount = badges.filter((b: any) => {
      if (b.status !== 'active' || !b.expiryDate) return false
      const expiryDate = new Date(b.expiryDate)
      return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date()
    }).length

    res.json({
      total: totalCount,
      active: activeCount,
      expired: expiredCount,
      expiringSoon: expiringSoonCount,
    })
  } catch (error) {
    console.error('Error fetching vehicle badge stats:', error)
    res.status(500).json({
      error: 'Failed to fetch vehicle badge statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
