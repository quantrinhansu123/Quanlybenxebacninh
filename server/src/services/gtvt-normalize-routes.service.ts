import { isRecord } from '../utils/type-guards.js'
import { pickString, pickNumber, stripBusPrefix, MAX_ROUTE_CODE_LENGTH } from './gtvt-sync-utils.js'
import type { GtvtNormalizedRoute, GtvtSyncErrorItem } from '../types/gtvt-sync.types.js'

// MaSoTuyen/MaSoTuyen_Fix as fallback ID for fixed routes (DANHMUCTUYENCODINH has no UUID field)
const ROUTE_ID_KEYS = ['firebase_id', 'firebaseId', 'ID_TUYEN', 'ID_Tuyen', 'id', 'route_fb_id', 'routeFbId', 'MaSoTuyen', 'MaSoTuyen_Fix']
const ROUTE_CODE_KEYS = ['route_code', 'routeCode', 'MaTuyen', 'ma_tuyen', 'SoHieuTuyen', 'so_hieu_tuyen', 'Ref_Tuyen', 'MaSoTuyen', 'MaSoTuyen_Fix']
const ROUTE_CODE_OLD_KEYS = ['route_code_old', 'routeCodeOld', 'so_hieu_tuyen_old', 'MaSoTuyen_Cu']
const ROUTE_TYPE_KEYS = ['route_type', 'routeType', 'LoaiTuyen', 'PhanLoaiTuyen']
const OPERATION_STATUS_KEYS = ['operation_status', 'operationStatus', 'TinhTrangKhaiThac', 'TrangThai']
const DEPARTURE_STATION_KEYS = ['departure_station', 'departureStation', 'BenDi', 'from_station', 'NoiDi', 'DiemDau', 'TinhDi']
const ARRIVAL_STATION_KEYS = ['arrival_station', 'arrivalStation', 'BenDen', 'to_station', 'NoiDen', 'DiemCuoi', 'TinhDen']
const DISTANCE_KEYS = ['distance_km', 'distanceKm', 'CuLy', 'cu_ly_km', 'CuLyTuyen_km']

// Normalize raw route type to 3 standard categories: "Liên tỉnh", "Nội tỉnh", "Xe buýt"
const normalizeRouteType = (raw: string | null, isBus: boolean): string => {
  if (isBus) return 'Xe buýt'
  const v = (raw || '').trim().toLowerCase()
  if (v.includes('nội tỉnh') || v.includes('noi tinh') || v === 'intracity') return 'Nội tỉnh'
  // Everything else (liên tỉnh, fixed, intercity, tuyến mới, đã công bố, etc.) → Liên tỉnh
  return 'Liên tỉnh'
}

const ensureBusRouteCode = (value: string): { routeCode: string; routeCodeOld: string } => {
  const routeCodeOld = stripBusPrefix(value)
  return {
    routeCode: `BUS-${routeCodeOld}`,
    routeCodeOld,
  }
}

export function normalizeGtvtRoutes(
  rawRows: Record<string, unknown>[]
): { rows: GtvtNormalizedRoute[]; errors: GtvtSyncErrorItem[]; seenFirebaseIds: string[] } {
  const rows: GtvtNormalizedRoute[] = []
  const errors: GtvtSyncErrorItem[] = []
  const seenFirebaseIds = new Set<string>()

  rawRows.forEach((item, index) => {
    if (!isRecord(item)) return

    const firebaseId = pickString(item, ROUTE_ID_KEYS)
    if (firebaseId) seenFirebaseIds.add(firebaseId)
    const rawRouteCode = pickString(item, ROUTE_CODE_KEYS)
    const rawRouteCodeOld = pickString(item, ROUTE_CODE_OLD_KEYS)
    const soHieuTuyen = pickString(item, ['SoHieuTuyen', 'so_hieu_tuyen'])

    if (!firebaseId) {
      errors.push({ entity: 'route', key: `row-${index + 1}`, message: 'Missing route firebase id' })
      return
    }

    const baseRouteCode = rawRouteCode || rawRouteCodeOld || soHieuTuyen
    if (!baseRouteCode) {
      errors.push({ entity: 'route', key: firebaseId, message: 'Missing route code' })
      return
    }

    const routeTypeRaw = pickString(item, ROUTE_TYPE_KEYS)
    const isBusRoute = Boolean(soHieuTuyen) || baseRouteCode.toUpperCase().startsWith('BUS-') || (routeTypeRaw || '').toLowerCase() === 'bus'

    const normalizedBus = isBusRoute ? ensureBusRouteCode(rawRouteCodeOld || soHieuTuyen || baseRouteCode) : null
    const routeCode = normalizedBus ? normalizedBus.routeCode : baseRouteCode.trim()
    if (routeCode.length > MAX_ROUTE_CODE_LENGTH) {
      errors.push({ entity: 'route', key: firebaseId, message: `Route code exceeds ${MAX_ROUTE_CODE_LENGTH} characters` })
      return
    }
    const routeCodeOld = normalizedBus ? normalizedBus.routeCodeOld : (rawRouteCodeOld || null)
    const routeType = normalizeRouteType(routeTypeRaw, isBusRoute)

    rows.push({
      firebaseId,
      routeCode,
      routeCodeOld,
      routeType,
      departureStation: pickString(item, DEPARTURE_STATION_KEYS),
      arrivalStation: pickString(item, ARRIVAL_STATION_KEYS),
      operationStatus: pickString(item, OPERATION_STATUS_KEYS),
      distanceKm: pickNumber(item, DISTANCE_KEYS),
      metadata: {
        provider: 'gtvt-appsheet',
      },
    })
  })

  return { rows, errors, seenFirebaseIds: [...seenFirebaseIds] }
}
