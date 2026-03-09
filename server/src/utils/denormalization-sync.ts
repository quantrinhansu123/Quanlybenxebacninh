/**
 * Denormalization Sync Utilities for Drizzle ORM
 *
 * These functions handle propagating changes from source entities (vehicles, drivers, routes)
 * to the denormalized fields in dispatch_records.
 *
 * When source data changes, we need to update all dispatch_records that reference
 * that entity to keep the denormalized data consistent.
 */

import { db } from '../db/drizzle.js'
import { dispatchRecords, vehicles } from '../db/schema/index.js'
import { eq, inArray } from 'drizzle-orm'

/**
 * Sync vehicle changes to all dispatch records that reference this vehicle
 *
 * Call this when:
 * - Vehicle plate number changes
 * - Vehicle operator assignment changes
 *
 * @param vehicleId - The ID of the vehicle that changed
 * @param changes - The fields that changed
 */
export async function syncVehicleChanges(vehicleId: string, changes: {
  plateNumber?: string
  operatorId?: string | null
  operatorName?: string | null
  operatorCode?: string | null
}): Promise<{ updated: number; failed: number }> {
  try {
    if (!db) throw new Error('Database not initialized')

    // Find all dispatch records for this vehicle
    const records = await db.select({ id: dispatchRecords.id })
      .from(dispatchRecords)
      .where(eq(dispatchRecords.vehicleId, vehicleId))

    if (records.length === 0) {
      return { updated: 0, failed: 0 }
    }

    // Build update object
    const updates: Record<string, any> = {}
    if (changes.plateNumber !== undefined) updates.vehiclePlateNumber = changes.plateNumber
    if (changes.operatorId !== undefined) updates.vehicleOperatorId = changes.operatorId
    if (changes.operatorName !== undefined) updates.vehicleOperatorName = changes.operatorName
    if (changes.operatorCode !== undefined) updates.vehicleOperatorCode = changes.operatorCode

    if (Object.keys(updates).length === 0) {
      return { updated: 0, failed: 0 }
    }

    // Batch update all affected records with single query
    try {
      const recordIds = records.map(r => r.id)
      await db.update(dispatchRecords)
        .set(updates)
        .where(inArray(dispatchRecords.id, recordIds))

      console.log(`[Denorm Sync] Vehicle ${vehicleId}: Updated ${records.length} dispatch records`)
      return { updated: records.length, failed: 0 }
    } catch (err) {
      console.error(`Failed to sync vehicle changes to dispatch records:`, err)
      return { updated: 0, failed: records.length }
    }
  } catch (error) {
    console.error(`[Denorm Sync] Failed to sync vehicle changes for ${vehicleId}:`, error)
    return { updated: 0, failed: 0 }
  }
}

/**
 * Sync driver changes to all dispatch records that reference this driver
 *
 * Call this when:
 * - Driver full name changes
 *
 * @param driverId - The ID of the driver that changed
 * @param fullName - The new full name
 */
export async function syncDriverChanges(driverId: string, fullName: string): Promise<{ updated: number; failed: number }> {
  try {
    if (!db) throw new Error('Database not initialized')

    // Find all dispatch records for this driver
    const records = await db.select({ id: dispatchRecords.id })
      .from(dispatchRecords)
      .where(eq(dispatchRecords.driverId, driverId))

    if (records.length === 0) {
      return { updated: 0, failed: 0 }
    }

    // Batch update all affected records with single query
    try {
      const recordIds = records.map(r => r.id)
      await db.update(dispatchRecords)
        .set({ driverFullName: fullName })
        .where(inArray(dispatchRecords.id, recordIds))

      console.log(`[Denorm Sync] Driver ${driverId}: Updated ${records.length} dispatch records`)
      return { updated: records.length, failed: 0 }
    } catch (err) {
      console.error(`Failed to sync driver changes to dispatch records:`, err)
      return { updated: 0, failed: records.length }
    }
  } catch (error) {
    console.error(`[Denorm Sync] Failed to sync driver changes for ${driverId}:`, error)
    return { updated: 0, failed: 0 }
  }
}

/**
 * Sync route changes to all dispatch records that reference this route
 *
 * Call this when:
 * - Route name changes
 * - Route type changes
 * - Route destination changes
 *
 * @param routeId - The ID of the route that changed
 * @param changes - The fields that changed
 */
export async function syncRouteChanges(routeId: string, changes: {
  routeName?: string | null
  routeType?: string | null
  destinationId?: string | null
  destinationName?: string | null
  destinationCode?: string | null
}): Promise<{ updated: number; failed: number }> {
  try {
    if (!db) throw new Error('Database not initialized')

    // Find all dispatch records for this route
    const records = await db.select({ id: dispatchRecords.id })
      .from(dispatchRecords)
      .where(eq(dispatchRecords.routeId, routeId))

    if (records.length === 0) {
      return { updated: 0, failed: 0 }
    }

    // Build update object
    const updates: Record<string, any> = {}
    if (changes.routeName !== undefined) updates.routeName = changes.routeName
    if (changes.routeType !== undefined) updates.routeType = changes.routeType
    if (changes.destinationId !== undefined) updates.routeDestinationId = changes.destinationId
    if (changes.destinationName !== undefined) updates.routeDestinationName = changes.destinationName
    if (changes.destinationCode !== undefined) updates.routeDestinationCode = changes.destinationCode

    if (Object.keys(updates).length === 0) {
      return { updated: 0, failed: 0 }
    }

    // Batch update all affected records with single query
    try {
      const recordIds = records.map(r => r.id)
      await db.update(dispatchRecords)
        .set(updates)
        .where(inArray(dispatchRecords.id, recordIds))

      console.log(`[Denorm Sync] Route ${routeId}: Updated ${records.length} dispatch records`)
      return { updated: records.length, failed: 0 }
    } catch (err) {
      console.error(`Failed to sync route changes to dispatch records:`, err)
      return { updated: 0, failed: records.length }
    }
  } catch (error) {
    console.error(`[Denorm Sync] Failed to sync route changes for ${routeId}:`, error)
    return { updated: 0, failed: 0 }
  }
}

/**
 * Sync operator changes to all vehicles that reference this operator,
 * then cascade to all dispatch records
 *
 * Call this when:
 * - Operator name changes
 * - Operator code changes
 *
 * @param operatorId - The ID of the operator that changed
 * @param changes - The fields that changed
 */
export async function syncOperatorChanges(operatorId: string, changes: {
  name?: string
  code?: string
}): Promise<{ vehiclesUpdated: number; dispatchUpdated: number; failed: number }> {
  try {
    if (!db) throw new Error('Database not initialized')

    // Find all vehicles with this operator
    const vehicleRecords = await db.select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.operatorId, operatorId))

    if (vehicleRecords.length === 0) {
      return { vehiclesUpdated: 0, dispatchUpdated: 0, failed: 0 }
    }

    let dispatchUpdated = 0
    let failed = 0

    // For each vehicle, sync the operator changes to their dispatch records
    await Promise.all(vehicleRecords.map(async (v) => {
      const result = await syncVehicleChanges(v.id, {
        operatorName: changes.name,
        operatorCode: changes.code,
      })
      dispatchUpdated += result.updated
      failed += result.failed
    }))

    console.log(`[Denorm Sync] Operator ${operatorId}: Affected ${vehicleRecords.length} vehicles, ${dispatchUpdated} dispatch records (${failed} failed)`)
    return { vehiclesUpdated: vehicleRecords.length, dispatchUpdated, failed }
  } catch (error) {
    console.error(`[Denorm Sync] Failed to sync operator changes for ${operatorId}:`, error)
    return { vehiclesUpdated: 0, dispatchUpdated: 0, failed: 0 }
  }
}

/**
 * Sync destination (location) changes to all routes that reference this location,
 * then cascade to all dispatch records
 *
 * @deprecated Routes schema does not have destinationId - this function is a no-op.
 * Routes use text fields (arrivalStation, departureStation) instead of foreign keys.
 *
 * @param locationId - The ID of the location that changed
 * @param changes - The fields that changed
 */
export async function syncDestinationChanges(_locationId: string, _changes: {
  name?: string
  code?: string
}): Promise<{ routesUpdated: number; dispatchUpdated: number; failed: number }> {
  // Routes schema does not have destinationId foreign key
  // This function is deprecated and returns no-op result
  console.warn('[Denorm Sync] syncDestinationChanges is deprecated - routes use text fields instead of FK')
  return { routesUpdated: 0, dispatchUpdated: 0, failed: 0 }
}
