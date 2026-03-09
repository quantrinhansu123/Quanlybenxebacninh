import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { shifts } from '../db/schema/shifts.js'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const shiftSchema = z.object({
  name: z.string().min(1, 'Tên ca trực là bắt buộc'),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Giờ bắt đầu không hợp lệ (HH:mm)'),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Giờ kết thúc không hợp lệ (HH:mm)'),
})

export const getAllShifts = async (_req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const data = await db.select().from(shifts).where(eq(shifts.isActive, true)).orderBy(shifts.startTime)

    const shiftsData = data.map((shift: any) => ({
      id: shift.id,
      name: shift.name,
      startTime: shift.startTime ? shift.startTime.substring(0, 5) : '', // Format TIME to HH:mm
      endTime: shift.endTime ? shift.endTime.substring(0, 5) : '', // Format TIME to HH:mm
      createdAt: shift.createdAt,
      updatedAt: shift.updatedAt,
    }))

    return res.json(shiftsData)
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Không thể tải danh sách ca trực' })
  }
}

export const getShiftById = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    const [data] = await db.select().from(shifts).where(eq(shifts.id, id))

    if (!data || !data.isActive) {
      return res.status(404).json({ error: 'Ca trực không tồn tại' })
    }

    return res.json({
      id: data.id,
      name: data.name,
      startTime: data.startTime ? data.startTime.substring(0, 5) : '', // Format TIME to HH:mm
      endTime: data.endTime ? data.endTime.substring(0, 5) : '', // Format TIME to HH:mm
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Không thể tải thông tin ca trực' })
  }
}

export const createShift = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const validated = shiftSchema.parse(req.body)

    // Convert HH:mm to TIME format (HH:mm:ss)
    const startTime = `${validated.startTime}:00`
    const endTime = `${validated.endTime}:00`

    const [data] = await db.insert(shifts).values({
      name: validated.name,
      startTime: startTime,
      endTime: endTime,
      isActive: true,
    }).returning()

    return res.status(201).json({
      id: data.id,
      name: data.name,
      startTime: data.startTime ? data.startTime.substring(0, 5) : '',
      endTime: data.endTime ? data.endTime.substring(0, 5) : '',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Tên ca trực đã tồn tại' })
    }
    return res.status(500).json({ error: error.message || 'Không thể tạo ca trực' })
  }
}

export const updateShift = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params
    const validated = shiftSchema.partial().parse(req.body)

    const updateData: any = {}
    if (validated.name) updateData.name = validated.name
    if (validated.startTime) updateData.startTime = `${validated.startTime}:00`
    if (validated.endTime) updateData.endTime = `${validated.endTime}:00`

    const [data] = await db.update(shifts).set(updateData).where(eq(shifts.id, id)).returning()

    if (!data || !data.isActive) {
      return res.status(404).json({ error: 'Ca trực không tồn tại' })
    }

    return res.json({
      id: data.id,
      name: data.name,
      startTime: data.startTime ? data.startTime.substring(0, 5) : '',
      endTime: data.endTime ? data.endTime.substring(0, 5) : '',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Tên ca trực đã tồn tại' })
    }
    return res.status(500).json({ error: error.message || 'Không thể cập nhật ca trực' })
  }
}

export const deleteShift = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params

    // Soft delete by setting is_active to false
    await db.update(shifts).set({ isActive: false }).where(eq(shifts.id, id))

    return res.status(204).send()
  } catch (error: any) {
    // Check if shift is being referenced by other tables
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Không thể xóa ca trực. Ca trực này đang được sử dụng trong hệ thống.' })
    }
    return res.status(500).json({ error: error.message || 'Không thể xóa ca trực' })
  }
}

