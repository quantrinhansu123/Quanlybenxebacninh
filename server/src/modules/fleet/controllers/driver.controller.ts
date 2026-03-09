/**
 * Driver Controller
 * Handles HTTP requests for driver operations
 */

import { Request, Response } from 'express'
import { db } from '../../../db/drizzle.js'
import { drivers, driverOperators, operators } from '../../../db/schema/index.js'
import { eq, desc, inArray } from 'drizzle-orm'
import { syncDriverChanges } from '../../../utils/denormalization-sync.js'
import { validateCreateDriver, validateUpdateDriver } from '../fleet-validation.js'

interface OperatorInfo {
  id: string
  name: string
  code: string
}

/**
 * Fetch junction table data for operators - optimized to only fetch needed operators
 */
async function fetchDriverOperators(driverId: string) {
  if (!db) throw new Error('Database not initialized')

  // Get junction records
  const junctionData = await db.select()
    .from(driverOperators)
    .where(eq(driverOperators.driverId, driverId))

  if (!junctionData || junctionData.length === 0) return []

  // Extract operator IDs and batch fetch only needed operators
  const operatorIds = junctionData.map(j => j.operatorId)
  const operatorsData = await db.select({
    id: operators.id,
    name: operators.name,
    code: operators.code,
  }).from(operators).where(inArray(operators.id, operatorIds))

  const operatorsMap = new Map<string, OperatorInfo>(operatorsData.map((op) => [op.id, op]))

  // Manual join
  return junctionData.map((junction) => {
    const op = operatorsMap.get(junction.operatorId)
    return {
      operator_id: junction.operatorId,
      is_primary: junction.isPrimary,
      operators: op ? { id: op.id, name: op.name, code: op.code } : null,
    }
  }).filter((j) => j.operators !== null)
}

/**
 * Update driver-operator junction records
 */
async function updateDriverOperators(driverId: string, operatorIds: string[]): Promise<void> {
  if (!db) throw new Error('Database not initialized')

  // Delete existing junction records
  await db.delete(driverOperators).where(eq(driverOperators.driverId, driverId))

  // Create new junction records
  const junctionRecords = operatorIds.map((opId, index) => ({
    driverId: driverId,
    operatorId: opId,
    isPrimary: index === 0,
  }))

  await db.insert(driverOperators).values(junctionRecords)
}

// ========== Controller Handlers ==========

export const getAllDrivers = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { operatorId, isActive } = req.query

    // Load all drivers (without join - manual join pattern)
    let driversData = await db.select()
      .from(drivers)
      .orderBy(desc(drivers.createdAt))

    // Filter by isActive if provided
    if (isActive !== undefined) {
      driversData = driversData.filter((driver) => driver.isActive === (isActive === 'true'))
    }

    // Load all operators for manual join
    const operatorsData = await db.select({
      id: operators.id,
      name: operators.name,
      code: operators.code,
    }).from(operators)

    const operatorsMap = new Map(operatorsData.map((op) => [op.id, op]))

    // Load all junction records for manual join
    const junctionData = await db.select().from(driverOperators)

    // Create driver_id -> operators map
    const driverOperatorsMap = new Map<string, any[]>()
    junctionData.forEach((junction) => {
      const list = driverOperatorsMap.get(junction.driverId) || []
      list.push(junction)
      driverOperatorsMap.set(junction.driverId, list)
    })

    // Map drivers with operator info
    let driversResult = driversData.map((driver) => {
      // Get primary operator
      const primaryOperatorData = driver.operatorId ? operatorsMap.get(driver.operatorId) as any : null
      const primaryOperator = primaryOperatorData ? {
        id: primaryOperatorData.id,
        name: primaryOperatorData.name,
        code: primaryOperatorData.code,
      } : undefined

      // Get all operators from junction table
      const junctionRecords = driverOperatorsMap.get(driver.id) || []
      const allOperators = junctionRecords.map((junction) => {
        const opData = operatorsMap.get(junction.operatorId) as any
        return opData ? {
          id: opData.id,
          name: opData.name,
          code: opData.code,
          isPrimary: junction.isPrimary,
        } : null
      }).filter((op) => op !== null)

      // Use junction operators if available, otherwise fallback to primary
      const operatorsList = allOperators.length > 0 ? allOperators : (primaryOperator ? [{ ...primaryOperator, isPrimary: true }] : [])

      return {
        id: driver.id,
        operatorId: driver.operatorId,
        operator: primaryOperator,
        operatorIds: operatorsList.map((op: any) => op.id),
        operators: operatorsList,
        fullName: driver.fullName,
        idNumber: driver.idNumber,
        phone: driver.phone,
        province: driver.province,
        district: driver.district,
        address: driver.address,
        licenseNumber: driver.licenseNumber,
        licenseClass: driver.licenseClass,
        licenseExpiryDate: driver.licenseExpiryDate,
        imageUrl: driver.imageUrl,
        isActive: driver.isActive,
        createdAt: driver.createdAt,
        updatedAt: driver.updatedAt,
      }
    })

    // Filter by operatorId if provided
    if (operatorId) {
      const opId = operatorId as string
      driversResult = driversResult.filter((driver) => {
        if (driver.operatorId === opId) return true
        if (driver.operatorIds.includes(opId)) return true
        return false
      })
    }

    return res.json(driversResult)
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Error fetching drivers:', error)
    return res.status(500).json({ error: err.message || 'Failed to fetch drivers' })
  }
}

export const getDriverById = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    // Get driver without join
    const [driverData] = await db.select()
      .from(drivers)
      .where(eq(drivers.id, id))

    if (!driverData) return res.status(404).json({ error: 'Driver not found' })

    // Manual join: fetch primary operator
    let primaryOperator: { id: string; name: string; code: string } | undefined
    if (driverData.operatorId) {
      const [opData] = await db.select({
        id: operators.id,
        name: operators.name,
        code: operators.code,
      })
        .from(operators)
        .where(eq(operators.id, driverData.operatorId))

      if (opData) {
        primaryOperator = { id: opData.id, name: opData.name, code: opData.code }
      }
    }

    // Get junction operators
    const junctionData = await fetchDriverOperators(id)
    const allOperators = junctionData.map((j: any) => ({
      id: j.operators.id,
      name: j.operators.name,
      code: j.operators.code,
      isPrimary: j.is_primary,
    }))

    const operatorsList = allOperators.length > 0 ? allOperators : (primaryOperator ? [{ ...primaryOperator, isPrimary: true }] : [])

    return res.json({
      id: driverData.id,
      operatorId: driverData.operatorId,
      operator: primaryOperator,
      operatorIds: operatorsList.map((op: any) => op.id),
      operators: operatorsList,
      fullName: driverData.fullName,
      idNumber: driverData.idNumber,
      phone: driverData.phone,
      province: driverData.province,
      district: driverData.district,
      address: driverData.address,
      licenseNumber: driverData.licenseNumber,
      licenseClass: driverData.licenseClass,
      licenseExpiryDate: driverData.licenseExpiryDate,
      imageUrl: driverData.imageUrl,
      isActive: driverData.isActive,
      createdAt: driverData.createdAt,
      updatedAt: driverData.updatedAt,
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Error fetching driver:', error)
    return res.status(500).json({ error: err.message || 'Failed to fetch driver' })
  }
}

export const createDriver = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const validated = validateCreateDriver(req.body)
    const primaryOperatorId = validated.operatorIds[0]

    // Create driver without join
    const [driverData] = await db.insert(drivers).values({
      operatorId: primaryOperatorId,
      fullName: validated.fullName,
      idNumber: validated.idNumber,
      phone: validated.phone || null,
      province: validated.province || null,
      district: validated.district || null,
      address: validated.address || null,
      licenseNumber: validated.licenseNumber,
      licenseClass: validated.licenseClass,
      licenseExpiryDate: validated.licenseExpiryDate,
      imageUrl: validated.imageUrl || null,
      isActive: true,
    }).returning()

    // Create junction records
    await updateDriverOperators(driverData.id, validated.operatorIds)

    // Manual join: fetch primary operator
    let primaryOperator: { id: string; name: string; code: string } | undefined
    if (driverData.operatorId) {
      const [opData] = await db.select({
        id: operators.id,
        name: operators.name,
        code: operators.code,
      })
        .from(operators)
        .where(eq(operators.id, driverData.operatorId))

      if (opData) {
        primaryOperator = { id: opData.id, name: opData.name, code: opData.code }
      }
    }

    // Get junction operators
    const junctionData = await fetchDriverOperators(driverData.id)
    const allOperators = junctionData.map((j: any) => ({
      id: j.operators.id,
      name: j.operators.name,
      code: j.operators.code,
      isPrimary: j.is_primary,
    }))

    const operatorsList = allOperators.length > 0 ? allOperators : (primaryOperator ? [{ ...primaryOperator, isPrimary: true }] : [])

    return res.status(201).json({
      id: driverData.id,
      operatorId: driverData.operatorId,
      operator: primaryOperator,
      operatorIds: operatorsList.map((op: any) => op.id),
      operators: operatorsList,
      fullName: driverData.fullName,
      idNumber: driverData.idNumber,
      phone: driverData.phone,
      province: driverData.province,
      district: driverData.district,
      address: driverData.address,
      licenseNumber: driverData.licenseNumber,
      licenseClass: driverData.licenseClass,
      licenseExpiryDate: driverData.licenseExpiryDate,
      imageUrl: driverData.imageUrl,
      isActive: driverData.isActive,
      createdAt: driverData.createdAt,
      updatedAt: driverData.updatedAt,
    })
  } catch (error: unknown) {
    const err = error as { code?: string; name?: string; errors?: Array<{ message: string }>; message?: string }
    console.error('Error creating driver:', error)
    if (err.code === '23505') return res.status(400).json({ error: 'Driver with this ID number or license already exists' })
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors?.[0]?.message })
    return res.status(500).json({ error: err.message || 'Failed to create driver' })
  }
}

export const updateDriver = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params
    const validated = validateUpdateDriver(req.body)

    const updateData: Record<string, unknown> = {}
    if (validated.fullName) updateData.fullName = validated.fullName
    if (validated.idNumber) updateData.idNumber = validated.idNumber
    if (validated.phone !== undefined) updateData.phone = validated.phone || null
    if (validated.province !== undefined) updateData.province = validated.province || null
    if (validated.district !== undefined) updateData.district = validated.district || null
    if (validated.address !== undefined) updateData.address = validated.address || null
    if (validated.licenseNumber) updateData.licenseNumber = validated.licenseNumber
    if (validated.licenseClass) updateData.licenseClass = validated.licenseClass
    if (validated.licenseExpiryDate) updateData.licenseExpiryDate = validated.licenseExpiryDate
    if (validated.imageUrl !== undefined) updateData.imageUrl = validated.imageUrl || null

    // Update operators if provided
    if (validated.operatorIds && validated.operatorIds.length > 0) {
      updateData.operatorId = validated.operatorIds[0]
      await updateDriverOperators(id, validated.operatorIds)
    }

    // Update driver without join
    const [data] = await db.update(drivers)
      .set(updateData)
      .where(eq(drivers.id, id))
      .returning()

    if (!data) return res.status(404).json({ error: 'Driver not found' })

    // Sync denormalized data if fullName changed
    if (updateData.fullName) {
      syncDriverChanges(id, data.fullName).catch((err) => {
        console.error('[Driver Update] Failed to sync denormalized data:', err)
      })
    }

    // Manual join: fetch primary operator
    let primaryOperator: { id: string; name: string; code: string } | undefined
    if (data.operatorId) {
      const [opData] = await db.select({
        id: operators.id,
        name: operators.name,
        code: operators.code,
      })
        .from(operators)
        .where(eq(operators.id, data.operatorId))

      if (opData) {
        primaryOperator = { id: opData.id, name: opData.name, code: opData.code }
      }
    }

    // Get junction operators
    const junctionData = await fetchDriverOperators(id)
    const allOperators = junctionData.map((j: any) => ({
      id: j.operators.id,
      name: j.operators.name,
      code: j.operators.code,
      isPrimary: j.is_primary,
    }))

    const operatorsList = allOperators.length > 0 ? allOperators : (primaryOperator ? [{ ...primaryOperator, isPrimary: true }] : [])

    return res.json({
      id: data.id,
      operatorId: data.operatorId,
      operator: primaryOperator,
      operatorIds: operatorsList.map((op: any) => op.id),
      operators: operatorsList,
      fullName: data.fullName,
      idNumber: data.idNumber,
      phone: data.phone,
      province: data.province,
      district: data.district,
      address: data.address,
      licenseNumber: data.licenseNumber,
      licenseClass: data.licenseClass,
      licenseExpiryDate: data.licenseExpiryDate,
      imageUrl: data.imageUrl,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: Array<{ message: string }>; message?: string }
    console.error('Error updating driver:', error)
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors?.[0]?.message })
    return res.status(500).json({ error: err.message || 'Failed to update driver' })
  }
}

export const deleteDriver = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    await db.delete(drivers).where(eq(drivers.id, id))

    return res.status(204).send()
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Error deleting driver:', error)
    return res.status(500).json({ error: err.message || 'Failed to delete driver' })
  }
}
