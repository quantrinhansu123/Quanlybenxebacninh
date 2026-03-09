import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { services, serviceFormulaUsage } from '../db/schema/index.js'
import { eq, asc } from 'drizzle-orm'
import { z } from 'zod'

const serviceSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  unit: z.string().min(1, 'Unit is required'),
  taxPercentage: z.number().min(0).max(100),
  materialType: z.string().min(1, 'Material type is required'),
  useQuantityFormula: z.boolean().default(false),
  usePriceFormula: z.boolean().default(false),
  displayOrder: z.number().int().min(0),
  isDefault: z.boolean().default(false),
  autoCalculateQuantity: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

export const getAllServices = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { isActive } = req.query

    let query = db
      .select()
      .from(services)
      .$dynamic()

    if (isActive !== undefined) {
      query = query.where(eq(services.isActive, isActive === 'true'))
    }

    const data = await query.orderBy(asc(services.displayOrder), asc(services.name))

    const servicesData = data.map((svc) => ({
      id: svc.id,
      code: svc.code,
      name: svc.name,
      unit: svc.unit,
      taxPercentage: parseFloat(svc.taxPercentage || '0'),
      materialType: svc.materialType,
      useQuantityFormula: svc.useQuantityFormula,
      usePriceFormula: svc.usePriceFormula,
      displayOrder: svc.displayOrder,
      isDefault: svc.isDefault,
      autoCalculateQuantity: svc.autoCalculateQuantity,
      isActive: svc.isActive,
      createdAt: svc.createdAt,
      updatedAt: svc.updatedAt,
    }))

    return res.json(servicesData)
  } catch (error) {
    console.error('Error fetching services:', error)
    return res.status(500).json({ error: 'Failed to fetch services' })
  }
}

export const getServiceById = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    const data = await db
      .select()
      .from(services)
      .where(eq(services.id, id))
      .limit(1)

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Service not found' })
    }

    const service = data[0]

    // Lấy thông tin biểu thức đã chọn
    const usageData = await db
      .select()
      .from(serviceFormulaUsage)
      .where(eq(serviceFormulaUsage.serviceId, id))

    let quantityFormulaId = ''
    let priceFormulaId = ''

    if (usageData && usageData.length > 0) {
      const quantityUsage = usageData.find((u) => u.usageType === 'quantity')
      const priceUsage = usageData.find((u) => u.usageType === 'price')
      quantityFormulaId = quantityUsage?.formulaId || ''
      priceFormulaId = priceUsage?.formulaId || ''
    }

    return res.json({
      id: service.id,
      code: service.code,
      name: service.name,
      unit: service.unit,
      taxPercentage: parseFloat(service.taxPercentage || '0'),
      materialType: service.materialType,
      useQuantityFormula: service.useQuantityFormula,
      usePriceFormula: service.usePriceFormula,
      displayOrder: service.displayOrder,
      isDefault: service.isDefault,
      autoCalculateQuantity: service.autoCalculateQuantity,
      isActive: service.isActive,
      quantityFormulaExpression: quantityFormulaId,
      priceFormulaExpression: priceFormulaId,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching service:', error)
    return res.status(500).json({ error: 'Failed to fetch service' })
  }
}

export const createService = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const validated = serviceSchema.parse(req.body)
    const { quantityFormulaExpression, priceFormulaExpression } = req.body

    const data = await db
      .insert(services)
      .values({
        code: validated.code,
        name: validated.name,
        unit: validated.unit,
        taxPercentage: validated.taxPercentage.toString(),
        materialType: validated.materialType,
        useQuantityFormula: validated.useQuantityFormula,
        usePriceFormula: validated.usePriceFormula,
        displayOrder: validated.displayOrder,
        isDefault: validated.isDefault,
        autoCalculateQuantity: validated.autoCalculateQuantity,
        isActive: validated.isActive,
      })
      .returning()

    const newService = data[0]

    // Lưu mối quan hệ với biểu thức vào service_formula_usage
    const usageInserts: Array<typeof serviceFormulaUsage.$inferInsert> = []

    if (quantityFormulaExpression) {
      usageInserts.push({
        serviceId: newService.id,
        formulaId: quantityFormulaExpression,
        usageType: 'quantity',
      })
    }

    if (priceFormulaExpression) {
      usageInserts.push({
        serviceId: newService.id,
        formulaId: priceFormulaExpression,
        usageType: 'price',
      })
    }

    if (usageInserts.length > 0) {
      try {
        await db.insert(serviceFormulaUsage).values(usageInserts)
      } catch (usageError) {
        console.error('Error creating service formula usage:', usageError)
      }
    }

    return res.status(201).json({
      id: newService.id,
      code: newService.code,
      name: newService.name,
      unit: newService.unit,
      taxPercentage: parseFloat(newService.taxPercentage || '0'),
      materialType: newService.materialType,
      useQuantityFormula: newService.useQuantityFormula,
      usePriceFormula: newService.usePriceFormula,
      displayOrder: newService.displayOrder,
      isDefault: newService.isDefault,
      autoCalculateQuantity: newService.autoCalculateQuantity,
      isActive: newService.isActive,
      createdAt: newService.createdAt,
      updatedAt: newService.updatedAt,
    })
  } catch (error: any) {
    console.error('Error creating service:', error)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Service with this code already exists' })
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to create service' })
  }
}

export const updateService = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params
    const validated = serviceSchema.partial().parse(req.body)
    const { quantityFormulaExpression, priceFormulaExpression } = req.body

    const updateData: any = {}
    if (validated.code !== undefined) updateData.code = validated.code
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.unit !== undefined) updateData.unit = validated.unit
    if (validated.taxPercentage !== undefined) updateData.taxPercentage = validated.taxPercentage.toString()
    if (validated.materialType !== undefined) updateData.materialType = validated.materialType
    if (validated.useQuantityFormula !== undefined) updateData.useQuantityFormula = validated.useQuantityFormula
    if (validated.usePriceFormula !== undefined) updateData.usePriceFormula = validated.usePriceFormula
    if (validated.displayOrder !== undefined) updateData.displayOrder = validated.displayOrder
    if (validated.isDefault !== undefined) updateData.isDefault = validated.isDefault
    if (validated.autoCalculateQuantity !== undefined) updateData.autoCalculateQuantity = validated.autoCalculateQuantity
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive

    updateData.updatedAt = new Date()

    const data = await db
      .update(services)
      .set(updateData)
      .where(eq(services.id, id))
      .returning()

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Service not found' })
    }

    const updatedService = data[0]

    // Cập nhật mối quan hệ với biểu thức
    await db.delete(serviceFormulaUsage).where(eq(serviceFormulaUsage.serviceId, id))

    // Tạo lại các usage mới
    const usageInserts: Array<typeof serviceFormulaUsage.$inferInsert> = []

    if (quantityFormulaExpression) {
      usageInserts.push({
        serviceId: id,
        formulaId: quantityFormulaExpression,
        usageType: 'quantity',
      })
    }

    if (priceFormulaExpression) {
      usageInserts.push({
        serviceId: id,
        formulaId: priceFormulaExpression,
        usageType: 'price',
      })
    }

    if (usageInserts.length > 0) {
      try {
        await db.insert(serviceFormulaUsage).values(usageInserts)
      } catch (usageError) {
        console.error('Error updating service formula usage:', usageError)
      }
    }

    return res.json({
      id: updatedService.id,
      code: updatedService.code,
      name: updatedService.name,
      unit: updatedService.unit,
      taxPercentage: parseFloat(updatedService.taxPercentage || '0'),
      materialType: updatedService.materialType,
      useQuantityFormula: updatedService.useQuantityFormula,
      usePriceFormula: updatedService.usePriceFormula,
      displayOrder: updatedService.displayOrder,
      isDefault: updatedService.isDefault,
      autoCalculateQuantity: updatedService.autoCalculateQuantity,
      isActive: updatedService.isActive,
      createdAt: updatedService.createdAt,
      updatedAt: updatedService.updatedAt,
    })
  } catch (error: any) {
    console.error('Error updating service:', error)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Service with this code already exists' })
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to update service' })
  }
}

export const deleteService = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    await db.delete(services).where(eq(services.id, id))

    return res.status(204).send()
  } catch (error: any) {
    console.error('Error deleting service:', error)
    // Check if service is referenced by other tables
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Cannot delete service as it is being used' })
    }
    return res.status(500).json({ error: 'Failed to delete service' })
  }
}

