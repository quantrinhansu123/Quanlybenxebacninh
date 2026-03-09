import { isRecord } from '../utils/type-guards.js'
import {
  pickString,
  parseDateValue,
  parseTimeValue,
  parseIntArray,
  DEFAULT_DAYS_OF_WEEK,
} from './gtvt-sync-utils.js'
import type { GtvtNormalizedSchedule, GtvtSyncErrorItem } from '../types/gtvt-sync.types.js'

const SCHEDULE_ID_KEYS = ['firebase_id', 'firebaseId', 'ID_NutChay', 'id', 'schedule_id', 'ID_GioChay']
const SCHEDULE_CODE_KEYS = ['schedule_code', 'scheduleCode', 'MaBieuDo']
const SCHEDULE_ROUTE_ID_KEYS = ['route_fb_id', 'routeFbId', 'route_firebase_id', 'Ref_Tuyen', 'TuyenBuyt']
const SCHEDULE_ROUTE_CODE_KEYS = ['route_code', 'routeCode', 'MaTuyen', 'SoHieuTuyen', 'Ref_Tuyen']
const SCHEDULE_OPERATOR_ID_KEYS = ['operator_fb_id', 'operatorFbId', 'Ref_DonVi', 'operator_firebase_id', 'DonViKhaiThac']
const SCHEDULE_OPERATOR_CODE_KEYS = ['operator_code', 'operatorCode', 'MaDonVi']
const SCHEDULE_TIME_KEYS = ['departure_time', 'departureTime', 'GioXuatBen']
const SCHEDULE_DIRECTION_KEYS = ['direction', 'Chieu']
const SCHEDULE_FREQUENCY_KEYS = ['frequency_type', 'frequencyType']
const SCHEDULE_DAYS_OF_WEEK_KEYS = ['days_of_week', 'daysOfWeek']
const SCHEDULE_DAYS_OF_MONTH_KEYS = ['days_of_month', 'daysOfMonth', 'NgayHoatDong']
const SCHEDULE_CALENDAR_KEYS = ['calendar_type', 'calendarType', 'LoaiNgay']
const SCHEDULE_EFFECTIVE_FROM_KEYS = ['effective_from', 'effectiveFrom', 'NgayBanHanh', 'ngay_ban_hanh', 'NgayApDung']
const SCHEDULE_NOTIFICATION_KEYS = ['notification_number', 'notificationNumber', 'SoThongBao', 'QD_KhaiThac']
const SCHEDULE_TRIP_STATUS_KEYS = ['trip_status', 'tripStatus', 'TrangThaiChuyen']

const normalizeDirection = (value: string | null): string => {
  const normalized = (value || '').trim().toLowerCase()
  if (normalized === 'về' || normalized === 've') return 'Về'
  return 'Đi'
}

const normalizeCalendarType = (value: string | null): string => {
  const normalized = (value || '').trim().toLowerCase()
  if (normalized.includes('âm') || normalized.includes('am') || normalized === 'lunar') return 'lunar'
  return 'solar'
}

const normalizeFrequencyType = (value: string | null, daysOfWeek: number[], daysOfMonth: number[]): 'daily' | 'weekly' | 'specific_days' => {
  const normalized = (value || '').trim().toLowerCase()
  if (normalized === 'daily') return 'daily'
  if (normalized === 'weekly') return 'weekly'
  if (normalized === 'specific_days') return 'specific_days'
  if (daysOfMonth.length > 0 && daysOfMonth.length < 28) return 'specific_days'
  if (daysOfWeek.length > 0 && daysOfWeek.length < 7) return 'weekly'
  return 'daily'
}

export const buildScheduleCode = (routeCode: string, direction: string, departureTime: string, suffix?: number): string => {
  const cleanedRouteCode = routeCode.replace(/[^A-Za-z0-9-]/g, '').toUpperCase() || 'UNKNOWN'
  const dirCode = direction === 'Về' ? 'V' : 'D'
  const timeCode = departureTime.replace(':', '')
  const baseCode = `BDG-${cleanedRouteCode}-${dirCode}-${timeCode}`
  if (!suffix || suffix <= 1) return baseCode
  return `${baseCode}-${suffix}`
}

export function normalizeGtvtSchedules(
  rawRows: Record<string, unknown>[]
): { rows: GtvtNormalizedSchedule[]; errors: GtvtSyncErrorItem[]; seenFirebaseIds: string[] } {
  const rows: GtvtNormalizedSchedule[] = []
  const errors: GtvtSyncErrorItem[] = []
  const seenFirebaseIds = new Set<string>()

  rawRows.forEach((item, index) => {
    if (!isRecord(item)) return

    const firebaseId = pickString(item, SCHEDULE_ID_KEYS)
    if (!firebaseId) {
      errors.push({ entity: 'schedule', key: `row-${index + 1}`, message: 'Missing schedule firebase id' })
      return
    }
    seenFirebaseIds.add(firebaseId)

    const departureTime = parseTimeValue(pickString(item, SCHEDULE_TIME_KEYS))
    if (!departureTime) {
      errors.push({ entity: 'schedule', key: firebaseId, message: 'Invalid or missing departure time' })
      return
    }

    const daysOfWeek = parseIntArray(item[SCHEDULE_DAYS_OF_WEEK_KEYS[0]] ?? item[SCHEDULE_DAYS_OF_WEEK_KEYS[1]], 1, 7)
    const daysOfMonth = parseIntArray(item[SCHEDULE_DAYS_OF_MONTH_KEYS[0]] ?? item[SCHEDULE_DAYS_OF_MONTH_KEYS[1]] ?? item[SCHEDULE_DAYS_OF_MONTH_KEYS[2]], 1, 31)
    const direction = normalizeDirection(pickString(item, SCHEDULE_DIRECTION_KEYS))
    const calendarType = normalizeCalendarType(pickString(item, SCHEDULE_CALENDAR_KEYS))
    const frequencyType = normalizeFrequencyType(pickString(item, SCHEDULE_FREQUENCY_KEYS), daysOfWeek, daysOfMonth)

    rows.push({
      firebaseId,
      routeFirebaseId: pickString(item, SCHEDULE_ROUTE_ID_KEYS),
      routeCode: pickString(item, SCHEDULE_ROUTE_CODE_KEYS),
      operatorFirebaseId: pickString(item, SCHEDULE_OPERATOR_ID_KEYS),
      operatorCode: pickString(item, SCHEDULE_OPERATOR_CODE_KEYS),
      scheduleCode: pickString(item, SCHEDULE_CODE_KEYS),
      departureTime,
      direction,
      frequencyType,
      daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : (frequencyType === 'daily' ? DEFAULT_DAYS_OF_WEEK : []),
      daysOfMonth,
      calendarType,
      effectiveFrom: parseDateValue(pickString(item, SCHEDULE_EFFECTIVE_FROM_KEYS)) || '2025-01-01',
      notificationNumber: pickString(item, SCHEDULE_NOTIFICATION_KEYS),
      tripStatus: pickString(item, SCHEDULE_TRIP_STATUS_KEYS) || 'Hoạt động',
      metadata: {
        provider: 'gtvt-appsheet',
      },
    })
  })

  return { rows, errors, seenFirebaseIds: [...seenFirebaseIds] }
}
