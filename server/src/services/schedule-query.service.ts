import { db } from '../db/drizzle.js'
import { sql } from 'drizzle-orm'

export type ScheduleDbRow = {
  id: string
  id_nut_chay: string | null
  ref_thongbao_khaithac: string | null
  so_thong_bao: string | null
  chieu: string | null
  gio_xuat_ben: string | null
  ngay_hoat_dong: number[] | null
  loai_ngay: string | null
  trang_thai_chuyen: string | null
  ghi_chu: string | null
  thoi_gian_nhap: string | null
  so_chuyen_thang_ct: string | null
  ngay_bi_ngung: string | null
  ngay_hoat_dong_goc: string | null
  metadata: Record<string, unknown> | null
  created_at: Date | string | null
  updated_at: Date | string | null
  route_id: string | null
  route_code: string | null
  route_code_old: string | null
  route_type: string | null
  operator_id: string | null
  operator_name: string | null
  operator_code: string | null
  notice_issue_date: string | null
  notice_effective_date: string | null
}

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

function normalizeDepartureTime(raw: string | null | undefined): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return s
  return `${m[1]!.padStart(2, '0')}:${m[2]!}`
}

function parseDaysFromGoc(raw: string | null | undefined): number[] {
  const s = String(raw || '').trim()
  if (!s) return []
  return Array.from(
    new Set(
      s
        .split(/[,;]/)
        .map((part) => parseInt(part.trim(), 10))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31),
    ),
  ).sort((a, b) => a - b)
}

function mapCalendarType(loaiNgay: string | null | undefined): string {
  const s = String(loaiNgay || '').trim()
  if (!s) return 'solar'
  return s.includes('Âm') || s.toLowerCase().includes('lunar') ? 'lunar' : 'solar'
}

function mapFrequencyType(daysOfMonth: number[]): 'daily' | 'weekly' | 'specific_days' {
  if (daysOfMonth.length >= 28) return 'daily'
  if (daysOfMonth.length > 0) return 'specific_days'
  return 'weekly'
}

function isScheduleActive(trangThai: string | null | undefined): boolean {
  const s = String(trangThai || '').trim().toLowerCase()
  if (!s) return true
  if (s.includes('ngừng') || s.includes('ngung') || s.includes('dừng') || s.includes('dung')) return false
  return true
}

export function mapScheduleDbRowToApi(row: ScheduleDbRow) {
  const daysFromJson = Array.isArray(row.ngay_hoat_dong) ? row.ngay_hoat_dong : []
  const daysOfMonth = daysFromJson.length > 0 ? daysFromJson : parseDaysFromGoc(row.ngay_hoat_dong_goc)
  const displayRouteCode = getDisplayRouteCode(row.route_code, row.route_code_old, row.route_type)
  const departureTime = normalizeDepartureTime(row.gio_xuat_ben)
  const scheduleMeta = {
    ID_NutChay: row.id_nut_chay,
    Ref_ThongBaoKhaiThac: row.ref_thongbao_khaithac,
    SoThongBao: row.so_thong_bao,
    Chieu: row.chieu,
    GioXuatBen: departureTime,
    NgayHoatDong: row.ngay_hoat_dong_goc,
    NgayHoatDongGoc: row.ngay_hoat_dong_goc,
    LoaiNgay: row.loai_ngay,
    TrangThaiChuyen: row.trang_thai_chuyen,
    GhiChu: row.ghi_chu,
    ThoiGianNhap: row.thoi_gian_nhap,
    SoChuyen_Thang_CT: row.so_chuyen_thang_ct,
    NgayBiNgung: row.ngay_bi_ngung,
  }

  return {
    id: row.id,
    scheduleCode: row.id_nut_chay || row.id,
    routeId: row.route_id || '',
    route: row.route_id
      ? {
          id: row.route_id,
          routeCode: displayRouteCode,
          routeName: displayRouteCode,
        }
      : undefined,
    operatorId: row.operator_id || '',
    operator: row.operator_id
      ? {
          id: row.operator_id,
          name: row.operator_name || '',
          code: row.operator_code || undefined,
        }
      : undefined,
    departureTime,
    frequencyType: mapFrequencyType(daysOfMonth),
    daysOfWeek: daysOfMonth.length >= 28 ? [1, 2, 3, 4, 5, 6, 7] : [],
    effectiveFrom: row.notice_issue_date || row.notice_effective_date || '',
    effectiveTo: row.ngay_bi_ngung || undefined,
    isActive: isScheduleActive(row.trang_thai_chuyen),
    direction: row.chieu || undefined,
    daysOfMonth,
    calendarType: mapCalendarType(row.loai_ngay),
    notificationNumber: row.so_thong_bao || undefined,
    refThongBaoKhaiThac: row.ref_thongbao_khaithac || undefined,
    tripStatus: row.trang_thai_chuyen || undefined,
    metadata: {
      ...(row.metadata && typeof row.metadata === 'object' ? row.metadata : {}),
      schedule_meta: scheduleMeta,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchSchedulesWithRelations(filters: {
  routeId?: string
  operatorId?: string
  direction?: string
  activeOnly?: boolean
  scheduleId?: string
}): Promise<ScheduleDbRow[]> {
  if (!db) throw new Error('Database connection not available')

  const clauses = [sql`TRUE`]
  if (filters.scheduleId) {
    clauses.push(sql`s.id = ${filters.scheduleId}::uuid`)
  }
  if (filters.routeId) {
    clauses.push(sql`r.id = ${filters.routeId}::uuid`)
  }
  if (filters.operatorId) {
    clauses.push(sql`o.id = ${filters.operatorId}::uuid`)
  }
  if (filters.direction) {
    clauses.push(sql`s."Chieu" = ${filters.direction}`)
  }
  if (filters.activeOnly) {
    clauses.push(sql`COALESCE(s."TrangThaiChuyen", '') ILIKE '%hoạt động%' OR COALESCE(s."TrangThaiChuyen", '') = ''`)
  }

  const whereSql = sql.join(clauses, sql` AND `)

  const rows = await db.execute(sql`
    SELECT DISTINCT ON (s.id)
      s.id,
      s."ID_NutChay" AS id_nut_chay,
      s."Ref_ThongBaoKhaiThac" AS ref_thongbao_khaithac,
      s."SoThongBao" AS so_thong_bao,
      s."Chieu" AS chieu,
      s."GioXuatBen" AS gio_xuat_ben,
      s."NgayHoatDong" AS ngay_hoat_dong,
      s."LoaiNgay" AS loai_ngay,
      s."TrangThaiChuyen" AS trang_thai_chuyen,
      s."GhiChu" AS ghi_chu,
      s."ThoiGianNhap" AS thoi_gian_nhap,
      s."SoChuyen_Thang_CT" AS so_chuyen_thang_ct,
      s."NgayBiNgung" AS ngay_bi_ngung,
      s."NgayHoatDongGoc" AS ngay_hoat_dong_goc,
      s.metadata,
      s.created_at,
      s.updated_at,
      r.id AS route_id,
      r.route_code,
      r.route_code_old,
      r.route_type,
      o.id AS operator_id,
      o.name AS operator_name,
      o.code AS operator_code,
      n.issue_date AS notice_issue_date,
      n.effective_date AS notice_effective_date
    FROM schedules s
    LEFT JOIN operation_notices n
      ON s."Ref_ThongBaoKhaiThac" IS NOT NULL
      AND n.file_path ILIKE '%' || s."Ref_ThongBaoKhaiThac" || '%'
    LEFT JOIN routes r ON UPPER(TRIM(r.route_code)) = UPPER(TRIM(n.route_code))
    LEFT JOIN operators o ON TRIM(o.firebase_id) = TRIM(n.operator_ref)
    WHERE ${whereSql}
    ORDER BY s.id, n.issue_date DESC NULLS LAST, s."GioXuatBen"
  `)

  return rows as unknown as ScheduleDbRow[]
}
