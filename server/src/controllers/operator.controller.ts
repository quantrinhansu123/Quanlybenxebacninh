import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { operators } from '../db/schema/operators.js'
import { vehicleBadges } from '../db/schema/vehicle-badges.js'
import { eq, desc, like } from 'drizzle-orm'
import { z } from 'zod'

// Cache for legacy operators
let legacyOperatorsCache: { data: any[]; timestamp: number } | null = null
const LEGACY_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

const operatorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  taxCode: z.string().optional(),

  isTicketDelegated: z.boolean().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  address: z.string().optional(),

  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  representativeName: z.string().optional(),
  representativePosition: z.string().optional(),
})

/**
 * Get the next available operator code (DV001, DV002...)
 */
export const getNextOperatorCode = async (_req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    // Get all operators with codes starting with 'DV'
    const existingCodes = await db
      .select({ code: operators.code })
      .from(operators)
      .where(like(operators.code, 'DV%'))

    // Extract numeric parts and find the max
    let maxNum = 0
    for (const op of existingCodes) {
      const match = op.code.match(/^DV(\d+)$/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }

    // Generate next code with padding (DV001, DV002...)
    const nextNum = maxNum + 1
    const nextCode = `DV${String(nextNum).padStart(3, '0')}`

    return res.json({ code: nextCode })
  } catch (error) {
    console.error('Error generating next operator code:', error)
    return res.status(500).json({ error: 'Failed to generate next code' })
  }
}

/**
 * Check if a tax code already exists (for duplicate warning)
 */
export const checkTaxCodeExists = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { taxCode, excludeId } = req.query

    if (!taxCode || typeof taxCode !== 'string') {
      return res.json({ exists: false })
    }

    // Check if tax code exists (optionally excluding a specific operator by ID)
    let query = db
      .select({ id: operators.id, name: operators.name })
      .from(operators)
      .where(eq(operators.taxCode, taxCode))

    const results = await query

    // Filter out the excluded ID if provided
    const filtered = excludeId
      ? results.filter(op => op.id !== excludeId)
      : results

    if (filtered.length > 0) {
      return res.json({
        exists: true,
        operatorName: filtered[0].name,
      })
    }

    return res.json({ exists: false })
  } catch (error) {
    console.error('Error checking tax code:', error)
    return res.status(500).json({ error: 'Failed to check tax code' })
  }
}

export const getAllOperators = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { isActive } = req.query

    let query = db.select().from(operators).orderBy(desc(operators.createdAt))

    // Apply isActive filter if provided
    const data = await query

    const filteredData = isActive !== undefined
      ? data.filter(op => op.isActive === (isActive === 'true'))
      : data

    const operatorsData = filteredData.map((op: any) => ({
      id: op.id,
      name: op.name,
      code: op.code,
      taxCode: op.taxCode,

      isTicketDelegated: op.isTicketDelegated,
      province: op.province,
      district: op.district,
      address: op.address,

      phone: op.phone,
      email: op.email,
      representativeName: op.representative,
      representativePosition: op.representativePosition,

      isActive: op.isActive,
      createdAt: op.createdAt,
      updatedAt: op.updatedAt,
    }))

    return res.json(operatorsData)
  } catch (error) {
    console.error('Error fetching operators:', error)
    return res.status(500).json({ error: 'Failed to fetch operators' })
  }
}

/**
 * Get all operators from Supabase (unified data source)
 * Filtered to only include operators that have badges of type "Buýt" or "Tuyến cố định"
 */
export const getLegacyOperators = async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === 'true'

    // Check cache
    if (!forceRefresh && legacyOperatorsCache && Date.now() - legacyOperatorsCache.timestamp < LEGACY_CACHE_TTL) {
      return res.json(legacyOperatorsCache.data)
    }

    // Allowed badge types
    const allowedBadgeTypes = ['Buýt', 'Tuyến cố định']

    if (!db) throw new Error('Database not initialized')

    // Load badges and operators data in parallel using Drizzle ORM
    const [badgeData, operatorData] = await Promise.all([
      db.select({ operatorId: vehicleBadges.operatorId, badgeType: vehicleBadges.badgeType }).from(vehicleBadges),
      db.select().from(operators)
    ])

    // Find unique operator IDs from badges with allowed types
    const operatorIdsWithBadges = new Set<string>()
    for (const badge of badgeData) {
      const badgeType = badge.badgeType || ''
      if (!allowedBadgeTypes.includes(badgeType)) continue

      if (badge.operatorId) {
        operatorIdsWithBadges.add(badge.operatorId)
      }
    }

    console.log(`[getLegacyOperators] Found ${operatorIdsWithBadges.size} unique operators with Buýt/Tuyến cố định badges`)

    // Filter operators by badge references
    const filteredOperators: any[] = []
    for (const op of operatorData) {
      // Only include operators that have badges with allowed types
      if (!operatorIdsWithBadges.has(op.id) && operatorIdsWithBadges.size > 0) {
        continue
      }

      filteredOperators.push({
        id: op.id,
        name: op.name || '',
        code: op.code || '',
        province: op.province || '',
        district: op.district || '',
        ward: '',
        address: op.address || '',
        fullAddress: op.address || '',
        phone: op.phone || '',
        email: op.email || '',
        taxCode: op.taxCode || '',
        businessLicense: op.businessLicense || '',
        representativeName: op.representative || '',
        businessType: '',
        registrationProvince: '',
        isActive: op.isActive !== false,
        source: op.source || 'supabase',
      })
    }

    console.log(`[getLegacyOperators] Filtered to ${filteredOperators.length} operators (out of ${operatorData.length} total)`)

    // Sort by name
    filteredOperators.sort((a, b) => a.name.localeCompare(b.name, 'vi'))

    // Update cache
    legacyOperatorsCache = { data: filteredOperators, timestamp: Date.now() }

    return res.json(filteredOperators)
  } catch (error) {
    console.error('Error fetching operators:', error)
    // Return stale cache if available
    if (legacyOperatorsCache) {
      return res.json(legacyOperatorsCache.data)
    }
    return res.status(500).json({ error: 'Failed to fetch operators' })
  }
}

export const getOperatorById = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    const [data] = await db.select().from(operators).where(eq(operators.id, id))

    if (!data) {
      return res.status(404).json({ error: 'Operator not found' })
    }

    return res.json({
      id: data.id,
      name: data.name,
      code: data.code,
      taxCode: data.taxCode,

      isTicketDelegated: data.isTicketDelegated,
      province: data.province,
      district: data.district,
      address: data.address,

      phone: data.phone,
      email: data.email,
      representativeName: data.representative,
      representativePosition: data.representativePosition,

      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching operator:', error)
    return res.status(500).json({ error: 'Failed to fetch operator' })
  }
}

export const createOperator = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const validated = operatorSchema.parse(req.body)

    const [data] = await db.insert(operators).values({
      name: validated.name,
      code: validated.code,
      taxCode: validated.taxCode || null,

      isTicketDelegated: validated.isTicketDelegated || false,
      province: validated.province && validated.province.trim() !== '' ? validated.province.trim() : null,
      district: validated.district && validated.district.trim() !== '' ? validated.district.trim() : null,
      address: validated.address || null,

      phone: validated.phone || null,
      email: validated.email || null,
      representative: validated.representativeName || null,
      representativePosition: validated.representativePosition || null,

      isActive: true,
    }).returning()

    return res.status(201).json({
      id: data.id,
      name: data.name,
      code: data.code,
      taxCode: data.taxCode,

      isTicketDelegated: data.isTicketDelegated,
      province: data.province,
      district: data.district,
      address: data.address,

      phone: data.phone,
      email: data.email,
      representativeName: data.representative,
      representativePosition: data.representativePosition,

      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  } catch (error: any) {
    console.error('Error creating operator:', error)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Operator with this code already exists' })
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to create operator' })
  }
}

export const updateOperator = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params
    const validated = operatorSchema.partial().parse(req.body)

    const updateData: any = {}
    if (validated.name) updateData.name = validated.name
    if (validated.code) updateData.code = validated.code
    if (validated.taxCode !== undefined) updateData.taxCode = validated.taxCode || null

    if (validated.isTicketDelegated !== undefined) updateData.isTicketDelegated = validated.isTicketDelegated
    if (validated.province !== undefined) updateData.province = validated.province && validated.province.trim() !== '' ? validated.province.trim() : null
    if (validated.district !== undefined) updateData.district = validated.district && validated.district.trim() !== '' ? validated.district.trim() : null
    if (validated.address !== undefined) updateData.address = validated.address || null

    if (validated.phone !== undefined) updateData.phone = validated.phone || null
    if (validated.email !== undefined) updateData.email = validated.email || null
    if (validated.representativeName !== undefined) updateData.representative = validated.representativeName || null
    if (validated.representativePosition !== undefined) updateData.representativePosition = validated.representativePosition || null

    const [data] = await db.update(operators).set(updateData).where(eq(operators.id, id)).returning()

    if (!data) {
      return res.status(404).json({ error: 'Operator not found' })
    }

    return res.json({
      id: data.id,
      name: data.name,
      code: data.code,
      taxCode: data.taxCode,

      isTicketDelegated: data.isTicketDelegated,
      province: data.province,
      district: data.district,
      address: data.address,

      phone: data.phone,
      email: data.email,
      representativeName: data.representative,
      representativePosition: data.representativePosition,

      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  } catch (error: any) {
    console.error('Error updating operator:', error)
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to update operator' })
  }
}

export const deleteOperator = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    await db.delete(operators).where(eq(operators.id, id))

    return res.status(204).send()
  } catch (error) {
    console.error('Error deleting operator:', error)
    return res.status(500).json({ error: 'Failed to delete operator' })
  }
}

/**
 * Update operator using Drizzle ORM (unified data source)
 */
export const updateLegacyOperator = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params
    const updates = req.body

    // Build update data (Drizzle uses camelCase from schema)
    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.phone !== undefined) updateData.phone = updates.phone
    if (updates.email !== undefined) updateData.email = updates.email
    if (updates.address !== undefined) updateData.address = updates.address
    if (updates.province !== undefined) updateData.province = updates.province
    if (updates.district !== undefined) updateData.district = updates.district
    if (updates.representativeName !== undefined) updateData.representative = updates.representativeName
    if (updates.taxCode !== undefined) updateData.taxCode = updates.taxCode
    if (updates.businessLicense !== undefined) updateData.businessLicense = updates.businessLicense

    // Update operator using Drizzle ORM
    const [data] = await db
      .update(operators)
      .set(updateData)
      .where(eq(operators.id, id))
      .returning()

    if (!data) {
      return res.status(404).json({ error: 'Operator not found' })
    }

    // Invalidate cache
    legacyOperatorsCache = null

    return res.json({
      id: data.id,
      name: data.name || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      province: data.province || '',
      district: data.district || '',
      representativeName: data.representative || '',
      taxCode: data.taxCode || '',
      businessLicense: data.businessLicense || '',
      businessType: '',
      isActive: data.isActive !== false,
      source: data.source || 'supabase',
    })
  } catch (error: any) {
    console.error('Error updating legacy operator:', error)
    return res.status(500).json({ error: error.message || 'Failed to update operator' })
  }
}

/**
 * Delete operator using Drizzle ORM (unified data source)
 */
export const deleteLegacyOperator = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    // Delete using Drizzle ORM
    await db.delete(operators).where(eq(operators.id, id))

    // Invalidate cache
    legacyOperatorsCache = null

    return res.status(204).send()
  } catch (error) {
    console.error('Error deleting legacy operator:', error)
    return res.status(500).json({ error: 'Failed to delete operator' })
  }
}

