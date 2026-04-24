/**
 * User Controller
 * Handles CRUD operations for users (Nhân sự)
 */
import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { users } from '../db/schema/users.js'
import { locations } from '../db/schema/locations.js'
import { dispatchRecords } from '../db/schema/dispatch-records.js'
import { auditLogs } from '../db/schema/audit-logs.js'
import { violations } from '../db/schema/violations.js'
import { vehicleDocuments } from '../db/schema/vehicle-documents.js'
import { eq, sql, ilike, or, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const getErrorLog = (error: unknown): Record<string, unknown> => {
  if (!error) return { message: 'Unknown error' }
  if (error instanceof Error) {
    const err = error as Error & { cause?: unknown; code?: string }
    return {
      name: err.name,
      message: err.message,
      code: err.code,
      cause: err.cause instanceof Error ? err.cause.message : undefined,
    }
  }
  return { message: String(error) }
}

const isMissingTableError = (error: unknown): boolean => {
  const err = error as any
  const code = err?.code || err?.cause?.code
  const message = String(err?.message || '')
  const causeMessage = String(err?.cause || '')
  return (
    code === '42P01' ||
    message.includes('relation') && message.includes('does not exist') ||
    causeMessage.includes('relation') && causeMessage.includes('does not exist')
  )
}

const tryOptionalUpdate = async (operation: () => Promise<unknown>): Promise<void> => {
  try {
    await operation()
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error
    }
  }
}

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  name: z.string().min(1, 'Tên không được để trống'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'dispatcher', 'accountant', 'reporter', 'user']).default('user'),
  isActive: z.boolean().default(true),
  benPhuTrach: z.string().uuid('Bến phụ trách không hợp lệ').nullable().optional(),
})

const updateUserSchema = z.object({
  email: z.string().email('Email không hợp lệ').optional(),
  name: z.string().min(1, 'Tên không được để trống').optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'dispatcher', 'accountant', 'reporter', 'user']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').optional(),
  benPhuTrach: z.string().uuid('Bến phụ trách không hợp lệ').nullable().optional(),
})

/**
 * Get all users with pagination and search
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(500).json({ error: 'Database not initialized' })
      return
    }
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const search = (req.query.search as string) || ''
    const role = req.query.role as string
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined

    const offset = (page - 1) * limit

    // Build where conditions
    const conditions = []
    if (search) {
      conditions.push(
        or(
          ilike(users.email, `%${search}%`),
          ilike(users.name, `%${search}%`),
          ilike(users.phone, `%${search}%`)
        )!
      )
    }
    if (role) {
      conditions.push(eq(users.role, role))
    }
    if (isActive !== undefined) {
      conditions.push(eq(users.isActive, isActive))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get users with location info
    const userList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        benPhuTrach: users.benPhuTrach,
        benPhuTrachName: locations.name,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Don't return password hash
      })
      .from(users)
      .leftJoin(locations, eq(users.benPhuTrach, locations.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(users.createdAt)

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause)

    const total = Number(countResult?.count || 0)

    res.json({
      data: userList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error getting users:', error)
    res.status(500).json({ error: 'Failed to get users' })
  }
}

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(500).json({ error: 'Database not initialized' })
      return
    }

    const { id } = req.params

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        benPhuTrach: users.benPhuTrach,
        benPhuTrachName: locations.name,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(locations, eq(users.benPhuTrach, locations.id))
      .where(eq(users.id, id))
      .limit(1)

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.json(user)
  } catch (error) {
    console.error('Error getting user:', error)
    res.status(500).json({ error: 'Failed to get user' })
  }
}

/**
 * Create new user
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(500).json({ error: 'Database not initialized' })
      return
    }

    const validated = createUserSchema.parse(req.body)
    const { email, password, name, phone, role, isActive, benPhuTrach } = validated

    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    if (existingUser) {
      res.status(409).json({ error: 'Email đã tồn tại' })
      return
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Validate benPhuTrach if provided
    if (benPhuTrach) {
      const [location] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, benPhuTrach))
        .limit(1)

      if (!location) {
        res.status(400).json({ error: 'Bến phụ trách không tồn tại' })
        return
      }
    }

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        name,
        phone: phone || null,
        role: role || 'user',
        isActive: isActive !== undefined ? isActive : true,
        emailVerified: false,
        benPhuTrach: benPhuTrach || null,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        benPhuTrach: users.benPhuTrach,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })

    // Get location name if benPhuTrach exists
    if (newUser.benPhuTrach) {
      const [location] = await db
        .select({ name: locations.name })
        .from(locations)
        .where(eq(locations.id, newUser.benPhuTrach))
        .limit(1)
      
      if (location) {
        ;(newUser as any).benPhuTrachName = location.name
      }
    }

    res.status(201).json(newUser)
  } catch (error) {
    console.error('Error creating user:', getErrorLog(error))
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors })
      return
    }
    res.status(500).json({ error: 'Failed to create user' })
  }
}

/**
 * Update user
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(500).json({ error: 'Database not initialized' })
      return
    }

    const { id } = req.params
    const validated = updateUserSchema.parse(req.body)

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (!existingUser) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Check if email is being changed and if new email already exists
    if (validated.email && validated.email.toLowerCase() !== existingUser.email) {
      const [emailExists] = await db
        .select()
        .from(users)
        .where(eq(users.email, validated.email.toLowerCase()))
        .limit(1)

      if (emailExists) {
        res.status(409).json({ error: 'Email đã tồn tại' })
        return
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (validated.email) updateData.email = validated.email.toLowerCase()
    if (validated.name) updateData.name = validated.name
    if (validated.phone !== undefined) updateData.phone = validated.phone || null
    if (validated.role) updateData.role = validated.role
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive

    // Validate benPhuTrach if provided
    if (validated.benPhuTrach !== undefined) {
      if (validated.benPhuTrach) {
        const [location] = await db
          .select()
          .from(locations)
          .where(eq(locations.id, validated.benPhuTrach))
          .limit(1)

        if (!location) {
          res.status(400).json({ error: 'Bến phụ trách không tồn tại' })
          return
        }
      }
      updateData.benPhuTrach = validated.benPhuTrach || null
    }

    // Hash new password if provided
    if (validated.password) {
      updateData.passwordHash = await bcrypt.hash(validated.password, 10)
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        benPhuTrach: users.benPhuTrach,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })

    // Get location name if benPhuTrach exists
    if (updatedUser.benPhuTrach) {
      const [location] = await db
        .select({ name: locations.name })
        .from(locations)
        .where(eq(locations.id, updatedUser.benPhuTrach))
        .limit(1)
      
      if (location) {
        ;(updatedUser as any).benPhuTrachName = location.name
      }
    }

    res.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', getErrorLog(error))
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors })
      return
    }
    res.status(500).json({ error: 'Failed to update user' })
  }
}

/**
 * Delete user
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(500).json({ error: 'Database not initialized' })
      return
    }
    const database = db

    const { id } = req.params

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (!existingUser) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Unlink foreign-key references first, then delete user.
    // This keeps historical records while allowing account deletion.
    // Important: do not run in one transaction because some environments
    // may miss optional tables (violations, vehicle_documents). A single
    // missing table would abort transaction and block user deletion.
    await database
      .update(dispatchRecords)
      .set({
        userId: null,
        entryBy: null,
        passengerDropBy: null,
        boardingPermitBy: null,
        paymentBy: null,
        departureOrderBy: null,
        exitBy: null,
      })
      .where(
        or(
          eq(dispatchRecords.userId, id),
          eq(dispatchRecords.entryBy, id),
          eq(dispatchRecords.passengerDropBy, id),
          eq(dispatchRecords.boardingPermitBy, id),
          eq(dispatchRecords.paymentBy, id),
          eq(dispatchRecords.departureOrderBy, id),
          eq(dispatchRecords.exitBy, id),
        )!
      )

    await database
      .update(auditLogs)
      .set({ userId: null })
      .where(eq(auditLogs.userId, id))

    await tryOptionalUpdate(() =>
      database
        .update(violations)
        .set({ recordedBy: null })
        .where(eq(violations.recordedBy, id))
    )

    await tryOptionalUpdate(() =>
      database
        .update(vehicleDocuments)
        .set({ updatedBy: null })
        .where(eq(vehicleDocuments.updatedBy, id))
    )

    await database.delete(users).where(eq(users.id, id))

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting user:', getErrorLog(error))
    res.status(500).json({ error: 'Failed to delete user' })
  }
}
