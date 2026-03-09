/**
 * Normalize raw AppSheet THONGTINDONVIVANTAI (operator) rows
 *
 * Verified column names (2026-03-03) from AppSheet API response:
 *   IDDoanhNghiep, TenDoanhNghiep, TinhThanh, TinhDangKyHoatDong,
 *   DiaChiSauSapNhap, SoDienThoai, MaSoThue, NguoiDaiDienTheoPhapLuat,
 *   SoDKKD, LoaiHinh, LoaiHinhVanTai
 *
 * Dedup by firebaseId (IDDoanhNghiep) — each operator is unique
 */

export interface NormalizedAppSheetOperator {
  firebaseId: string
  code: string
  name: string
  province?: string
  address?: string
  phone?: string
  taxCode?: string
  representative?: string
}

/** Safe string extraction */
const str = (val: unknown): string =>
  typeof val === 'string' ? val.trim() : ''

export function normalizeOperatorRows(
  rows: Record<string, unknown>[],
): NormalizedAppSheetOperator[] {
  const byId = new Map<string, NormalizedAppSheetOperator>()

  for (const row of rows) {
    // Verified: IDDoanhNghiep is the stable unique ID (8-char hex)
    const id = str(row['IDDoanhNghiep'])
    const name = str(row['TenDoanhNghiep'])
    if (!id || !name) continue

    // Code = UPPER(firebaseId) — consistent with 96% existing operators (ETL import)
    const code = id.toUpperCase()

    const normalized: NormalizedAppSheetOperator = {
      firebaseId: id,
      code,
      name,
      // TinhDangKyHoatDong = province of registered operation (more relevant)
      province: str(row['TinhDangKyHoatDong']) || str(row['TinhThanh']) || undefined,
      address: str(row['DiaChiSauSapNhap']) || undefined,
      phone: str(row['SoDienThoai']) || undefined,
      taxCode: str(row['MaSoThue']) || undefined,
      representative: str(row['NguoiDaiDienTheoPhapLuat']) || undefined,
    }
    byId.set(id, normalized)
  }

  return Array.from(byId.values())
}
