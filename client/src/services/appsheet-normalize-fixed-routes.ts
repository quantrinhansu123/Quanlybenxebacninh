/**
 * Normalize raw AppSheet DANHMUCTUYENCODINH (fixed route) rows
 *
 * Verified column names (2026-03-03) from AppSheet API response:
 *   MaSoTuyen, TinhDi, TinhDen, BenDi, BenDen, BenDi_Ref, BenDen_Ref,
 *   HanhTrinh, PhanLoaiTuyen, TinhTrangKhaiThac, CuLyTuyen_km,
 *   TongChuyenThang, ChuyenDaKhaiThac, LuuLuongConLai, GianCachToiThieu_phut,
 *   SoQuyetDinh, NgayBanHanh, MaSoTuyen_Cu
 *
 * Dedup by routeCode (MaSoTuyen) — each route is unique
 */

export interface NormalizedAppSheetFixedRoute {
  routeCode: string
  routeCodeOld?: string
  departureProvince?: string
  departureStation?: string
  departureStationRef?: string
  arrivalProvince?: string
  arrivalStation?: string
  arrivalStationRef?: string
  itinerary?: string
  routeType?: string
  operationStatus?: string
  distanceKm?: number
  totalTripsPerMonth?: number
  tripsOperated?: number
  remainingCapacity?: number
  minIntervalMinutes?: number
  decisionNumber?: string
  decisionDate?: string
}

/** Safe string extraction */
const str = (val: unknown): string =>
  typeof val === 'string' ? val.trim() : ''

/** Safe int extraction */
const int = (val: unknown): number | undefined => {
  const n = parseInt(String(val), 10)
  return isNaN(n) ? undefined : n
}

/** Normalize route type display name */
const normalizeRouteType = (raw: string): string => {
  const lower = raw.toLowerCase()
  if (lower.includes('liên tỉnh')) return 'Liên tỉnh'
  if (lower.includes('nội tỉnh')) return 'Nội tỉnh'
  if (lower.includes('buýt') || lower.includes('bus')) return 'Xe buýt'
  return raw
}

export function normalizeFixedRouteRows(
  rows: Record<string, unknown>[],
): NormalizedAppSheetFixedRoute[] {
  const byCode = new Map<string, NormalizedAppSheetFixedRoute>()

  for (const row of rows) {
    const routeCode = str(row['MaSoTuyen'])
    if (!routeCode) continue

    const normalized: NormalizedAppSheetFixedRoute = {
      routeCode,
      routeCodeOld: str(row['MaSoTuyen_Cu']) || undefined,
      departureProvince: str(row['TinhDi']) || undefined,
      departureStation: str(row['BenDi']) || undefined,
      departureStationRef: str(row['BenDi_Ref']) || undefined,
      arrivalProvince: str(row['TinhDen']) || undefined,
      arrivalStation: str(row['BenDen']) || undefined,
      arrivalStationRef: str(row['BenDen_Ref']) || undefined,
      itinerary: str(row['HanhTrinh']) || undefined,
      routeType: normalizeRouteType(str(row['PhanLoaiTuyen']) || str(row['Phân loại tuyến'])),
      operationStatus: str(row['TinhTrangKhaiThac']) || undefined,
      distanceKm: int(row['CuLyTuyen_km']),
      totalTripsPerMonth: int(row['TongChuyenThang']),
      tripsOperated: int(row['ChuyenDaKhaiThac']),
      remainingCapacity: int(row['LuuLuongConLai']),
      minIntervalMinutes: int(row['GianCachToiThieu_phut']),
      decisionNumber: str(row['SoQuyetDinh']) || undefined,
      decisionDate: str(row['NgayBanHanh']) || undefined,
    }
    byCode.set(routeCode, normalized)
  }

  return Array.from(byCode.values())
}
