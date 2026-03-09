/**
 * Normalize raw AppSheet DANHMUCTUYENBUYT (bus route) rows
 *
 * Verified column names (2026-03-03):
 *   ID_Tuyen, SoHieuTuyen, NoiDi, NoiDen, DiemDau, DiemCuoi,
 *   HanhTrinh, TrangThai, CuLy, TenHienThiTuye
 *
 * Bus routes use mã tỉnh (e.g. "98") for NoiDi/NoiDen → requires MATINH lookup
 * Dedup by firebaseId (ID_Tuyen)
 */

export interface NormalizedAppSheetBusRoute {
  firebaseId: string
  routeCode: string
  departureProvince?: string
  departureStation?: string
  departureStationRef?: string
  arrivalProvince?: string
  arrivalStation?: string
  arrivalStationRef?: string
  itinerary?: string
  operationStatus?: string
  distanceKm?: number
  routeType: 'Xe buýt'
  displayName?: string
}

/** Safe string extraction */
const str = (val: unknown): string =>
  typeof val === 'string' ? val.trim() : ''

/** Safe int extraction */
const int = (val: unknown): number | undefined => {
  const n = parseInt(String(val), 10)
  return isNaN(n) ? undefined : n
}

/**
 * Normalize bus route rows with province code → name resolution
 * @param rows Raw AppSheet DANHMUCTUYENBUYT rows
 * @param matinhMap Map of mã tỉnh → tên tỉnh (from MATINH table)
 */
export function normalizeBusRouteRows(
  rows: Record<string, unknown>[],
  matinhMap?: Map<string, string>,
): NormalizedAppSheetBusRoute[] {
  const byId = new Map<string, NormalizedAppSheetBusRoute>()

  for (const row of rows) {
    const id = str(row['ID_Tuyen'])
    const routeNumber = str(row['SoHieuTuyen'])
    if (!id || !routeNumber) continue

    // Resolve mã tỉnh → tên tỉnh for departure/arrival
    const noiDi = str(row['NoiDi'])
    const noiDen = str(row['NoiDen'])
    const depProvince = matinhMap?.get(noiDi) || noiDi || undefined
    const arrProvince = matinhMap?.get(noiDen) || noiDen || undefined

    const normalized: NormalizedAppSheetBusRoute = {
      firebaseId: id,
      routeCode: `BUS-${routeNumber}`,
      departureProvince: depProvince,
      // Bus routes: station = province name (per user design: route_name = dep_station - arr_station)
      departureStation: depProvince,
      departureStationRef: str(row['DiemDau']) || undefined,
      arrivalProvince: arrProvince,
      arrivalStation: arrProvince,
      arrivalStationRef: str(row['DiemCuoi']) || undefined,
      itinerary: str(row['HanhTrinh']) || undefined,
      operationStatus: str(row['TrangThai']) || undefined,
      distanceKm: int(row['CuLy']),
      routeType: 'Xe buýt',
      displayName: str(row['TenHienThiTuye']) || undefined,
    }
    byId.set(id, normalized)
  }

  return Array.from(byId.values())
}
