/**
 * Report Repository
 * Handles complex queries with JOINs for reporting endpoints
 */
import { eq, and, gte, lte, isNotNull, sql, desc } from 'drizzle-orm'
import { db } from '../../db/drizzle.js'
import {
  dispatchRecords,
  vehicles,
  drivers,
  routes,
  operators
} from '../../db/schema/index.js'

export interface VehicleLogFilters {
  startDate: string
  endDate: string
  vehicleId?: string
}

export interface RevenueSummaryFilters {
  startDate: string
  endDate: string
  operatorId?: string
}

export interface StationActivityFilters {
  startDate: string
  endDate: string
}

export interface VehicleLogRecord {
  id: string
  vehicleId: string | null
  driverId: string | null
  routeId: string | null
  operatorId: string | null
  entryTime: Date | null
  exitTime: Date | null
  status: string
  paymentAmount: string | null
  vehiclePlateNumber: string | null
  driverName: string | null
  routeName: string | null
  operatorName: string | null
}

export interface RevenueSummary {
  date: string
  totalRevenue: number
  vehicleCount: number
  transactionCount: number
}

export interface StationActivityRecord extends VehicleLogRecord {
  // Same as VehicleLogRecord
}

/**
 * Get vehicle logs with all related data in a single query
 * Uses LEFT JOINs to fetch vehicles, drivers, routes, operators
 */
export async function getVehicleLogs(filters: VehicleLogFilters): Promise<VehicleLogRecord[]> {
  if (!db) {
    throw new Error('[ReportRepository] Database not initialized')
  }

  const conditions = [
    gte(dispatchRecords.entryTime, new Date(filters.startDate)),
    lte(dispatchRecords.entryTime, new Date(filters.endDate)),
  ]

  if (filters.vehicleId) {
    conditions.push(eq(dispatchRecords.vehicleId, filters.vehicleId))
  }

  const results = await db
    .select({
      id: dispatchRecords.id,
      vehicleId: dispatchRecords.vehicleId,
      driverId: dispatchRecords.driverId,
      routeId: dispatchRecords.routeId,
      operatorId: dispatchRecords.operatorId,
      entryTime: dispatchRecords.entryTime,
      exitTime: dispatchRecords.exitTime,
      status: dispatchRecords.status,
      paymentAmount: dispatchRecords.paymentAmount,
      // Use denormalized fields first, fallback to JOINed data
      vehiclePlateNumber: sql<string | null>`COALESCE(${dispatchRecords.vehiclePlateNumber}, ${vehicles.plateNumber})`,
      driverName: sql<string | null>`COALESCE(${dispatchRecords.driverFullName}, ${drivers.fullName})`,
      routeName: sql<string | null>`COALESCE(${dispatchRecords.routeName}, CONCAT(${routes.departureStation}, ' - ', ${routes.arrivalStation}))`,
      operatorName: sql<string | null>`COALESCE(${dispatchRecords.vehicleOperatorName}, ${operators.name})`,
    })
    .from(dispatchRecords)
    .leftJoin(vehicles, eq(dispatchRecords.vehicleId, vehicles.id))
    .leftJoin(drivers, eq(dispatchRecords.driverId, drivers.id))
    .leftJoin(routes, eq(dispatchRecords.routeId, routes.id))
    .leftJoin(operators, eq(dispatchRecords.operatorId, operators.id))
    .where(and(...conditions))
    .orderBy(desc(dispatchRecords.entryTime))

  return results
}

/**
 * Get revenue summary grouped by date
 * Uses SQL aggregation with GROUP BY
 */
export async function getRevenueSummary(filters: RevenueSummaryFilters): Promise<RevenueSummary[]> {
  if (!db) {
    throw new Error('[ReportRepository] Database not initialized')
  }

  const conditions = [
    gte(dispatchRecords.entryTime, new Date(filters.startDate)),
    lte(dispatchRecords.entryTime, new Date(filters.endDate)),
    isNotNull(dispatchRecords.paymentAmount),
    eq(dispatchRecords.status, 'departed'),
  ]

  if (filters.operatorId) {
    conditions.push(eq(dispatchRecords.operatorId, filters.operatorId))
  }

  const results = await db
    .select({
      date: sql<string>`DATE(${dispatchRecords.entryTime})::text`,
      totalRevenue: sql<number>`COALESCE(SUM(CAST(${dispatchRecords.paymentAmount} AS NUMERIC)), 0)`,
      vehicleCount: sql<number>`COUNT(DISTINCT ${dispatchRecords.vehicleId})`,
      transactionCount: sql<number>`COUNT(*)`,
    })
    .from(dispatchRecords)
    .where(and(...conditions))
    .groupBy(sql`DATE(${dispatchRecords.entryTime})`)
    .orderBy(sql`DATE(${dispatchRecords.entryTime})`)

  return results.map(row => ({
    date: row.date,
    totalRevenue: Number(row.totalRevenue),
    vehicleCount: Number(row.vehicleCount),
    transactionCount: Number(row.transactionCount),
  }))
}

/**
 * Get station activity with all related data
 * Similar to getVehicleLogs but with different filtering
 */
export async function getStationActivity(filters: StationActivityFilters): Promise<StationActivityRecord[]> {
  if (!db) {
    throw new Error('[ReportRepository] Database not initialized')
  }

  const conditions = [
    gte(dispatchRecords.entryTime, new Date(filters.startDate)),
    lte(dispatchRecords.entryTime, new Date(filters.endDate)),
  ]

  const results = await db
    .select({
      id: dispatchRecords.id,
      vehicleId: dispatchRecords.vehicleId,
      driverId: dispatchRecords.driverId,
      routeId: dispatchRecords.routeId,
      operatorId: dispatchRecords.operatorId,
      entryTime: dispatchRecords.entryTime,
      exitTime: dispatchRecords.exitTime,
      status: dispatchRecords.status,
      paymentAmount: dispatchRecords.paymentAmount,
      vehiclePlateNumber: sql<string | null>`COALESCE(${dispatchRecords.vehiclePlateNumber}, ${vehicles.plateNumber})`,
      driverName: sql<string | null>`COALESCE(${dispatchRecords.driverFullName}, ${drivers.fullName})`,
      routeName: sql<string | null>`COALESCE(${dispatchRecords.routeName}, CONCAT(${routes.departureStation}, ' - ', ${routes.arrivalStation}))`,
      operatorName: sql<string | null>`COALESCE(${dispatchRecords.vehicleOperatorName}, ${operators.name})`,
    })
    .from(dispatchRecords)
    .leftJoin(vehicles, eq(dispatchRecords.vehicleId, vehicles.id))
    .leftJoin(drivers, eq(dispatchRecords.driverId, drivers.id))
    .leftJoin(routes, eq(dispatchRecords.routeId, routes.id))
    .leftJoin(operators, eq(dispatchRecords.operatorId, operators.id))
    .where(and(...conditions))
    .orderBy(desc(dispatchRecords.entryTime))

  return results
}

/**
 * Get invalid vehicles (rejected permits)
 */
export async function getInvalidVehicles(filters: VehicleLogFilters): Promise<VehicleLogRecord[]> {
  if (!db) {
    throw new Error('[ReportRepository] Database not initialized')
  }

  const conditions = [
    gte(dispatchRecords.entryTime, new Date(filters.startDate)),
    lte(dispatchRecords.entryTime, new Date(filters.endDate)),
    eq(dispatchRecords.permitStatus, 'rejected'),
  ]

  const results = await db
    .select({
      id: dispatchRecords.id,
      vehicleId: dispatchRecords.vehicleId,
      driverId: dispatchRecords.driverId,
      routeId: dispatchRecords.routeId,
      operatorId: dispatchRecords.operatorId,
      entryTime: dispatchRecords.entryTime,
      exitTime: dispatchRecords.exitTime,
      status: dispatchRecords.status,
      paymentAmount: dispatchRecords.paymentAmount,
      vehiclePlateNumber: sql<string | null>`COALESCE(${dispatchRecords.vehiclePlateNumber}, ${vehicles.plateNumber})`,
      driverName: sql<string | null>`COALESCE(${dispatchRecords.driverFullName}, ${drivers.fullName})`,
      routeName: sql<string | null>`COALESCE(${dispatchRecords.routeName}, CONCAT(${routes.departureStation}, ' - ', ${routes.arrivalStation}))`,
      operatorName: sql<string | null>`COALESCE(${dispatchRecords.vehicleOperatorName}, ${operators.name})`,
    })
    .from(dispatchRecords)
    .leftJoin(vehicles, eq(dispatchRecords.vehicleId, vehicles.id))
    .leftJoin(drivers, eq(dispatchRecords.driverId, drivers.id))
    .leftJoin(routes, eq(dispatchRecords.routeId, routes.id))
    .leftJoin(operators, eq(dispatchRecords.operatorId, operators.id))
    .where(and(...conditions))
    .orderBy(desc(dispatchRecords.entryTime))

  return results
}
