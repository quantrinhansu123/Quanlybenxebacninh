/**
 * Normalize raw AppSheet BieuDoChayXeChiTiet (fixed schedule) rows
 * Enrichment: must be pre-joined with THONGBAO_KHAITHAC via enrichRows() before calling normalizer
 *
 * Join config (done in SharedWorker):
 *   enrichRows(scheduleRows, notificationRows, {
 *     refKey: 'Ref_ThongBaoKhaiThac',
 *     lookupIdKey: 'ID_TB',
 *     mappings: [Ref_Tuyen, Ref_DonVi, File→TB_File, link file→TB_LinkFile, …]
 *   })
 */
import {
  pickString,
  parseDateValue,
  parseTimeValue,
  parseIntArray,
  DEFAULT_DAYS_OF_WEEK,
  extractAppSheetCellString,
} from './appsheet-sync-utils'
import { expandAppSheetFileRefToHttps } from '@/utils/appsheet-table-file-url'
import { normalizePdfHref } from '@/utils/pdf-href'

export interface NormalizedAppSheetSchedule {
  firebaseId: string
  routeFirebaseId: string | null
  routeCode: string | null
  /** Ref_Tuyen trên dòng TB sau enrich (đối chiếu mã tuyến) */
  tbRefTuyen: string | null
  operatorFirebaseId: string | null
  operatorCode: string | null
  scheduleCode: string | null
  departureTime: string
  direction: string
  frequencyType: 'daily' | 'weekly' | 'specific_days'
  daysOfWeek: number[]
  daysOfMonth: number[]
  calendarType: string
  effectiveFrom: string
  notificationNumber: string | null
  /** URL PDF: TB_File sau enrich (Ref→ID_TB); merge PDF theo Ref/ID_TB + SoThongBao trong sync-utils */
  notificationFileUrl: string | null
  tripStatus: string
}

// Key arrays — AppSheet FE (notification keys khác BE, xem NOTIFICATION_KEYS)
const ID_KEYS = ['firebase_id', 'firebaseId', 'ID_NutChay', 'id', 'schedule_id', 'ID_GioChay']
const ROUTE_ID_KEYS = ['route_fb_id', 'routeFbId', 'route_firebase_id', 'Ref_Tuyen', 'TuyenBuyt']
const ROUTE_CODE_KEYS = ['route_code', 'routeCode', 'MaTuyen', 'SoHieuTuyen', 'Ref_Tuyen']
const OPERATOR_ID_KEYS = [
  'operator_fb_id',
  'operatorFbId',
  'Ref_DonVi',
  'operator_firebase_id',
  'DonViKhaiThac',
]
const OPERATOR_CODE_KEYS = ['operator_code', 'operatorCode', 'MaDonVi']
const TIME_KEYS = ['departure_time', 'departureTime', 'GioXuatBen']
const DIRECTION_KEYS = ['direction', 'Chieu']
const FREQUENCY_KEYS = ['frequency_type', 'frequencyType']
const DAYS_OF_WEEK_KEYS = ['days_of_week', 'daysOfWeek']
const DAYS_OF_MONTH_KEYS = ['days_of_month', 'daysOfMonth', 'NgayHoatDong']
const CALENDAR_KEYS = ['calendar_type', 'calendarType', 'LoaiNgay']
const EFFECTIVE_FROM_KEYS = [
  'effective_from',
  'effectiveFrom',
  'NgayBanHanh',
  'ngay_ban_hanh',
  'NgayApDung',
]
const TRIP_STATUS_KEYS = ['trip_status', 'tripStatus', 'TrangThaiChuyen']

/**
 * AppSheet BieuDo: ưu tiên Ref_ThongBaoKhaiThac (khớp ID_TB THONGBAO), sau đó SoThongBao sau enrich.
 * (Khác với BE gtvt-normalize — chỉ áp dụng pipeline FE AppSheet.)
 */
const NOTIFICATION_KEYS = [
  'Ref_ThongBaoKhaiThac',
  'ref_ThongBaoKhaiThac',
  'SoThongBao',
  'so_thong_bao',
  'notification_number',
  'notificationNumber',
  'QD_KhaiThac',
]

/** Ref_Tuyen từ THONGBAO_KHAITHAC sau enrichRows (cùng key với route code cố định) */
const TB_REF_TUYEN_KEYS = ['Ref_Tuyen', 'ref_Tuyen', 'ref_tuyen']

/** PDF: TB_* sau enrich, rồi File / link; cuối cùng quét ô có chuỗi http / drive / .pdf */
const NOTICE_FILE_URL_KEYS = [
  'TB_File',
  'TB_LinkFile',
  'File',
  'file',
  'link file',
  'Link file',
  'URL',
  'url',
  'Link',
  'link',
]

function pickNoticeFileUrlFromRow(row: Record<string, unknown>): string | null {
  /** Không thêm https:// chỉ vì có .pdf — đường dẫn AppSheet *_Files_/… sẽ bị hỏng */
  const urlFrom = (t: string): string | null => {
    if (!t) return null
    if (/^https?:\/\//i.test(t)) return t
    if (t.startsWith('//')) return `https:${t}`
    if (/^www\./i.test(t)) return `https://${t}`
    if (/drive\.google\.com|docs\.google\.com/i.test(t)) {
      return /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, '')}`
    }
    return null
  }
  const storagePathFrom = (t: string): string | null => {
    const s = t.trim()
    if (!s) return null
    if (/_Files_\//i.test(s)) return s
    if (/\.(pdf|png|jpe?g|gif|webp)$/i.test(s) && !s.includes('://') && !s.startsWith('//')) return s
    return null
  }
  for (const key of NOTICE_FILE_URL_KEYS) {
    const t = extractAppSheetCellString(row[key])
    if (!t) continue
    const u = urlFrom(t.trim())
    if (u) return u
    const sp = storagePathFrom(t)
    if (sp) return sp
  }
  for (const v of Object.values(row)) {
    const t = extractAppSheetCellString(v)
    if (!t) continue
    const u = urlFrom(t.trim())
    if (u) return u
    const sp = storagePathFrom(t)
    if (sp) return sp
  }
  return null
}

const normalizeDirection = (value: string | null): string => {
  const n = (value || '').trim().toLowerCase()
  if (n === 'về' || n === 've') return 'Về'
  return 'Đi'
}

const normalizeCalendarType = (value: string | null): string => {
  const n = (value || '').trim().toLowerCase()
  if (n.includes('âm') || n.includes('am') || n === 'lunar') return 'lunar'
  return 'solar'
}

const normalizeFrequencyType = (
  value: string | null,
  daysOfWeek: number[],
  daysOfMonth: number[],
): 'daily' | 'weekly' | 'specific_days' => {
  const n = (value || '').trim().toLowerCase()
  if (n === 'daily') return 'daily'
  if (n === 'weekly') return 'weekly'
  if (n === 'specific_days') return 'specific_days'
  if (daysOfMonth.length > 0 && daysOfMonth.length < 28) return 'specific_days'
  if (daysOfWeek.length > 0 && daysOfWeek.length < 7) return 'weekly'
  return 'daily'
}

export const buildScheduleCode = (
  routeCode: string,
  direction: string,
  departureTime: string,
  suffix?: number,
): string => {
  const cleanedRouteCode = routeCode.replace(/[^A-Za-z0-9-]/g, '').toUpperCase() || 'UNKNOWN'
  const dirCode = direction === 'Về' ? 'V' : 'D'
  const timeCode = departureTime.replace(':', '')
  const baseCode = `BDG-${cleanedRouteCode}-${dirCode}-${timeCode}`
  if (!suffix || suffix <= 1) return baseCode
  return `${baseCode}-${suffix}`
}

/**
 * Normalize fixed schedule rows (BieuDoChayXeChiTiet)
 * MUST be enriched with THONGBAO_KHAITHAC (via enrichRows) before calling this
 */
export function normalizeScheduleRows(
  rawRows: Record<string, unknown>[],
): NormalizedAppSheetSchedule[] {
  const rows: NormalizedAppSheetSchedule[] = []
  const seen = new Set<string>()

  for (const item of rawRows) {
    if (!item || typeof item !== 'object') continue

    const firebaseId = pickString(item, ID_KEYS)
    if (!firebaseId || seen.has(firebaseId)) continue

    const departureTime = parseTimeValue(pickString(item, TIME_KEYS))
    if (!departureTime) continue

    seen.add(firebaseId)

    const daysOfWeek = parseIntArray(
      item[DAYS_OF_WEEK_KEYS[0]] ?? item[DAYS_OF_WEEK_KEYS[1]],
      1,
      7,
    )
    const daysOfMonth = parseIntArray(
      item[DAYS_OF_MONTH_KEYS[0]] ??
        item[DAYS_OF_MONTH_KEYS[1]] ??
        item[DAYS_OF_MONTH_KEYS[2]],
      1,
      31,
    )
    const direction = normalizeDirection(pickString(item, DIRECTION_KEYS))
    const calendarType = normalizeCalendarType(pickString(item, CALENDAR_KEYS))
    const frequencyType = normalizeFrequencyType(
      pickString(item, FREQUENCY_KEYS),
      daysOfWeek,
      daysOfMonth,
    )

    rows.push({
      firebaseId,
      routeFirebaseId: pickString(item, ROUTE_ID_KEYS),
      routeCode: pickString(item, ROUTE_CODE_KEYS),
      tbRefTuyen: pickString(item, TB_REF_TUYEN_KEYS),
      operatorFirebaseId: pickString(item, OPERATOR_ID_KEYS),
      operatorCode: pickString(item, OPERATOR_CODE_KEYS),
      scheduleCode: null, // generated by backend during upsert
      departureTime,
      direction,
      frequencyType,
      daysOfWeek:
        daysOfWeek.length > 0
          ? daysOfWeek
          : frequencyType === 'daily'
            ? DEFAULT_DAYS_OF_WEEK
            : [],
      daysOfMonth,
      calendarType,
      effectiveFrom: parseDateValue(pickString(item, EFFECTIVE_FROM_KEYS)) || '2025-01-01',
      notificationNumber: pickString(item, NOTIFICATION_KEYS),
      notificationFileUrl: (() => {
        const raw = pickNoticeFileUrlFromRow(item)
        if (!raw?.trim()) return null
        const ex = expandAppSheetFileRefToHttps(raw) || normalizePdfHref(raw)
        return /^https?:\/\//i.test(ex) ? ex : null
      })(),
      tripStatus: pickString(item, TRIP_STATUS_KEYS) || 'Hoạt động',
    })
  }

  return rows
}
