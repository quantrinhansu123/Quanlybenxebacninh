/**
 * Denormalization utilities for Drizzle ORM
 *
 * These utilities fetch and build denormalized data for dispatch_records
 * to reduce the number of queries needed when reading dispatch data.
 *
 * Migrated from Firebase to Drizzle ORM
 */

import { db } from '../db/drizzle.js'
import { vehicles } from '../db/schema/vehicles.js'
import { drivers } from '../db/schema/drivers.js'
import { routes } from '../db/schema/routes.js'
import { users } from '../db/schema/users.js'
import { operators } from '../db/schema/operators.js'
import { eq } from 'drizzle-orm'

export interface DenormalizedVehicleData {
  plateNumber: string
  seatCount: number | null
  operatorId: string | null
  operatorName: string | null
  operatorCode: string | null
}

export interface DenormalizedDriverData {
  fullName: string
}

export interface DenormalizedRouteData {
  name: string | null
  type: string | null
  code: string | null
  destinationId: string | null
  destinationName: string | null
  destinationCode: string | null
}

export interface DenormalizedUserData {
  fullName: string | null
}

export interface DenormalizedData {
  vehicle: DenormalizedVehicleData
  driver: DenormalizedDriverData
  route: DenormalizedRouteData | null
  user: DenormalizedUserData | null
}

/**
 * Fetches denormalized data for a dispatch record in parallel
 * Uses Drizzle ORM to query PostgreSQL
 */
export async function fetchDenormalizedData(params: {
  vehicleId: string
  driverId?: string | null
  routeId?: string | null
  userId?: string | null
}): Promise<DenormalizedData> {
  if (!db) {
    throw new Error('[Denormalization] Database not initialized')
  }

  // Check if vehicleId is legacy format (these don't exist in Supabase yet)
  const isLegacyVehicle = params.vehicleId.startsWith('legacy_')
  const isBadgeVehicle = params.vehicleId.startsWith('badge_')

  let vehicleData: DenormalizedVehicleData = {
    plateNumber: '',
    seatCount: null,
    operatorId: null,
    operatorName: null,
    operatorCode: null,
  }

  // For legacy vehicles, we can't fetch from Supabase - return empty data
  // The vehicle info should be passed from frontend or stored elsewhere
  if (!isLegacyVehicle && !isBadgeVehicle && params.vehicleId) {
    try {
      const [vehicle] = await db
        .select({
          id: vehicles.id,
          plateNumber: vehicles.plateNumber,
          seatCount: vehicles.seatCount,
          operatorId: vehicles.operatorId,
        })
        .from(vehicles)
        .where(eq(vehicles.id, params.vehicleId))
        .limit(1)

      if (vehicle) {
        let operatorData = null
        if (vehicle.operatorId) {
          const [op] = await db
            .select({ id: operators.id, name: operators.name, code: operators.code })
            .from(operators)
            .where(eq(operators.id, vehicle.operatorId))
            .limit(1)
          operatorData = op
        }

        vehicleData = {
          plateNumber: vehicle.plateNumber || '',
          seatCount: vehicle.seatCount || null,
          operatorId: vehicle.operatorId || null,
          operatorName: operatorData?.name || null,
          operatorCode: operatorData?.code || null,
        }
      }
    } catch (error) {
      console.warn(`[fetchDenormalizedData] Failed to fetch vehicle ${params.vehicleId}:`, error)
    }
  }

  // Fetch other entities in parallel
  const [driverResult, routeResult, userResult] = await Promise.all([
    params.driverId
      ? db.select({ id: drivers.id, name: drivers.fullName })
          .from(drivers)
          .where(eq(drivers.id, params.driverId))
          .limit(1)
      : Promise.resolve([]),
    params.routeId
      ? db.select({
            id: routes.id,
            routeCode: routes.routeCode,
            routeType: routes.routeType,
            departureStation: routes.departureStation,
            arrivalStation: routes.arrivalStation,
          })
          .from(routes)
          .where(eq(routes.id, params.routeId))
          .limit(1)
      : Promise.resolve([]),
    params.userId
      ? db.select({ id: users.id, name: users.name })
          .from(users)
          .where(eq(users.id, params.userId))
          .limit(1)
      : Promise.resolve([]),
  ])

  const driver = driverResult[0]
  const route = routeResult[0]
  const user = userResult[0]

  // Note: Destination lookup would need destinations table - not yet migrated
  // For now, return null destination data

  return {
    vehicle: vehicleData,
    driver: {
      fullName: driver?.name || '',
    },
    route: route
      ? {
          name: route.arrivalStation || null, // Use arrival station as route name
          type: route.routeType || null,
          code: route.routeCode || null,
          destinationId: null, // Not available in current schema
          destinationName: route.arrivalStation || null,
          destinationCode: null,
        }
      : null,
    user: user
      ? {
          fullName: user.name || null,
        }
      : null,
  }
}

/**
 * Builds the denormalized fields object for database insert/update
 * Returns camelCase fields matching Drizzle schema
 */
export function buildDenormalizedFields(data: DenormalizedData) {
  return {
    // Vehicle denormalized data
    vehiclePlateNumber: data.vehicle.plateNumber,
    vehicleSeatCount: data.vehicle.seatCount,
    vehicleOperatorId: data.vehicle.operatorId,
    vehicleOperatorName: data.vehicle.operatorName,
    vehicleOperatorCode: data.vehicle.operatorCode,
    // Driver denormalized data
    driverFullName: data.driver.fullName,
    // Route denormalized data
    routeName: data.route?.name || null,
    routeType: data.route?.type || null,
    routeCode: data.route?.code || null,
    routeDestinationId: data.route?.destinationId || null,
    routeDestinationName: data.route?.destinationName || null,
    routeDestinationCode: data.route?.destinationCode || null,
  }
}

/**
 * Fetches user name by ID for workflow functions
 * Returns null if userId is not provided or user not found
 */
export async function fetchUserName(userId: string | null | undefined): Promise<string | null> {
  if (!userId || !db) return null

  try {
    const [user] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    return user?.name || null
  } catch (error) {
    console.warn(`[fetchUserName] Failed to fetch user ${userId}:`, error)
    return null
  }
}

/**
 * Fetches route denormalized data by ID
 * Used when route is updated during workflow
 */
export async function fetchRouteData(routeId: string | null | undefined): Promise<DenormalizedRouteData | null> {
  if (!routeId || !db) return null

  try {
    const [route] = await db
      .select({
        id: routes.id,
        routeCode: routes.routeCode,
        routeType: routes.routeType,
        arrivalStation: routes.arrivalStation,
      })
      .from(routes)
      .where(eq(routes.id, routeId))
      .limit(1)

    if (!route) return null

    return {
      name: route.arrivalStation || null,
      type: route.routeType || null,
      code: route.routeCode || null,
      destinationId: null,
      destinationName: route.arrivalStation || null,
      destinationCode: null,
    }
  } catch (error) {
    console.warn(`[fetchRouteData] Failed to fetch route ${routeId}:`, error)
    return null
  }
}

/**
 * Builds route denormalized fields for database update
 * Returns camelCase fields matching Drizzle schema
 */
export function buildRouteDenormalizedFields(routeData: DenormalizedRouteData | null) {
  if (!routeData) {
    return {
      routeName: null,
      routeType: null,
      routeCode: null,
      routeDestinationId: null,
      routeDestinationName: null,
      routeDestinationCode: null,
    }
  }

  return {
    routeName: routeData.name,
    routeType: routeData.type,
    routeCode: routeData.code,
    routeDestinationId: routeData.destinationId,
    routeDestinationName: routeData.destinationName,
    routeDestinationCode: routeData.destinationCode,
  }
}
