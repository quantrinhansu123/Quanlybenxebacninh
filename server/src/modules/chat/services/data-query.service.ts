/**
 * Data Query Service - Migrated to Drizzle ORM
 * Handles chat module data queries using PostgreSQL
 */
import { db } from '../../../db/drizzle.js'
import {
  dispatchRecords,
  vehicles,
  drivers,
  operators,
  routes,
  vehicleBadges,
  schedules
} from '../../../db/schema/index.js'
import { eq, and, ilike, sql, gte, count, lt } from 'drizzle-orm'
import type { IntentResult, QueryResult } from '../types/chat.types.js'

export class DataQueryService {
  async execute(intent: IntentResult): Promise<QueryResult> {
    if (!db) {
      return { success: false, error: 'Database connection not available', source: 'none' }
    }

    const { type, extractedParams } = intent

    switch (type) {
      case 'VEHICLE_LOOKUP':
        return this.queryVehicleComplete(extractedParams.plateNumber, extractedParams.listAll === 'true')
      case 'DRIVER_SEARCH':
        return this.queryDriver(extractedParams.searchTerm)
      case 'ROUTE_INFO':
        return this.queryRoute(extractedParams.searchTerm, extractedParams.destination)
      case 'SCHEDULE_QUERY':
        return this.querySchedule(extractedParams.searchTerm)
      case 'DISPATCH_STATS':
        return this.queryDispatchStats(extractedParams.period)
      case 'BADGE_LOOKUP':
        return this.queryBadge(extractedParams.badgeNumber)
      case 'OPERATOR_INFO':
        return this.queryOperator(extractedParams.searchTerm)
      default:
        return { success: false, error: 'Unknown query type', source: 'none' }
    }
  }

  // Query xe + phù hiệu theo biển số
  async queryVehicleComplete(plateNumber: string, listAll: boolean = false): Promise<QueryResult> {
    if (!db) {
      return { success: false, error: 'Database connection not available', source: 'vehicles' }
    }

    try {
      // If listAll mode, return summary
      if (listAll || !plateNumber) {
        const [vehicleCount, badgeCount] = await Promise.all([
          db.select({ count: count() }).from(vehicles).then(r => r[0]?.count || 0),
          db.select({ count: count() }).from(vehicleBadges).then(r => r[0]?.count || 0)
        ])

        // Get sample plates
        const sampleVehicles = await db
          .select({ plateNumber: vehicles.plateNumber })
          .from(vehicles)
          .where(eq(vehicles.isActive, true))
          .limit(5)

        const samplePlates = sampleVehicles.map(v => v.plateNumber)

        return {
          success: true,
          data: {
            summary: true,
            vehicleCount: Number(vehicleCount),
            badgeCount: Number(badgeCount),
            legacyCount: 0,
            samplePlates,
            message: `Hệ thống có ${vehicleCount} xe đăng ký, ${badgeCount} phù hiệu. Hãy nhập biển số cụ thể để tra cứu (VD: xe 98H07480)`
          },
          source: 'vehicles'
        }
      }

      const searchPlate = plateNumber.toUpperCase()

      // 1. Search in vehicles collection with operator info
      const vehicleResults = await db
        .select({
          id: vehicles.id,
          plateNumber: vehicles.plateNumber,
          operatorId: vehicles.operatorId,
          operatorName: vehicles.operatorName,
          operatorCode: vehicles.operatorCode,
          seatCount: vehicles.seatCount,
          bedCapacity: vehicles.bedCapacity,
          brand: vehicles.brand,
          model: vehicles.model,
          yearOfManufacture: vehicles.yearOfManufacture,
          color: vehicles.color,
          chassisNumber: vehicles.chassisNumber,
          engineNumber: vehicles.engineNumber,
          imageUrl: vehicles.imageUrl,
          insuranceExpiry: vehicles.insuranceExpiry,
          roadWorthinessExpiry: vehicles.roadWorthinessExpiry,
          gpsProvider: vehicles.gpsProvider,
          province: vehicles.province,
          isActive: vehicles.isActive,
          operationalStatus: vehicles.operationalStatus,
          notes: vehicles.notes,
        })
        .from(vehicles)
        .where(ilike(vehicles.plateNumber, `%${searchPlate}%`))

      // 2. Search in vehicle_badges
      const badgeResults = await db
        .select()
        .from(vehicleBadges)
        .where(ilike(vehicleBadges.plateNumber, `%${searchPlate}%`))

      // Check if any results found
      const totalFound = vehicleResults.length + badgeResults.length
      if (totalFound === 0) {
        return {
          success: false,
          error: `Không tìm thấy xe với biển số "${plateNumber}". Hãy kiểm tra lại biển số hoặc thử tìm kiếm khác.`,
          source: 'vehicles'
        }
      }

      return {
        success: true,
        data: {
          plateNumber,
          vehicles: vehicleResults,
          badges: badgeResults,
          legacyVehicles: [],
          totalFound
        },
        source: 'vehicles+badges'
      }
    } catch (error: any) {
      console.error('queryVehicleComplete error:', error)
      return { success: false, error: error.message, source: 'vehicles' }
    }
  }

  // Keep old method for backward compatibility
  async queryVehicle(plateNumber: string): Promise<QueryResult> {
    return this.queryVehicleComplete(plateNumber, false)
  }

  async queryDriver(searchTerm: string): Promise<QueryResult> {
    if (!db) {
      return { success: false, error: 'Database connection not available', source: 'drivers' }
    }

    if (!searchTerm) {
      return { success: false, error: 'Không có thông tin tìm kiếm', source: 'drivers' }
    }

    try {
      const searchLower = searchTerm.toLowerCase()

      const results = await db
        .select()
        .from(drivers)
        .where(
          sql`LOWER(${drivers.fullName}) LIKE ${`%${searchLower}%`} OR LOWER(${drivers.licenseNumber}) LIKE ${`%${searchLower}%`}`
        )

      if (results.length > 0) {
        return { success: true, data: results, source: 'drivers' }
      }

      return { success: false, error: `Không tìm thấy tài xế "${searchTerm}"`, source: 'drivers' }
    } catch (error: any) {
      return { success: false, error: error.message, source: 'drivers' }
    }
  }

  async queryRoute(searchTerm: string, _destination?: string): Promise<QueryResult> {
    if (!db) {
      return { success: false, error: 'Database connection not available', source: 'routes' }
    }

    if (!searchTerm) {
      return { success: false, error: 'Không có thông tin tuyến', source: 'routes' }
    }

    try {
      const searchLower = searchTerm.toLowerCase()

      // Search in routes collection
      const results = await db
        .select()
        .from(routes)
        .where(
          sql`LOWER(COALESCE(${routes.routeCodeOld}, '')) LIKE ${`%${searchLower}%`}
           OR LOWER(${routes.routeCode}) LIKE ${`%${searchLower}%`}
           OR LOWER(${routes.departureStation}) LIKE ${`%${searchLower}%`}
           OR LOWER(${routes.arrivalStation}) LIKE ${`%${searchLower}%`}`
        )
        .limit(10)

      if (results.length > 0) {
        return { success: true, data: results, source: 'routes' }
      }

      return { success: false, error: `Không tìm thấy tuyến "${searchTerm}"`, source: 'routes' }
    } catch (error: any) {
      return { success: false, error: error.message, source: 'routes' }
    }
  }

  async querySchedule(_searchTerm: string): Promise<QueryResult> {
    if (!db) {
      return { success: false, error: 'Database connection not available', source: 'schedules' }
    }

    try {
      const results = await db
        .select()
        .from(schedules)
        .where(eq(schedules.isActive, true))
        .limit(20)

      if (results.length === 0) {
        return { success: false, error: 'Chưa có lịch trình nào', source: 'schedules' }
      }

      return { success: true, data: results, source: 'schedules' }
    } catch (error: any) {
      return { success: false, error: error.message, source: 'schedules' }
    }
  }

  async queryDispatchStats(_period: string): Promise<QueryResult> {
    if (!db) {
      return { success: false, error: 'Database connection not available', source: 'dispatch_records' }
    }

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Count entries and exits for today
      const [enteredResult, exitedResult] = await Promise.all([
        db
          .select({ count: count() })
          .from(dispatchRecords)
          .where(
            and(
              gte(dispatchRecords.entryTime, today),
              lt(dispatchRecords.entryTime, tomorrow)
            )
          )
          .then(r => r[0]?.count || 0),
        db
          .select({ count: count() })
          .from(dispatchRecords)
          .where(
            and(
              gte(dispatchRecords.exitTime, today),
              lt(dispatchRecords.exitTime, tomorrow)
            )
          )
          .then(r => r[0]?.count || 0)
      ])

      const entered = Number(enteredResult)
      const exited = Number(exitedResult)

      return {
        success: true,
        data: {
          date: today.toISOString().split('T')[0],
          totalToday: entered,
          entered,
          exited
        },
        source: 'dispatch_records'
      }
    } catch (error: any) {
      return { success: false, error: error.message, source: 'dispatch_records' }
    }
  }

  async queryBadge(badgeNumber: string): Promise<QueryResult> {
    if (!db) {
      return { success: false, error: 'Database connection not available', source: 'vehicle_badges' }
    }

    if (!badgeNumber) {
      return { success: false, error: 'Không có số phù hiệu', source: 'vehicle_badges' }
    }

    try {
      const searchUpper = badgeNumber.toUpperCase()

      const result = await db
        .select()
        .from(vehicleBadges)
        .where(
          sql`UPPER(${vehicleBadges.badgeNumber}) LIKE ${`%${searchUpper}%`}
           OR UPPER(${vehicleBadges.plateNumber}) LIKE ${`%${searchUpper}%`}`
        )
        .limit(1)

      if (result.length > 0) {
        return { success: true, data: result[0], source: 'vehicle_badges' }
      }

      return { success: false, error: `Không tìm thấy phù hiệu "${badgeNumber}"`, source: 'vehicle_badges' }
    } catch (error: any) {
      return { success: false, error: error.message, source: 'vehicle_badges' }
    }
  }

  async queryOperator(searchTerm: string): Promise<QueryResult> {
    if (!db) {
      return { success: false, error: 'Database connection not available', source: 'operators' }
    }

    if (!searchTerm) {
      return { success: false, error: 'Không có thông tin đơn vị', source: 'operators' }
    }

    try {
      const searchLower = searchTerm.toLowerCase()

      const results = await db
        .select()
        .from(operators)
        .where(
          sql`LOWER(${operators.name}) LIKE ${`%${searchLower}%`} OR LOWER(${operators.code}) LIKE ${`%${searchLower}%`}`
        )

      if (results.length > 0) {
        return { success: true, data: results, source: 'operators' }
      }

      return { success: false, error: `Không tìm thấy đơn vị "${searchTerm}"`, source: 'operators' }
    } catch (error: any) {
      return { success: false, error: error.message, source: 'operators' }
    }
  }

  async getContextForAI(message: string): Promise<any> {
    if (!db) {
      return {}
    }

    const context: any = {}

    // Extract potential vehicle reference
    const vehicleMatch = message.match(/([0-9]{2}[A-Z][0-9A-Z\-\.]+)/i)
    if (vehicleMatch) {
      const vehicleResult = await this.queryVehicle(vehicleMatch[1])
      if (vehicleResult.success) {
        context.vehicle = vehicleResult.data
      }
    }

    // Get general stats
    try {
      const [vehicleCount, driverCount, operatorCount] = await Promise.all([
        db.select({ count: count() }).from(vehicles).then(r => r[0]?.count || 0),
        db.select({ count: count() }).from(drivers).then(r => r[0]?.count || 0),
        db.select({ count: count() }).from(operators).then(r => r[0]?.count || 0)
      ])

      context.stats = {
        totalVehicles: Number(vehicleCount),
        totalDrivers: Number(driverCount),
        totalOperators: Number(operatorCount)
      }
    } catch {
      // Ignore stats errors
    }

    return context
  }
}

export const dataQueryService = new DataQueryService()
