import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { schedules, routes, operators, dispatchRecords } from '../db/schema/index.js'
import { eq, and, gte, lt, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import LunarCalendar from 'lunar-calendar'

const shouldUseRouteCodeOld = (routeCode?: string | null, routeCodeOld?: string | null, routeType?: string | null): boolean => {
  const oldCode = (routeCodeOld || '').trim()
  if (!oldCode) return false
  const type = (routeType || '').trim().toLowerCase()
  const code = (routeCode || '').trim().toUpperCase()
  return type === 'bus' || code.startsWith('BUS-')
}

const getDisplayRouteCode = (routeCode?: string | null, routeCodeOld?: string | null, routeType?: string | null): string => {
  if (shouldUseRouteCodeOld(routeCode, routeCodeOld, routeType)) {
    return (routeCodeOld || '').trim()
  }
  return (routeCode || '').trim()
}

const mapRoutePayload = (route?: { id?: string; routeCode?: string | null; routeCodeOld?: string | null; routeType?: string | null } | null) => {
  if (!route?.id) return undefined
  const displayCode = getDisplayRouteCode(route.routeCode, route.routeCodeOld, route.routeType)
  return {
    id: route.id,
    routeName: displayCode,
    routeCode: displayCode,
  }
}

const scheduleSchema = z.object({
  scheduleCode: z.string().optional(), // Optional - will be auto-generated if not provided
  routeId: z.string().uuid('Invalid route ID'),
  operatorId: z.string().uuid('Invalid operator ID'),
  departureTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  frequencyType: z.enum(['daily', 'weekly', 'specific_days']),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).optional(),
  effectiveFrom: z.string().min(1, 'Effective from date is required'),
  effectiveTo: z.string().optional(),
  direction: z.string().optional(),
  daysOfMonth: z.array(z.number().int().min(1).max(31)).optional(),
  calendarType: z.string().optional(),
  notificationNumber: z.string().optional(),
  tripStatus: z.string().optional(),
})

export const getAllSchedules = async (req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' })
    }

    const { routeId, operatorId, isActive, direction } = req.query

    // Build where conditions
    const conditions = []
    if (routeId) {
      conditions.push(eq(schedules.routeId, routeId as string))
    }
    if (operatorId) {
      conditions.push(eq(schedules.operatorId, operatorId as string))
    }
    if (isActive !== undefined) {
      conditions.push(eq(schedules.isActive, isActive === 'true'))
    }
    if (direction) {
      conditions.push(eq(schedules.direction, direction as string))
    }

    // Query with joins
    const data = await db
      .select({
        id: schedules.id,
        scheduleCode: schedules.scheduleCode,
        routeId: schedules.routeId,
        operatorId: schedules.operatorId,
        departureTime: schedules.departureTime,
        frequencyType: schedules.frequencyType,
        daysOfWeek: schedules.daysOfWeek,
        effectiveFrom: schedules.effectiveFrom,
        effectiveTo: schedules.effectiveTo,
        isActive: schedules.isActive,
        direction: schedules.direction,
        daysOfMonth: schedules.daysOfMonth,
        calendarType: schedules.calendarType,
        notificationNumber: schedules.notificationNumber,
        tripStatus: schedules.tripStatus,
        createdAt: schedules.createdAt,
        updatedAt: schedules.updatedAt,
        route: {
          id: routes.id,
          routeName: routes.routeCode,
          routeCode: routes.routeCode,
          routeCodeOld: routes.routeCodeOld,
          routeType: routes.routeType,
        },
        operator: {
          id: operators.id,
          name: operators.name,
          code: operators.code,
        },
      })
      .from(schedules)
      .leftJoin(routes, eq(schedules.routeId, routes.id))
      .leftJoin(operators, eq(schedules.operatorId, operators.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(schedules.departureTime)

    const result = data.map((item) => ({
      id: item.id,
      scheduleCode: item.scheduleCode,
      routeId: item.routeId,
      route: mapRoutePayload(item.route),
      operatorId: item.operatorId,
      operator: item.operator?.id ? item.operator : undefined,
      departureTime: item.departureTime,
      frequencyType: item.frequencyType,
      daysOfWeek: (item.daysOfWeek as number[]) || [],
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
      isActive: item.isActive,
      direction: item.direction,
      daysOfMonth: (item.daysOfMonth as number[]) || [],
      calendarType: item.calendarType,
      notificationNumber: item.notificationNumber,
      tripStatus: item.tripStatus,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))

    return res.json(result)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to fetch schedules' })
  }
}

export const getScheduleById = async (req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' })
    }

    const { id } = req.params

    const data = await db
      .select({
        id: schedules.id,
        scheduleCode: schedules.scheduleCode,
        routeId: schedules.routeId,
        operatorId: schedules.operatorId,
        departureTime: schedules.departureTime,
        frequencyType: schedules.frequencyType,
        daysOfWeek: schedules.daysOfWeek,
        effectiveFrom: schedules.effectiveFrom,
        effectiveTo: schedules.effectiveTo,
        isActive: schedules.isActive,
        direction: schedules.direction,
        daysOfMonth: schedules.daysOfMonth,
        calendarType: schedules.calendarType,
        notificationNumber: schedules.notificationNumber,
        tripStatus: schedules.tripStatus,
        createdAt: schedules.createdAt,
        updatedAt: schedules.updatedAt,
        route: {
          id: routes.id,
          routeName: routes.routeCode,
          routeCode: routes.routeCode,
          routeCodeOld: routes.routeCodeOld,
          routeType: routes.routeType,
        },
        operator: {
          id: operators.id,
          name: operators.name,
          code: operators.code,
        },
      })
      .from(schedules)
      .leftJoin(routes, eq(schedules.routeId, routes.id))
      .leftJoin(operators, eq(schedules.operatorId, operators.id))
      .where(eq(schedules.id, id))
      .limit(1)

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' })
    }

    const item = data[0]
    return res.json({
      id: item.id,
      scheduleCode: item.scheduleCode,
      routeId: item.routeId,
      route: mapRoutePayload(item.route),
      operatorId: item.operatorId,
      operator: item.operator?.id ? item.operator : undefined,
      departureTime: item.departureTime,
      frequencyType: item.frequencyType,
      daysOfWeek: (item.daysOfWeek as number[]) || [],
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
      isActive: item.isActive,
      direction: item.direction,
      daysOfMonth: (item.daysOfMonth as number[]) || [],
      calendarType: item.calendarType,
      notificationNumber: item.notificationNumber,
      tripStatus: item.tripStatus,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to fetch schedule' })
  }
}

export const createSchedule = async (req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' })
    }

    const validated = scheduleSchema.parse(req.body)

    // Generate schedule code if not provided
    const scheduleCode = validated.scheduleCode || `SCH-${Date.now()}`

    const [inserted] = await db
      .insert(schedules)
      .values({
        scheduleCode,
        routeId: validated.routeId,
        operatorId: validated.operatorId,
        departureTime: validated.departureTime,
        frequencyType: validated.frequencyType,
        daysOfWeek: validated.daysOfWeek || null,
        effectiveFrom: validated.effectiveFrom,
        effectiveTo: validated.effectiveTo || null,
        isActive: true,
      })
      .returning()

    // Fetch with relations
    const data = await db
      .select({
        id: schedules.id,
        scheduleCode: schedules.scheduleCode,
        routeId: schedules.routeId,
        operatorId: schedules.operatorId,
        departureTime: schedules.departureTime,
        frequencyType: schedules.frequencyType,
        daysOfWeek: schedules.daysOfWeek,
        effectiveFrom: schedules.effectiveFrom,
        effectiveTo: schedules.effectiveTo,
        isActive: schedules.isActive,
        direction: schedules.direction,
        daysOfMonth: schedules.daysOfMonth,
        calendarType: schedules.calendarType,
        notificationNumber: schedules.notificationNumber,
        tripStatus: schedules.tripStatus,
        createdAt: schedules.createdAt,
        updatedAt: schedules.updatedAt,
        route: {
          id: routes.id,
          routeName: routes.routeCode,
          routeCode: routes.routeCode,
          routeCodeOld: routes.routeCodeOld,
          routeType: routes.routeType,
        },
        operator: {
          id: operators.id,
          name: operators.name,
          code: operators.code,
        },
      })
      .from(schedules)
      .leftJoin(routes, eq(schedules.routeId, routes.id))
      .leftJoin(operators, eq(schedules.operatorId, operators.id))
      .where(eq(schedules.id, inserted.id))
      .limit(1)

    const item = data[0]
    return res.status(201).json({
      id: item.id,
      scheduleCode: item.scheduleCode,
      routeId: item.routeId,
      route: mapRoutePayload(item.route),
      operatorId: item.operatorId,
      operator: item.operator?.id ? item.operator : undefined,
      departureTime: item.departureTime,
      frequencyType: item.frequencyType,
      daysOfWeek: (item.daysOfWeek as number[]) || [],
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
      isActive: item.isActive,
      direction: item.direction,
      daysOfMonth: (item.daysOfMonth as number[]) || [],
      calendarType: item.calendarType,
      notificationNumber: item.notificationNumber,
      tripStatus: item.tripStatus,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Schedule with this code already exists' })
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to create schedule' })
  }
}

export const updateSchedule = async (req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' })
    }

    const { id } = req.params
    const validated = scheduleSchema.partial().parse(req.body)

    const updateData: any = { updatedAt: new Date() }
    if (validated.scheduleCode) updateData.scheduleCode = validated.scheduleCode
    if (validated.routeId) updateData.routeId = validated.routeId
    if (validated.operatorId) updateData.operatorId = validated.operatorId
    if (validated.departureTime) updateData.departureTime = validated.departureTime
    if (validated.frequencyType) updateData.frequencyType = validated.frequencyType
    if (validated.daysOfWeek !== undefined) updateData.daysOfWeek = validated.daysOfWeek || null
    if (validated.effectiveFrom) updateData.effectiveFrom = validated.effectiveFrom
    if (validated.effectiveTo !== undefined) updateData.effectiveTo = validated.effectiveTo || null
    if (validated.direction !== undefined) updateData.direction = validated.direction || null
    if (validated.daysOfMonth !== undefined) updateData.daysOfMonth = validated.daysOfMonth || null
    if (validated.calendarType !== undefined) updateData.calendarType = validated.calendarType || null
    if (validated.notificationNumber !== undefined) updateData.notificationNumber = validated.notificationNumber || null
    if (validated.tripStatus !== undefined) updateData.tripStatus = validated.tripStatus || null

    const [updated] = await db
      .update(schedules)
      .set(updateData)
      .where(eq(schedules.id, id))
      .returning()

    if (!updated) {
      return res.status(404).json({ error: 'Schedule not found' })
    }

    // Fetch with relations
    const data = await db
      .select({
        id: schedules.id,
        scheduleCode: schedules.scheduleCode,
        routeId: schedules.routeId,
        operatorId: schedules.operatorId,
        departureTime: schedules.departureTime,
        frequencyType: schedules.frequencyType,
        daysOfWeek: schedules.daysOfWeek,
        effectiveFrom: schedules.effectiveFrom,
        effectiveTo: schedules.effectiveTo,
        isActive: schedules.isActive,
        direction: schedules.direction,
        daysOfMonth: schedules.daysOfMonth,
        calendarType: schedules.calendarType,
        notificationNumber: schedules.notificationNumber,
        tripStatus: schedules.tripStatus,
        createdAt: schedules.createdAt,
        updatedAt: schedules.updatedAt,
        route: {
          id: routes.id,
          routeName: routes.routeCode,
          routeCode: routes.routeCode,
          routeCodeOld: routes.routeCodeOld,
          routeType: routes.routeType,
        },
        operator: {
          id: operators.id,
          name: operators.name,
          code: operators.code,
        },
      })
      .from(schedules)
      .leftJoin(routes, eq(schedules.routeId, routes.id))
      .leftJoin(operators, eq(schedules.operatorId, operators.id))
      .where(eq(schedules.id, id))
      .limit(1)

    const item = data[0]
    return res.json({
      id: item.id,
      scheduleCode: item.scheduleCode,
      routeId: item.routeId,
      route: mapRoutePayload(item.route),
      operatorId: item.operatorId,
      operator: item.operator?.id ? item.operator : undefined,
      departureTime: item.departureTime,
      frequencyType: item.frequencyType,
      daysOfWeek: (item.daysOfWeek as number[]) || [],
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
      isActive: item.isActive,
      direction: item.direction,
      daysOfMonth: (item.daysOfMonth as number[]) || [],
      calendarType: item.calendarType,
      notificationNumber: item.notificationNumber,
      tripStatus: item.tripStatus,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to update schedule' })
  }
}

export const deleteSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(500).json({ error: 'Database connection not available' })
      return
    }

    const { id } = req.params

    await db
      .delete(schedules)
      .where(eq(schedules.id, id))

    res.status(204).send()
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete schedule' })
  }
}

/**
 * Check if a schedule is valid for a given day based on frequency, date range, and calendar type.
 * Extracted from validateScheduleDay for reuse in trip limit calculation.
 */
function isScheduleValidForDay(
  schedule: {
    frequencyType: string
    daysOfWeek: number[]
    daysOfMonth: number[]
    calendarType: string
    effectiveFrom: string | null
    effectiveTo: string | null
  },
  date: string // YYYY-MM-DD
): boolean {
  const [year, month, day] = date.split('-').map(Number)
  const checkDate = new Date(year, month - 1, day)
  checkDate.setHours(0, 0, 0, 0)

  if (schedule.effectiveFrom) {
    const from = new Date(schedule.effectiveFrom)
    from.setHours(0, 0, 0, 0)
    if (checkDate < from) return false
  }

  if (schedule.effectiveTo) {
    const to = new Date(schedule.effectiveTo)
    to.setHours(0, 0, 0, 0)
    if (checkDate > to) return false
  }

  if (schedule.frequencyType === 'daily') return true

  if (schedule.frequencyType === 'weekly') {
    const jsDay = checkDate.getDay()
    const isoDay = jsDay === 0 ? 7 : jsDay
    return schedule.daysOfWeek.length === 0 || schedule.daysOfWeek.includes(isoDay)
  }

  // specific_days
  if (schedule.daysOfMonth.length === 0) return true

  let dayInMonth = day
  if (schedule.calendarType === 'lunar') {
    const lunarInfo = LunarCalendar.solarToLunar(year, month, day)
    dayInMonth = lunarInfo.lunarDay
  }

  return schedule.daysOfMonth.includes(dayInMonth)
}

/**
 * Calculate trip limit for a vehicle on a route for a given date.
 * Shared between the API endpoint and issuePermit enforcement.
 */
export async function calculateTripLimit(
  routeId: string,
  vehiclePlateNumber: string,
  date: string // YYYY-MM-DD
): Promise<{ maxTrips: number; currentTrips: number; remaining: number; canIssue: boolean }> {
  // 1. Query active "Đi" schedules for this route
  const activeSchedules = await db!
    .select({
      frequencyType: schedules.frequencyType,
      daysOfWeek: schedules.daysOfWeek,
      daysOfMonth: schedules.daysOfMonth,
      calendarType: schedules.calendarType,
      effectiveFrom: schedules.effectiveFrom,
      effectiveTo: schedules.effectiveTo,
    })
    .from(schedules)
    .where(
      and(
        eq(schedules.routeId, routeId),
        eq(schedules.direction, 'Đi'),
        eq(schedules.isActive, true)
      )
    )

  // 2. Filter schedules valid for the given date
  const validSchedules = activeSchedules.filter((s) =>
    isScheduleValidForDay(
      {
        frequencyType: s.frequencyType,
        daysOfWeek: (s.daysOfWeek as number[]) || [],
        daysOfMonth: (s.daysOfMonth as number[]) || [],
        calendarType: s.calendarType || 'solar',
        effectiveFrom: s.effectiveFrom,
        effectiveTo: s.effectiveTo,
      },
      date
    )
  )
  const maxTrips = validSchedules.length

  // 3. Count approved dispatches for vehicle+route+date (Vietnam timezone UTC+7)
  const dayStart = new Date(`${date}T00:00:00+07:00`)
  // Use next-day midnight with lt to cover full day (avoids sub-second gap with lte T23:59:59)
  const [y, m, d] = date.split('-').map(Number)
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1) - 7 * 60 * 60 * 1000) // next day 00:00 in UTC+7

  const approvedCount = await db!
    .select({ count: sql<number>`count(*)` })
    .from(dispatchRecords)
    .where(
      and(
        eq(dispatchRecords.routeId, routeId),
        eq(dispatchRecords.vehiclePlateNumber, vehiclePlateNumber),
        eq(dispatchRecords.permitStatus, 'approved'),
        ne(dispatchRecords.status, 'cancelled'),
        gte(dispatchRecords.plannedDepartureTime, dayStart),
        lt(dispatchRecords.plannedDepartureTime, nextDay)
      )
    )

  const currentTrips = Number(approvedCount[0]?.count || 0)
  const remaining = Math.max(0, maxTrips - currentTrips)

  // maxTrips===0 means no valid schedules for this date → block
  return { maxTrips, currentTrips, remaining, canIssue: maxTrips > 0 && remaining > 0 }
}

/**
 * API handler: GET /schedules/trip-limit
 */
export const checkTripLimit = async (req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' })
    }

    const { routeId, vehiclePlateNumber, date } = req.query

    if (!routeId || typeof routeId !== 'string') {
      return res.status(400).json({ error: 'routeId is required' })
    }
    if (!vehiclePlateNumber || typeof vehiclePlateNumber !== 'string') {
      return res.status(400).json({ error: 'vehiclePlateNumber is required' })
    }
    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' })
    }

    const result = await calculateTripLimit(routeId, vehiclePlateNumber, date)
    return res.json(result)
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to check trip limit' })
  }
}

const validateDaySchema = z.object({
  scheduleId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const validateScheduleDay = async (req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' })
    }

    const parsed = validateDaySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message })
    }

    const { scheduleId, date } = parsed.data

    const data = await db
      .select({
        id: schedules.id,
        frequencyType: schedules.frequencyType,
        daysOfMonth: schedules.daysOfMonth,
        daysOfWeek: schedules.daysOfWeek,
        calendarType: schedules.calendarType,
        effectiveFrom: schedules.effectiveFrom,
        effectiveTo: schedules.effectiveTo,
      })
      .from(schedules)
      .where(eq(schedules.id, scheduleId))
      .limit(1)

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' })
    }

    const schedule = data[0]
    const daysOfMonth = (schedule.daysOfMonth as number[]) || []
    const daysOfWeek = (schedule.daysOfWeek as number[]) || []
    const calendarType = schedule.calendarType || 'solar'
    const frequencyType = schedule.frequencyType

    // Check effective date range
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)

    if (schedule.effectiveFrom) {
      const from = new Date(schedule.effectiveFrom)
      from.setHours(0, 0, 0, 0)
      if (checkDate < from) {
        return res.json({
          valid: false,
          calendarType,
          dayInMonth: 0,
          daysOfMonth,
          frequencyType,
          message: 'Biểu đồ chưa có hiệu lực',
        })
      }
    }

    if (schedule.effectiveTo) {
      const to = new Date(schedule.effectiveTo)
      to.setHours(0, 0, 0, 0)
      if (checkDate > to) {
        return res.json({
          valid: false,
          calendarType,
          dayInMonth: 0,
          daysOfMonth,
          frequencyType,
          message: 'Biểu đồ đã hết hiệu lực',
        })
      }
    }

    // Daily → always valid
    if (frequencyType === 'daily') {
      return res.json({
        valid: true,
        calendarType,
        dayInMonth: 0,
        daysOfMonth,
        frequencyType,
      })
    }

    const [year, month, day] = date.split('-').map(Number)

    // Weekly → check day of week (1=Mon..7=Sun)
    if (frequencyType === 'weekly') {
      const dateObj = new Date(year, month - 1, day)
      const jsDay = dateObj.getDay() // 0=Sun..6=Sat
      const isoDay = jsDay === 0 ? 7 : jsDay // Convert to 1=Mon..7=Sun
      const valid = daysOfWeek.length === 0 || daysOfWeek.includes(isoDay)
      return res.json({
        valid,
        calendarType,
        dayInMonth: day,
        daysOfMonth,
        frequencyType,
        message: valid ? undefined : 'Chuyến xe không được khai thác ngày này',
      })
    }

    // specific_days → check daysOfMonth (empty = always valid)
    if (daysOfMonth.length === 0) {
      return res.json({
        valid: true,
        calendarType,
        dayInMonth: 0,
        daysOfMonth,
        frequencyType,
      })
    }

    // Determine which day to check
    let dayInMonth = day

    if (calendarType === 'lunar') {
      const lunarInfo = LunarCalendar.solarToLunar(year, month, day)
      dayInMonth = lunarInfo.lunarDay
    }

    const valid = daysOfMonth.includes(dayInMonth)

    return res.json({
      valid,
      calendarType,
      dayInMonth,
      daysOfMonth,
      frequencyType,
      message: valid ? undefined : 'Chuyến xe không được khai thác ngày này',
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to validate schedule day' })
  }
}
