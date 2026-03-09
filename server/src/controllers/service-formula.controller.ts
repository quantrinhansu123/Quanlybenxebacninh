import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { serviceFormulas, serviceFormulaUsage, services } from '../db/schema/index.js'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const serviceFormulaSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  formulaType: z.enum(['quantity', 'price'], {
    errorMap: () => ({ message: 'Formula type must be either quantity or price' }),
  }),
  formulaExpression: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const getAllServiceFormulas = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { formulaType, isActive } = req.query

    let query = db.select().from(serviceFormulas).$dynamic()

    if (formulaType) {
      query = query.where(eq(serviceFormulas.formulaType, formulaType as string))
    }

    if (isActive !== undefined) {
      query = query.where(eq(serviceFormulas.isActive, isActive === 'true'))
    }

    const data = await query

    // Get formula usage data
    const usageData = await db.select().from(serviceFormulaUsage)

    // Get services data to get service names
    const servicesData = await db.select().from(services)

    // Create a map of formula_id -> service names
    const formulaUsageMap: Record<string, { count: number; serviceNames: string[] }> = {}

    if (usageData && servicesData) {
      const servicesMap = new Map(servicesData.map((s) => [s.id, s.name]))

      usageData.forEach((usage) => {
        const formulaId = usage.formulaId
        const serviceName = servicesMap.get(usage.serviceId) as string

        if (!formulaUsageMap[formulaId]) {
          formulaUsageMap[formulaId] = { count: 0, serviceNames: [] }
        }

        formulaUsageMap[formulaId].count++
        if (serviceName && !formulaUsageMap[formulaId].serviceNames.includes(serviceName)) {
          formulaUsageMap[formulaId].serviceNames.push(serviceName)
        }
      })
    }

    // Sort in memory
    const sortedData = (data || []).sort((a, b) => {
      if (a.formulaType !== b.formulaType) {
        return a.formulaType.localeCompare(b.formulaType)
      }
      return (a.code || '').localeCompare(b.code || '')
    })

    const formulas = sortedData.map((formula) => {
      const usage = formulaUsageMap[formula.id] || { count: 0, serviceNames: [] }
      return {
        id: formula.id,
        code: formula.code,
        name: formula.name,
        description: formula.description,
        formulaType: formula.formulaType,
        formulaExpression: formula.formulaExpression,
        isActive: formula.isActive,
        usageCount: usage.count,
        usedByServices: usage.serviceNames.join(', '),
        createdAt: formula.createdAt,
        updatedAt: formula.updatedAt,
      }
    })

    return res.json(formulas)
  } catch (error: any) {
    console.error('Error fetching service formulas:', error)
    return res.status(500).json({ error: 'Failed to fetch service formulas' })
  }
}

export const getServiceFormulaById = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    const data = await db
      .select()
      .from(serviceFormulas)
      .where(eq(serviceFormulas.id, id))
      .limit(1)

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Service formula not found' })
    }

    const formula = data[0]

    // Get usage data for this formula
    const usageData = await db
      .select()
      .from(serviceFormulaUsage)
      .where(eq(serviceFormulaUsage.formulaId, id))

    // Get service names
    let usageCount = 0
    const serviceNames: string[] = []

    if (usageData && usageData.length > 0) {
      usageCount = usageData.length
      const serviceIds = usageData.map((u) => u.serviceId)

      const servicesData = await db.select().from(services)

      if (servicesData) {
        servicesData.forEach((s) => {
          if (serviceIds.includes(s.id) && !serviceNames.includes(s.name)) {
            serviceNames.push(s.name)
          }
        })
      }
    }

    return res.json({
      id: formula.id,
      code: formula.code,
      name: formula.name,
      description: formula.description,
      formulaType: formula.formulaType,
      formulaExpression: formula.formulaExpression,
      isActive: formula.isActive,
      usageCount: usageCount,
      usedByServices: serviceNames.join(', '),
      createdAt: formula.createdAt,
      updatedAt: formula.updatedAt,
    })
  } catch (error: any) {
    console.error('Error fetching service formula:', error)
    return res.status(500).json({ error: 'Failed to fetch service formula' })
  }
}

export const createServiceFormula = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const validated = serviceFormulaSchema.parse(req.body)

    const data = await db
      .insert(serviceFormulas)
      .values({
        code: validated.code,
        name: validated.name,
        description: validated.description,
        formulaType: validated.formulaType,
        formulaExpression: validated.formulaExpression,
        isActive: validated.isActive,
      })
      .returning()

    const newFormula = data[0]

    return res.status(201).json({
      id: newFormula.id,
      code: newFormula.code,
      name: newFormula.name,
      description: newFormula.description,
      formulaType: newFormula.formulaType,
      formulaExpression: newFormula.formulaExpression,
      isActive: newFormula.isActive,
      usageCount: 0,
      usedByServices: '',
      createdAt: newFormula.createdAt,
      updatedAt: newFormula.updatedAt,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Formula code already exists' })
    }
    console.error('Error creating service formula:', error)
    return res.status(500).json({ error: 'Failed to create service formula' })
  }
}

export const updateServiceFormula = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params
    const validated = serviceFormulaSchema.partial().parse(req.body)

    const updateData: any = {}
    if (validated.code !== undefined) updateData.code = validated.code
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.formulaType !== undefined) updateData.formulaType = validated.formulaType
    if (validated.formulaExpression !== undefined) updateData.formulaExpression = validated.formulaExpression
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive

    const data = await db
      .update(serviceFormulas)
      .set(updateData)
      .where(eq(serviceFormulas.id, id))
      .returning()

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Service formula not found' })
    }

    const updatedFormula = data[0]

    return res.json({
      id: updatedFormula.id,
      code: updatedFormula.code,
      name: updatedFormula.name,
      description: updatedFormula.description,
      formulaType: updatedFormula.formulaType,
      formulaExpression: updatedFormula.formulaExpression,
      isActive: updatedFormula.isActive,
      usageCount: 0,
      usedByServices: '',
      createdAt: updatedFormula.createdAt,
      updatedAt: updatedFormula.updatedAt,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Formula code already exists' })
    }
    console.error('Error updating service formula:', error)
    return res.status(500).json({ error: 'Failed to update service formula' })
  }
}

export const deleteServiceFormula = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    await db.delete(serviceFormulas).where(eq(serviceFormulas.id, id))

    return res.status(204).send()
  } catch (error: any) {
    console.error('Error deleting service formula:', error)
    return res.status(500).json({ error: 'Failed to delete service formula' })
  }
}

