import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { dispatchRecords } from '../db/schema/index.js'
import { eq, and, gte, lt, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import LunarCalendar from 'lunar-calendar'
import { fetchSchedulesWithRelations, mapScheduleDbRowToApi } from '../services/schedule-query.service.js'

export const getAllSchedules = async (req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' })
    }

    const { routeId, operatorId, isActive, direction } = req.query

    const rows = await fetchSchedulesWithRelations({
      routeId: routeId ? String(routeId) : undefined,
      operatorId: operatorId ? String(operatorId) : undefined,
      direction: direction ? String(direction) : undefined,
      activeOnly: isActive === undefined ? undefined : isActive === 'true',
    })

    const result = rows
      .map(mapScheduleDbRowToApi)
      .sort((a, b) => a.departureTime.localeCompare(b.departureTime, 'vi'))

    res.setHeader('Cache-Control', 'private, no-store')
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
    const rows = await fetchSchedulesWithRelations({ scheduleId: id })
    if (!rows.length) {
      return res.status(404).json({ error: 'Schedule not found' })
    }

    return res.json(mapScheduleDbRowToApi(rows[0]!))
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to fetch schedule' })
  }
}

export const createSchedule = async (_req: Request, res: Response) => {
  return res.status(501).json({
    error: 'Bảng schedules chỉ đồng bộ từ AppSheet. Dùng "Thêm data AppSheet" hoặc import GTVT.',
  })
}

export const updateSchedule = async (_req: Request, res: Response) => {
  return res.status(501).json({
    error: 'Bảng schedules chỉ đồng bộ từ AppSheet.',
  })
}

export const deleteSchedule = async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: 'Bảng schedules chỉ đồng bộ từ AppSheet.' })
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
  const activeSchedules = (
    await fetchSchedulesWithRelations({
      routeId,
      direction: 'Đi',
      activeOnly: true,
    })
  ).map(mapScheduleDbRowToApi)

  const validSchedules = activeSchedules.filter((s) =>
    isScheduleValidForDay(
      {
        frequencyType: s.frequencyType,
        daysOfWeek: s.daysOfWeek || [],
        daysOfMonth: s.daysOfMonth || [],
        calendarType: s.calendarType || 'solar',
        effectiveFrom: s.effectiveFrom || null,
        effectiveTo: s.effectiveTo || null,
      },
      date,
    ),
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

  // maxTrips===0 means no valid schedules for this date → canIssue false (chỉ cảnh báo UI; cấp phép không chặn theo trip limit ở dispatch.controller)
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

    const rows = await fetchSchedulesWithRelations({ scheduleId })
    if (!rows.length) {
      return res.status(404).json({ error: 'Schedule not found' })
    }

    const schedule = mapScheduleDbRowToApi(rows[0]!)
    const daysOfMonth = schedule.daysOfMonth || []
    const daysOfWeek = schedule.daysOfWeek || []
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
