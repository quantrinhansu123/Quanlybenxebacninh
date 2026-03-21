/**
 * Join path: route_code ↔ THONGBAO_KHAITHAC.Ref_Tuyen → ID_TB
 * then BieuDoChayXeChiTiet.Ref_ThongBaoKhaiThac ∈ ID_TB, Chieu = Đi, time from GioXuatBen (via normalizer).
 */
import { toLookupKey, pickString } from '@/services/appsheet-sync-utils'

const REF_TUYEN_ON_NOTICE_KEYS = ['Ref_Tuyen', 'ref_Tuyen', 'ref_tuyen']
const ID_TB_KEYS = ['ID_TB', 'id_tb', 'Id_TB']
const REF_TB_ON_SCHEDULE_KEYS = ['Ref_ThongBaoKhaiThac', 'ref_ThongBaoKhaiThac', 'Ref_thongbao_khaithac']
const CHIEU_KEYS = ['Chieu', 'chieu', 'direction', 'Direction']

/** ID_TB values from notifications whose Ref_Tuyen matches route_code (trim, upper). */
export function collectNoticeTbIdsForRouteCode(
  notificationRows: Record<string, unknown>[],
  routeCode: string,
): Set<string> {
  const want = toLookupKey(routeCode)
  const set = new Set<string>()
  if (!want) return set

  for (const row of notificationRows) {
    const refTuyen = toLookupKey(pickString(row, REF_TUYEN_ON_NOTICE_KEYS) || '')
    if (refTuyen !== want) continue
    const idTb = toLookupKey(pickString(row, ID_TB_KEYS) || '')
    if (idTb) set.add(idTb)
  }
  return set
}

function rowRefThongBaoKhaiThac(row: Record<string, unknown>): string {
  for (const key of REF_TB_ON_SCHEDULE_KEYS) {
    const v = row[key]
    if (v === undefined || v === null) continue
    const s = String(v).trim()
    if (s) return toLookupKey(s)
  }
  return ''
}

const normChieu = (s: string) => (s || '').trim().toUpperCase()

/** Chieu / direction = Đi (align with useCapPhepDialog normKey + "DI"). */
export function rowIsChieuDi(row: Record<string, unknown>): boolean {
  const raw = pickString(row, CHIEU_KEYS)
  if (!raw) return false
  const k = normChieu(raw)
  return k === normChieu('Đi') || k === normChieu('DI')
}

/**
 * Fixed-schedule rows (BieuDoChayXeChiTiet) linked to the route via TB chain, chiều Đi only.
 * Caller should run enrichRows(..., notifications, ...) then normalizeScheduleRows.
 */
export function filterFixedRowsByTbRouteAndChieuDi(
  fixedRows: Record<string, unknown>[],
  notificationRows: Record<string, unknown>[],
  routeCode: string,
): Record<string, unknown>[] {
  const idSet = collectNoticeTbIdsForRouteCode(notificationRows, routeCode)
  if (idSet.size === 0) return []

  return fixedRows.filter((row) => {
    const refTb = rowRefThongBaoKhaiThac(row)
    if (!refTb || !idSet.has(refTb)) return false
    return rowIsChieuDi(row)
  })
}
