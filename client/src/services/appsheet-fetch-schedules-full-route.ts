/**
 * Full AppSheet schedule load: fixed (BieuDoChayXeChiTiet + THONGBAO) + bus (GIOCHAY + BIEUDOCHAY_BUYT),
 * filter route + chiều Đi + optional operator code, map to Schedule[].
 */
import { DOC_FULL } from '@/config/appsheet-schedule-chain-docs'
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
import { normalizeBusScheduleRows } from '@/services/appsheet-normalize-bus-schedules'
import type { Operator, Schedule } from '@/types'
import type { AppSheetScheduleProgressReporter } from '@/types/appsheet-schedule-progress'

export interface FetchFullAppsheetSchedulesParams {
  routeId: string
  routeCode: string
  operatorId?: string
  operators: Operator[]
  onProgress?: AppSheetScheduleProgressReporter
}

export interface FetchFullAppsheetSchedulesResult {
  resolvedSchedules: Schedule[]
  normalizedForSync: NormalizedAppSheetSchedule[]
}

const normKey = (s?: string | null) => (s || '').trim().toUpperCase()

export async function fetchFullAppsheetSchedulesForRoute(
  params: FetchFullAppsheetSchedulesParams,
): Promise<FetchFullAppsheetSchedulesResult> {
  const { routeId: rid, routeCode, operatorId: opId, operators, onProgress: report } = params
  const operatorCode = opId ? operators.find((o) => o.id === opId)?.code?.trim() || '' : ''

  const [fixedRows, notificationsRows, busRows, busLookupRows] = await Promise.all([
    fetchAppsheetTableWithChainDoc(
      'fixedSchedules',
      'full-fixed',
      '① BieuDoChayXeChiTiet',
      DOC_FULL.fixedLoad,
      report,
    ),
    fetchAppsheetTableWithChainDoc(
      'notifications',
      'full-notifications',
      '② THONGBAO_KHAITHAC',
      DOC_FULL.notificationsLoad(routeCode),
      report,
    ),
    fetchAppsheetTableWithChainDoc(
      'busSchedules',
      'full-bus-sched',
      '③ GIOCHAY_BUYT',
      DOC_FULL.busSchedLoad,
      report,
    ),
    fetchAppsheetTableWithChainDoc(
      'busLookup',
      'full-bus-lookup',
      '④ BIEUDOCHAY_BUYT',
      DOC_FULL.busLookupLoad,
      report,
    ),
  ])

  report?.({
    id: 'full-merge-fixed',
    label: '⑤ Ghép TB ↔ nút cố định + chuẩn hóa',
    phase: 'start',
    detail: DOC_FULL.mergeFixed,
  })
  const fixedEnriched = enrichRows(fixedRows, notificationsRows, {
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
  const fixedNormalized = mergeThongBaoPdfIntoNormalizedSchedules(
    normalizeScheduleRows(
      applyThongBaoFileBySoThongBao(
        fixedEnriched as Record<string, unknown>[],
        notificationsRows as Record<string, unknown>[],
      ),
    ) as NormalizedAppSheetSchedule[],
    notificationsRows as Record<string, unknown>[],
  )
  report?.({
    id: 'full-merge-fixed',
    label: '⑤ Ghép TB ↔ nút cố định + chuẩn hóa',
    phase: 'done',
    detail: `${DOC_FULL.mergeFixed}\n\n→ ${fixedNormalized.length} lịch cố định (trước lọc tuyến «${routeCode}»).`,
  })

  report?.({
    id: 'full-merge-bus',
    label: '⑥ Ghép biểu đồ buýt + chuẩn hóa',
    phase: 'start',
    detail: DOC_FULL.mergeBus,
  })
  const busEnriched = enrichRows(busRows, busLookupRows, {
    refKey: 'BieuDo',
    lookupIdKey: 'ID_BieuDo',
    mappings: [
      { from: 'TuyenBuyt', to: 'Ref_Tuyen' },
      { from: 'DonViKhaiThac', to: 'Ref_DonVi' },
    ],
  })
  const busNormalized = normalizeBusScheduleRows(busEnriched as Record<string, unknown>[]) as NormalizedAppSheetSchedule[]
  report?.({
    id: 'full-merge-bus',
    label: '⑥ Ghép biểu đồ buýt + chuẩn hóa',
    phase: 'done',
    detail: `${DOC_FULL.mergeBus}\n\n→ ${busNormalized.length} lịch buýt (trước lọc tuyến «${routeCode}»).`,
  })

  const filterDoc = DOC_FULL.filter(routeCode, operatorCode)
  report?.({
    id: 'full-filter',
    label: '⑦ Lọc tuyến + chiều Đi + đơn vị',
    phase: 'start',
    detail: filterDoc,
  })
  const filtered = [...fixedNormalized, ...busNormalized].filter((s) => {
    const dirOk = normKey(s.direction) === normKey('Đi') || normKey(s.direction) === normKey('DI')
    if (!dirOk) return false
    if (!s.routeCode) return false
    const routeOk = normKey(s.routeCode) === normKey(routeCode)
    if (!routeOk) return false
    if (!operatorCode) return true
    if (!s.operatorCode) return false
    return normKey(s.operatorCode) === normKey(operatorCode)
  })
  report?.({
    id: 'full-filter',
    label: '⑦ Lọc tuyến + chiều Đi + đơn vị',
    phase: 'done',
    detail: `${filterDoc}\n\n→ Còn ${filtered.length} lịch sau lọc.`,
  })

  report?.({
    id: 'full-resolve',
    label: '⑧ Gán operator (UUID)',
    phase: 'start',
    detail: DOC_FULL.resolve,
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
  report?.({
    id: 'full-resolve',
    label: '⑧ Gán operator (UUID)',
    phase: 'done',
    detail: `${DOC_FULL.resolve}\n\n→ ${resolvedSchedules.length} lịch hiển thị được trong dropdown.`,
  })

  return { resolvedSchedules, normalizedForSync: filtered }
}
