import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { violations, violationTypes } from '../db/schema/index.js'
import { eq, desc, and } from 'drizzle-orm'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth.js'

const violationSchema = z.object({
  dispatchRecordId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  violationTypeId: z.string().uuid('Invalid violation type ID'),
  violationDate: z.string().datetime('Invalid violation date'),
  description: z.string().optional(),
})

export const getAllViolations = async (req: Request, res: Response) => {
  if (!db) {
    return res.status(500).json({ error: 'Database connection not available' })
  }

  try {
    const { vehicleId, driverId, dispatchRecordId, resolutionStatus } = req.query

    const conditions = []
    if (vehicleId) {
      conditions.push(eq(violations.vehicleId, vehicleId as string))
    }
    if (driverId) {
      conditions.push(eq(violations.driverId, driverId as string))
    }
    if (dispatchRecordId) {
      conditions.push(eq(violations.dispatchRecordId, dispatchRecordId as string))
    }
    if (resolutionStatus) {
      conditions.push(eq(violations.resolutionStatus, resolutionStatus as string))
    }

    const data = await db
      .select({
        id: violations.id,
        dispatchRecordId: violations.dispatchRecordId,
        vehicleId: violations.vehicleId,
        driverId: violations.driverId,
        violationTypeId: violations.violationTypeId,
        violationDate: violations.violationDate,
        description: violations.description,
        resolutionStatus: violations.resolutionStatus,
        resolutionNotes: violations.resolutionNotes,
        recordedBy: violations.recordedBy,
        createdAt: violations.createdAt,
        updatedAt: violations.updatedAt,
        violationType: {
          id: violationTypes.id,
          code: violationTypes.code,
          name: violationTypes.name,
          severity: violationTypes.severity,
        },
      })
      .from(violations)
      .leftJoin(violationTypes, eq(violations.violationTypeId, violationTypes.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(violations.violationDate))

    const formatted = data.map((item) => ({
      id: item.id,
      dispatchRecordId: item.dispatchRecordId,
      vehicleId: item.vehicleId,
      driverId: item.driverId,
      violationTypeId: item.violationTypeId,
      violationType: item.violationType?.id ? {
        id: item.violationType.id,
        code: item.violationType.code,
        name: item.violationType.name,
        severity: item.violationType.severity,
      } : undefined,
      violationDate: item.violationDate,
      description: item.description,
      resolutionStatus: item.resolutionStatus,
      resolutionNotes: item.resolutionNotes,
      recordedBy: item.recordedBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))

    return res.json(formatted)
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch violations' })
  }
}

export const getViolationById = async (req: Request, res: Response) => {
  if (!db) {
    return res.status(500).json({ error: 'Database connection not available' })
  }

  try {
    const { id } = req.params

    const data = await db
      .select({
        id: violations.id,
        dispatchRecordId: violations.dispatchRecordId,
        vehicleId: violations.vehicleId,
        driverId: violations.driverId,
        violationTypeId: violations.violationTypeId,
        violationDate: violations.violationDate,
        description: violations.description,
        resolutionStatus: violations.resolutionStatus,
        resolutionNotes: violations.resolutionNotes,
        recordedBy: violations.recordedBy,
        createdAt: violations.createdAt,
        updatedAt: violations.updatedAt,
        violationType: {
          id: violationTypes.id,
          code: violationTypes.code,
          name: violationTypes.name,
          severity: violationTypes.severity,
        },
      })
      .from(violations)
      .leftJoin(violationTypes, eq(violations.violationTypeId, violationTypes.id))
      .where(eq(violations.id, id))
      .limit(1)

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Violation not found' })
    }

    const item = data[0]

    return res.json({
      id: item.id,
      dispatchRecordId: item.dispatchRecordId,
      vehicleId: item.vehicleId,
      driverId: item.driverId,
      violationTypeId: item.violationTypeId,
      violationType: item.violationType?.id ? {
        id: item.violationType.id,
        code: item.violationType.code,
        name: item.violationType.name,
        severity: item.violationType.severity,
      } : undefined,
      violationDate: item.violationDate,
      description: item.description,
      resolutionStatus: item.resolutionStatus,
      resolutionNotes: item.resolutionNotes,
      recordedBy: item.recordedBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch violation' })
  }
}

export const createViolation = async (req: AuthRequest, res: Response) => {
  if (!db) {
    return res.status(500).json({ error: 'Database connection not available' })
  }

  try {
    const validated = violationSchema.parse(req.body)
    const userId = req.user?.id

    const [inserted] = await db
      .insert(violations)
      .values({
        dispatchRecordId: validated.dispatchRecordId || null,
        vehicleId: validated.vehicleId || null,
        driverId: validated.driverId || null,
        violationTypeId: validated.violationTypeId,
        violationDate: new Date(validated.violationDate),
        description: validated.description || null,
        resolutionStatus: 'pending',
        recordedBy: userId || null,
      })
      .returning()

    const data = await db
      .select({
        id: violations.id,
        dispatchRecordId: violations.dispatchRecordId,
        vehicleId: violations.vehicleId,
        driverId: violations.driverId,
        violationTypeId: violations.violationTypeId,
        violationDate: violations.violationDate,
        description: violations.description,
        resolutionStatus: violations.resolutionStatus,
        resolutionNotes: violations.resolutionNotes,
        recordedBy: violations.recordedBy,
        createdAt: violations.createdAt,
        updatedAt: violations.updatedAt,
        violationType: {
          id: violationTypes.id,
          code: violationTypes.code,
          name: violationTypes.name,
          severity: violationTypes.severity,
        },
      })
      .from(violations)
      .leftJoin(violationTypes, eq(violations.violationTypeId, violationTypes.id))
      .where(eq(violations.id, inserted.id))
      .limit(1)

    const item = data[0]

    return res.status(201).json({
      id: item.id,
      dispatchRecordId: item.dispatchRecordId,
      vehicleId: item.vehicleId,
      driverId: item.driverId,
      violationTypeId: item.violationTypeId,
      violationType: item.violationType?.id ? {
        id: item.violationType.id,
        code: item.violationType.code,
        name: item.violationType.name,
        severity: item.violationType.severity,
      } : undefined,
      violationDate: item.violationDate,
      description: item.description,
      resolutionStatus: item.resolutionStatus,
      resolutionNotes: item.resolutionNotes,
      recordedBy: item.recordedBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to create violation' })
  }
}

export const updateViolation = async (req: Request, res: Response) => {
  if (!db) {
    return res.status(500).json({ error: 'Database connection not available' })
  }

  try {
    const { id } = req.params
    const { resolutionStatus, resolutionNotes } = req.body

    if (!resolutionStatus || !['pending', 'resolved', 'dismissed'].includes(resolutionStatus)) {
      return res.status(400).json({ error: 'Invalid resolution status' })
    }

    const [updated] = await db
      .update(violations)
      .set({
        resolutionStatus,
        resolutionNotes: resolutionNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(violations.id, id))
      .returning()

    if (!updated) {
      return res.status(404).json({ error: 'Violation not found' })
    }

    const data = await db
      .select({
        id: violations.id,
        dispatchRecordId: violations.dispatchRecordId,
        vehicleId: violations.vehicleId,
        driverId: violations.driverId,
        violationTypeId: violations.violationTypeId,
        violationDate: violations.violationDate,
        description: violations.description,
        resolutionStatus: violations.resolutionStatus,
        resolutionNotes: violations.resolutionNotes,
        recordedBy: violations.recordedBy,
        createdAt: violations.createdAt,
        updatedAt: violations.updatedAt,
        violationType: {
          id: violationTypes.id,
          code: violationTypes.code,
          name: violationTypes.name,
          severity: violationTypes.severity,
        },
      })
      .from(violations)
      .leftJoin(violationTypes, eq(violations.violationTypeId, violationTypes.id))
      .where(eq(violations.id, id))
      .limit(1)

    const item = data[0]

    return res.json({
      id: item.id,
      dispatchRecordId: item.dispatchRecordId,
      vehicleId: item.vehicleId,
      driverId: item.driverId,
      violationTypeId: item.violationTypeId,
      violationType: item.violationType?.id ? {
        id: item.violationType.id,
        code: item.violationType.code,
        name: item.violationType.name,
        severity: item.violationType.severity,
      } : undefined,
      violationDate: item.violationDate,
      description: item.description,
      resolutionStatus: item.resolutionStatus,
      resolutionNotes: item.resolutionNotes,
      recordedBy: item.recordedBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update violation' })
  }
}

export const getAllViolationTypes = async (_req: Request, res: Response) => {
  if (!db) {
    return res.status(500).json({ error: 'Database connection not available' })
  }

  try {
    const data = await db
      .select()
      .from(violationTypes)
      .orderBy(violationTypes.name)

    const formatted = data.map((vt) => ({
      id: vt.id,
      code: vt.code,
      name: vt.name,
      description: vt.description,
      severity: vt.severity,
      createdAt: vt.createdAt,
    }))

    return res.json(formatted)
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch violation types' })
  }
}
