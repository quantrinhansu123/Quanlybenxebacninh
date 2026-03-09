import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { vehicleTypes } from '../db/schema/index.js'
import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'

const vehicleTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  defaultSeatCapacity: z.number().int().min(0).optional(),
  defaultBedCapacity: z.number().int().min(0).optional(),
})

export const getAllVehicleTypes = async (_req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const data = await db
      .select()
      .from(vehicleTypes)
      .orderBy(asc(vehicleTypes.name))

    const mapped = data.map((vt) => ({
      id: vt.id,
      name: vt.name,
      description: vt.description,
      defaultSeatCapacity: vt.seatCount ?? null,
      defaultBedCapacity: null, // Schema doesn't have bedCapacity field
      createdAt: vt.createdAt,
    }))

    return res.json(mapped)
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch vehicle types' })
  }
}

export const getVehicleTypeById = async (req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const { id } = req.params

    const data = await db
      .select()
      .from(vehicleTypes)
      .where(eq(vehicleTypes.id, id))
      .limit(1)

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Vehicle type not found' })
    }

    const vt = data[0]
    return res.json({
      id: vt.id,
      name: vt.name,
      description: vt.description,
      defaultSeatCapacity: vt.seatCount ?? null,
      defaultBedCapacity: null,
      createdAt: vt.createdAt,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch vehicle type' })
  }
}

export const createVehicleType = async (req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const validated = vehicleTypeSchema.parse(req.body)

    const inserted = await db
      .insert(vehicleTypes)
      .values({
        name: validated.name,
        description: validated.description || null,
        seatCount: validated.defaultSeatCapacity ?? null,
      })
      .returning()

    const data = inserted[0]
    return res.status(201).json({
      id: data.id,
      name: data.name,
      description: data.description,
      defaultSeatCapacity: data.seatCount ?? null,
      defaultBedCapacity: null,
      createdAt: data.createdAt,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to create vehicle type' })
  }
}

export const updateVehicleType = async (req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const { id } = req.params
    const validated = vehicleTypeSchema.partial().parse(req.body)

    const updateData: any = {}
    if (validated.name) updateData.name = validated.name
    if (validated.description !== undefined) updateData.description = validated.description || null
    if (validated.defaultSeatCapacity !== undefined) updateData.seatCount = validated.defaultSeatCapacity

    const updated = await db
      .update(vehicleTypes)
      .set(updateData)
      .where(eq(vehicleTypes.id, id))
      .returning()

    if (!updated || updated.length === 0) {
      return res.status(404).json({ error: 'Vehicle type not found' })
    }

    const data = updated[0]
    return res.json({
      id: data.id,
      name: data.name,
      description: data.description,
      defaultSeatCapacity: data.seatCount ?? null,
      defaultBedCapacity: null,
      createdAt: data.createdAt,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to update vehicle type' })
  }
}

export const deleteVehicleType = async (req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const { id } = req.params

    await db
      .delete(vehicleTypes)
      .where(eq(vehicleTypes.id, id))

    return res.status(204).send()
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete vehicle type' })
  }
}

