import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { serviceCharges, services } from '../db/schema/index.js'
import { eq, desc, asc } from 'drizzle-orm'
import { z } from 'zod'

const serviceChargeSchema = z.object({
  dispatchRecordId: z.string().min(1, 'Dispatch record ID is required'),
  serviceTypeId: z.string().min(1, 'Service ID is required'), // Giữ tên cũ để tương thích với frontend
  quantity: z.number().positive().default(1),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  totalAmount: z.number().nonnegative('Total amount must be non-negative'),
})

export const getAllServiceCharges = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { dispatchRecordId } = req.query

    let query = db
      .select({
        charge: serviceCharges,
        service: services,
      })
      .from(serviceCharges)
      .leftJoin(services, eq(serviceCharges.serviceId, services.id))
      .$dynamic()

    if (dispatchRecordId) {
      query = query.where(eq(serviceCharges.dispatchRecordId, dispatchRecordId as string))
    }

    const data = await query.orderBy(desc(serviceCharges.createdAt))

    const serviceChargesData = data.map((row) => ({
      id: row.charge.id,
      dispatchRecordId: row.charge.dispatchRecordId,
      serviceTypeId: row.charge.serviceId,
      serviceType: row.service
        ? {
            id: row.service.id,
            code: row.service.code,
            name: row.service.name,
            basePrice: parseFloat(row.service.basePrice || '0'),
            unit: row.service.unit,
            description: row.service.description,
          }
        : undefined,
      quantity: parseFloat(row.charge.quantity),
      unitPrice: parseFloat(row.charge.unitPrice),
      totalAmount: parseFloat(row.charge.totalAmount),
      createdAt: row.charge.createdAt,
    }))

    return res.json(serviceChargesData)
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch service charges' })
  }
}

export const getServiceChargeById = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    const data = await db
      .select({
        charge: serviceCharges,
        service: services,
      })
      .from(serviceCharges)
      .leftJoin(services, eq(serviceCharges.serviceId, services.id))
      .where(eq(serviceCharges.id, id))
      .limit(1)

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Service charge not found' })
    }

    const row = data[0]

    return res.json({
      id: row.charge.id,
      dispatchRecordId: row.charge.dispatchRecordId,
      serviceTypeId: row.charge.serviceId,
      serviceType: row.service
        ? {
            id: row.service.id,
            code: row.service.code,
            name: row.service.name,
            basePrice: parseFloat(row.service.basePrice || '0'),
            unit: row.service.unit,
            description: row.service.description,
          }
        : undefined,
      quantity: parseFloat(row.charge.quantity),
      unitPrice: parseFloat(row.charge.unitPrice),
      totalAmount: parseFloat(row.charge.totalAmount),
      createdAt: row.charge.createdAt,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch service charge' })
  }
}

export const createServiceCharge = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const validated = serviceChargeSchema.parse(req.body)

    const inserted = await db
      .insert(serviceCharges)
      .values({
        dispatchRecordId: validated.dispatchRecordId,
        serviceId: validated.serviceTypeId,
        quantity: validated.quantity.toString(),
        unitPrice: validated.unitPrice.toString(),
        totalAmount: validated.totalAmount.toString(),
      })
      .returning()

    const newCharge = inserted[0]

    // Fetch service details
    const serviceData = await db
      .select()
      .from(services)
      .where(eq(services.id, newCharge.serviceId))
      .limit(1)

    const service = serviceData.length > 0 ? serviceData[0] : null

    return res.status(201).json({
      id: newCharge.id,
      dispatchRecordId: newCharge.dispatchRecordId,
      serviceTypeId: newCharge.serviceId,
      serviceType: service
        ? {
            id: service.id,
            code: service.code,
            name: service.name,
            basePrice: parseFloat(service.basePrice || '0'),
            unit: service.unit,
            description: service.description,
          }
        : undefined,
      quantity: parseFloat(newCharge.quantity),
      unitPrice: parseFloat(newCharge.unitPrice),
      totalAmount: parseFloat(newCharge.totalAmount),
      createdAt: newCharge.createdAt,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to create service charge' })
  }
}

export const deleteServiceCharge = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    await db.delete(serviceCharges).where(eq(serviceCharges.id, id))

    res.status(204).send()
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete service charge' })
  }
}

export const getAllServiceTypes = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { isActive } = req.query

    let query = db
      .select({
        id: services.id,
        code: services.code,
        name: services.name,
        description: services.description,
        basePrice: services.basePrice,
        unit: services.unit,
        isActive: services.isActive,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
      })
      .from(services)
      .$dynamic()

    if (isActive !== undefined) {
      query = query.where(eq(services.isActive, isActive === 'true'))
    }

    const data = await query.orderBy(asc(services.displayOrder), asc(services.name))

    const serviceTypes = data.map((svc) => ({
      id: svc.id,
      code: svc.code,
      name: svc.name,
      description: svc.description,
      basePrice: parseFloat(svc.basePrice || '0'),
      unit: svc.unit,
      isActive: svc.isActive,
      createdAt: svc.createdAt,
      updatedAt: svc.updatedAt,
    }))

    res.json(serviceTypes)
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch service types' })
  }
}

