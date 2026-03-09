import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { locations } from '../db/schema/index.js'
import { users } from '../db/schema/users.js'
import { eq, asc, and } from 'drizzle-orm'
import { z } from 'zod'
import type { AuthRequest } from '../middleware/auth.js'

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  stationType: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

export const getAllLocations = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')
    const authReq = req as AuthRequest

    const { isActive } = req.query

    // Get user's benPhuTrach (assigned station)
    let benPhuTrachId: string | null = null
    let shouldFilterByStation = false

    if (authReq.user) {
      const [user] = await db
        .select({ benPhuTrach: users.benPhuTrach, role: users.role })
        .from(users)
        .where(eq(users.id, authReq.user.id))
        .limit(1)

      // Only filter if user is not admin and has benPhuTrach assigned
      if (user && user.role !== 'admin' && user.benPhuTrach) {
        benPhuTrachId = user.benPhuTrach
        shouldFilterByStation = true
        console.log(`[Locations] Filtering by benPhuTrach: ${benPhuTrachId}`)
      }
    }

    // Build query conditions
    const conditions = []
    
    // Filter by benPhuTrach if user has it assigned
    if (shouldFilterByStation && benPhuTrachId) {
      conditions.push(eq(locations.id, benPhuTrachId))
    }
    
    // Filter by isActive if provided
    if (isActive !== undefined) {
      conditions.push(eq(locations.isActive, isActive === 'true'))
    }

    // Build where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Execute query
    let data
    if (whereClause) {
      data = await db
        .select()
        .from(locations)
        .where(whereClause)
        .orderBy(asc(locations.name))
    } else {
      data = await db
        .select()
        .from(locations)
        .orderBy(asc(locations.name))
    }
    
    console.log(`[Locations] Found ${data.length} locations`)

    const result = data.map((loc) => ({
      id: loc.id,
      name: loc.name,
      code: loc.code,
      stationType: loc.stationType,
      phone: loc.phone,
      email: loc.email,
      address: loc.address,
      latitude: loc.latitude ? parseFloat(loc.latitude) : null,
      longitude: loc.longitude ? parseFloat(loc.longitude) : null,
      isActive: loc.isActive,
      createdAt: loc.createdAt,
    }))

    return res.json(result)
  } catch (error) {
    console.error('Error fetching locations:', error)
    return res.status(500).json({ error: 'Failed to fetch locations' })
  }
}

export const getLocationById = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    const data = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id))

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Location not found' })
    }

    const location = data[0]

    return res.json({
      id: location.id,
      name: location.name,
      code: location.code,
      stationType: location.stationType,
      phone: location.phone,
      email: location.email,
      address: location.address,
      latitude: location.latitude ? parseFloat(location.latitude) : null,
      longitude: location.longitude ? parseFloat(location.longitude) : null,
      isActive: location.isActive,
      createdAt: location.createdAt,
    })
  } catch (error) {
    console.error('Error fetching location:', error)
    return res.status(500).json({ error: 'Failed to fetch location' })
  }
}

export const createLocation = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const validated = locationSchema.parse(req.body)

    const data = await db
      .insert(locations)
      .values({
        name: validated.name,
        code: validated.code,
        stationType: validated.stationType || null,
        phone: validated.phone || null,
        email: validated.email || null,
        address: validated.address || null,
        latitude: validated.latitude?.toString() || null,
        longitude: validated.longitude?.toString() || null,
        isActive: true,
      })
      .returning()

    const newLocation = data[0]

    return res.status(201).json({
      id: newLocation.id,
      name: newLocation.name,
      code: newLocation.code,
      stationType: newLocation.stationType,
      phone: newLocation.phone,
      email: newLocation.email,
      address: newLocation.address,
      latitude: newLocation.latitude ? parseFloat(newLocation.latitude) : null,
      longitude: newLocation.longitude ? parseFloat(newLocation.longitude) : null,
      isActive: newLocation.isActive,
      createdAt: newLocation.createdAt,
    })
  } catch (error: any) {
    console.error('Error creating location:', error)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Location with this code already exists' })
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to create location' })
  }
}

export const updateLocation = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params
    const validated = locationSchema.partial().parse(req.body)

    const updateData: any = {}
    if (validated.name) updateData.name = validated.name
    if (validated.code) updateData.code = validated.code
    if (validated.stationType !== undefined) updateData.stationType = validated.stationType || null
    if (validated.phone !== undefined) updateData.phone = validated.phone || null
    if (validated.email !== undefined) updateData.email = validated.email || null
    if (validated.address !== undefined) updateData.address = validated.address || null
    if (validated.latitude !== undefined) updateData.latitude = validated.latitude?.toString() || null
    if (validated.longitude !== undefined) updateData.longitude = validated.longitude?.toString() || null

    const data = await db
      .update(locations)
      .set(updateData)
      .where(eq(locations.id, id))
      .returning()

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Location not found' })
    }

    const updatedLocation = data[0]

    return res.json({
      id: updatedLocation.id,
      name: updatedLocation.name,
      code: updatedLocation.code,
      stationType: updatedLocation.stationType,
      phone: updatedLocation.phone,
      email: updatedLocation.email,
      address: updatedLocation.address,
      latitude: updatedLocation.latitude ? parseFloat(updatedLocation.latitude) : null,
      longitude: updatedLocation.longitude ? parseFloat(updatedLocation.longitude) : null,
      isActive: updatedLocation.isActive,
      createdAt: updatedLocation.createdAt,
    })
  } catch (error: any) {
    console.error('Error updating location:', error)
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to update location' })
  }
}

export const deleteLocation = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    await db
      .delete(locations)
      .where(eq(locations.id, id))

    return res.status(204).send()
  } catch (error) {
    console.error('Error deleting location:', error)
    return res.status(500).json({ error: 'Failed to delete location' })
  }
}

