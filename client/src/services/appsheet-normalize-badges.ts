/**
 * Normalize raw AppSheet PHUHIEUXE (badge) rows into app-compatible format
 * Column names based on ETL + AppSheet "PHUHIEUXE" table
 *
 * Dedup by badgeNumber (ID_PhuHieu) — each badge is unique
 */
import { normPlate } from '@/utils/plate-utils'

export interface NormalizedAppSheetBadge {
  badgeNumber: string
  plateNumber: string
  badgeType?: string
  fileNumber?: string
  operatorRef?: string    // Ref_DonViCapPhuHieu → operators.firebase_id
  issueDate?: string
  expiryDate?: string
  status?: string
  badgeColor?: string
  issueType?: string
  routeRef?: string
  busRouteRef?: string
  routeCode?: string
  routeName?: string
  oldBadgeNumber?: string
  renewalReason?: string
  revokeDecision?: string
  revokeReason?: string
  revokeDate?: string
  notes?: string
}

/** Safe string extraction */
const str = (val: unknown): string =>
  typeof val === 'string' ? val.trim() : ''

export function normalizeBadgeRows(
  rows: Record<string, unknown>[],
): NormalizedAppSheetBadge[] {
  const byBadge = new Map<string, NormalizedAppSheetBadge>()

  for (const row of rows) {
    const badgeNum = str(row['SoPhuHieu'] ?? row['ID_PhuHieu'])
    if (!badgeNum) continue

    // BienSo = actual plate text (e.g. "99H01844")
    // BienSoXe = ref ID (e.g. "35841712"), NOT the plate number
    const plate = str(row['BienSo']) || str(row['BienSoXe'])
    const normalized: NormalizedAppSheetBadge = {
      badgeNumber: badgeNum,
      plateNumber: plate ? normPlate(plate) : '',
      badgeType: str(row['LoaiPH']) || undefined,
      fileNumber: str(row['MaHoSo']) || undefined,
      operatorRef: str(row['Ref_DonViCapPhuHieu']) || undefined,
      issueDate: str(row['NgayCap']) || undefined,
      expiryDate: str(row['NgayHetHan']) || undefined,
      status: str(row['TrangThai']) || undefined,
      badgeColor: str(row['MauPhuHieu']) || undefined,
      issueType: str(row['LoaiCap']) || undefined,
      routeRef: str(row['Ref_Tuyen']) || undefined,
      busRouteRef: str(row['Ref_TuyenBuyt']) || undefined,
      routeCode: str(row['MaSoTuyen']) || undefined,
      routeName: str(row['TenTuyen']) || undefined,
      oldBadgeNumber: str(row['SoPhuHieuCu']) || undefined,
      renewalReason: str(row['LyDoCapLai']) || undefined,
      revokeDecision: str(row['QDThuHoi']) || undefined,
      revokeReason: str(row['LyDoThuHoi']) || undefined,
      revokeDate: str(row['NgayThuHoi']) || undefined,
      notes: str(row['GhiChu']) || undefined,
    }
    byBadge.set(badgeNum, normalized)
  }

  return Array.from(byBadge.values())
}
