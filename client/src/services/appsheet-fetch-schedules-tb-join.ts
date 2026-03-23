/**
 * Điều độ — biểu đồ giờ cố định:
 * mã tuyến (route_code) khớp THONGBAO_KHAITHAC.Ref_Tuyen → ID_TB;
 * BieuDoChayXeChiTiet.Ref_ThongBaoKhaiThac = ID_TB; Chieu = Đi; giờ từ GioXuatBen (normalize).
 */
import { DOC_TB } from '@/config/appsheet-schedule-chain-docs'
import { fetchAppsheetTableWithChainDoc } from '@/services/appsheet-fetch-table-with-doc'
import {
  enrichRows,
  applyThongBaoFileBySoThongBao,
  mergeThongBaoPdfIntoNormalizedSchedules,
} from '@/services/appsheet-sync-utils'
import {
  normalizeScheduleRows,
  buildScheduleCode,
  type NormalizedAppSheetSchedule,
} from '@/services/appsheet-normalize-schedules'
import {
  collectNoticeTbIdsForRouteCode,
  filterFixedRowsByTbRouteAndChieuDi,
} from '@/services/appsheet-tb-schedule-join'
import type { Operator, Schedule } from '@/types'
import type { AppSheetScheduleProgressReporter } from '@/types/appsheet-schedule-progress'

export interface FetchTbJoinSchedulesParams {
  routeId: string
  routeCode: string
  operatorId?: string
  operators: Operator[]
  onProgress?: AppSheetScheduleProgressReporter
}

/** Số liệu từng bước — để UI chỉ ra bước nào thiếu/khớp */
export interface TbJoinScheduleDiagnostics {
  routeCode: string
  fixedRowCount: number
  notificationRowCount: number
  /** Số ID_TB từ THONGBAO có Ref_Tuyen = route_code */
  idTbMatchingRouteCount: number
  /** Dòng BieuDo sau lọc Ref_ThongBaoKhaiThac ∈ ID_TB và Chieu=Đi */
  tbFilteredRowCount: number
  /** Sau normalize (trước lọc mã ĐV) */
  normalizedAfterNormalizeCount: number
  /** Sau lọc theo mã đơn vị (nếu có) */
  afterOperatorFilterCount: number
  /** Số lịch gán được operator → hiển thị dropdown */
  resolvedForDropdownCount: number
}

export interface FetchTbJoinSchedulesResult {
  tbFilteredRawCount: number
  resolvedSchedules: Schedule[]
  /** Payload cho POST /vehicles/schedules/appsheet-sync */
  normalizedForSync: NormalizedAppSheetSchedule[]
  diagnostics: TbJoinScheduleDiagnostics
}

const normKey = (s?: string | null) => (s || '').trim().toUpperCase()

export async function fetchSchedulesFromAppsheetTbJoin(
  params: FetchTbJoinSchedulesParams,
): Promise<FetchTbJoinSchedulesResult> {
  const { routeId: rid, routeCode, operatorId: opId, operators, onProgress: r } = params
  const operatorCode = opId ? operators.find((o) => o.id === opId)?.code?.trim() || '' : ''

  const [fixedRows, notificationsRows] = await Promise.all([
    fetchAppsheetTableWithChainDoc(
      'fixedSchedules',
      'tb-fixed',
      '① BieuDoChayXeChiTiet',
      DOC_TB.fixedLoad,
      r,
    ),
    fetchAppsheetTableWithChainDoc(
      'notifications',
      'tb-notifications',
      '② THONGBAO_KHAITHAC',
      DOC_TB.notificationsLoad(routeCode),
      r,
    ),
  ])

  const filterDoc = DOC_TB.filterTb(routeCode)
  r?.({
    id: 'tb-filter',
    label: '③ Lọc nút chạy theo TB + chiều Đi',
    phase: 'start',
    detail: filterDoc,
  })
  const tbFiltered = filterFixedRowsByTbRouteAndChieuDi(fixedRows, notificationsRows, routeCode)
  const idTbForRoute = collectNoticeTbIdsForRouteCode(notificationsRows, routeCode)
  r?.({
    id: 'tb-filter',
    label: '③ Lọc nút chạy theo TB + chiều Đi',
    phase: 'done',
    detail: `${filterDoc}\n\n→ ${tbFiltered.length} dòng nút chạy khớp TB + chiều Đi (ID_TB khớp tuyến: ${idTbForRoute.size}).`,
  })

  if (tbFiltered.length === 0) {
    return {
      tbFilteredRawCount: 0,
      resolvedSchedules: [],
      normalizedForSync: [],
      diagnostics: {
        routeCode,
        fixedRowCount: fixedRows.length,
        notificationRowCount: notificationsRows.length,
        idTbMatchingRouteCount: idTbForRoute.size,
        tbFilteredRowCount: 0,
        normalizedAfterNormalizeCount: 0,
        afterOperatorFilterCount: 0,
        resolvedForDropdownCount: 0,
      },
    }
  }

  r?.({
    id: 'tb-enrich',
    label: '④ Ghép TB vào dòng đã lọc',
    phase: 'start',
    detail: DOC_TB.enrich,
  })
  const enriched = enrichRows(tbFiltered, notificationsRows, {
    refKey: 'Ref_ThongBaoKhaiThac',
    lookupIdKey: 'ID_TB',
    mappings: [
      { from: 'Ref_Tuyen', to: 'Ref_Tuyen' },
      { from: 'Ref_DonVi', to: 'Ref_DonVi' },
      { from: 'SoThongBao', to: 'SoThongBao' },
      { from: 'so_thong_bao', to: 'SoThongBao' },
      { from: 'link file', to: 'TB_LinkFile' },
      { from: 'Link file', to: 'TB_LinkFile' },
      { from: 'File', to: 'TB_File' },
    ],
  })

  r?.({
    id: 'tb-enrich',
    label: '④ Ghép TB vào dòng đã lọc',
    phase: 'done',
    detail: `${DOC_TB.enrich}\n\n→ Đã ghép Ref_Tuyen, Ref_DonVi từ TB vào ${enriched.length} dòng.`,
  })

  r?.({
    id: 'tb-normalize',
    label: '⑤ Chuẩn hóa (GioXuatBen, Chieu)',
    phase: 'start',
    detail: DOC_TB.normalize,
  })
  const fixedNormalized = mergeThongBaoPdfIntoNormalizedSchedules(
    normalizeScheduleRows(
      applyThongBaoFileBySoThongBao(
        enriched as Record<string, unknown>[],
        notificationsRows as Record<string, unknown>[],
      ),
    ) as NormalizedAppSheetSchedule[],
    notificationsRows as Record<string, unknown>[],
  )
  r?.({
    id: 'tb-normalize',
    label: '⑤ Chuẩn hóa (GioXuatBen, Chieu)',
    phase: 'done',
    detail: `${DOC_TB.normalize}\n\n→ ${fixedNormalized.length} lịch (trước lọc đơn vị).`,
  })

  const opDoc = DOC_TB.operatorFilter(operatorCode)
  r?.({
    id: 'tb-operator',
    label: '⑥ Lọc đơn vị + gán operator',
    phase: 'start',
    detail: opDoc,
  })
  const filtered = fixedNormalized.filter((s) => {
    const dirOk = normKey(s.direction) === normKey('Đi') || normKey(s.direction) === normKey('DI')
    if (!dirOk) return false
    if (!operatorCode) return true
    if (!s.operatorCode) return false
    return normKey(s.operatorCode) === normKey(operatorCode)
  })

  const resolvedSchedules: Schedule[] = []
  for (const s of filtered) {
    const resolvedOperatorId =
      opId ||
      (s.operatorCode ? operators.find((o) => normKey(o.code) === normKey(s.operatorCode))?.id : undefined)
    if (!resolvedOperatorId) continue

    resolvedSchedules.push({
      id: s.firebaseId,
      scheduleCode: s.scheduleCode || buildScheduleCode(routeCode, s.direction, s.departureTime),
      routeId: rid,
      operatorId: resolvedOperatorId,
      departureTime: s.departureTime,
      frequencyType: s.frequencyType,
      daysOfWeek: s.daysOfWeek,
      effectiveFrom: s.effectiveFrom,
      effectiveTo: undefined,
      isActive: true,
      direction: s.direction,
      daysOfMonth: s.daysOfMonth,
      calendarType: s.calendarType,
      notificationNumber: s.notificationNumber ?? undefined,
      notificationFileUrl: s.notificationFileUrl ?? undefined,
      tbRefTuyen: s.tbRefTuyen ?? undefined,
      tripStatus: s.tripStatus ?? undefined,
      operator: undefined,
      route: undefined,
    } as Schedule)
  }
  r?.({
    id: 'tb-operator',
    label: '⑥ Lọc đơn vị + gán operator',
    phase: 'done',
    detail: `${opDoc}\n\n→ ${resolvedSchedules.length} lịch hiển thị trong dropdown.`,
  })

  return {
    tbFilteredRawCount: tbFiltered.length,
    resolvedSchedules,
    normalizedForSync: filtered,
    diagnostics: {
      routeCode,
      fixedRowCount: fixedRows.length,
      notificationRowCount: notificationsRows.length,
      idTbMatchingRouteCount: idTbForRoute.size,
      tbFilteredRowCount: tbFiltered.length,
      normalizedAfterNormalizeCount: fixedNormalized.length,
      afterOperatorFilterCount: filtered.length,
      resolvedForDropdownCount: resolvedSchedules.length,
    },
  }
}
