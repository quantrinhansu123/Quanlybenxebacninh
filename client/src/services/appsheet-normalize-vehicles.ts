/**
 * Normalize raw AppSheet Xe (vehicle) rows into app-compatible format
 * Column names discovered from AppSheet "Xe" table (gid=40001005)
 *
 * NOTE: Only stable fields here (for per-record diff hashing).
 * Unstable fields (firebaseId, syncedAt) added at sync time in vehicleApi.ts
 */
import { normPlate } from '@/utils/plate-utils'

export interface NormalizedAppSheetVehicle {
  plateNumber: string
  registrationName?: string
  seatCapacity?: number
  vehicleCategory?: string // LoaiPhuongTien from AppSheet Xe table
}

/** Safe string extraction */
const str = (val: unknown): string =>
  typeof val === 'string' ? val.trim() : ''

/** Safe integer extraction */
const int = (val: unknown): number | undefined => {
  if (val === null || val === undefined || val === '') return undefined
  const n = Number(val)
  return Number.isFinite(n) ? Math.floor(n) : undefined
}

export function normalizeVehicleRows(
  rows: Record<string, unknown>[],
): NormalizedAppSheetVehicle[] {
  // Dedup by plate: Map ensures each plate appears once
  // Merge strategy: if duplicate, keep non-null values from either row
  // AppSheet Xe table has ~215 duplicate plates out of ~19K rows
  const byPlate = new Map<string, NormalizedAppSheetVehicle>()

  for (const row of rows) {
    const plate = str(row['BienSo'] ?? row['BienKiemSoat'])
    if (!plate) continue
    const normalized = normPlate(plate)

    // Merge strategy: prefer non-null values from either duplicate row
    const newVal: NormalizedAppSheetVehicle = {
      plateNumber: normalized,
      registrationName: str(row['TenDangKyXe']) || undefined,
      seatCapacity: int(row['SoChoNgoi'] ?? row['SoCho']),
      vehicleCategory: str(row['LoaiPhuongTien']) || undefined,
    }
    const existing = byPlate.get(normalized)
    byPlate.set(normalized, existing ? {
      plateNumber: normalized,
      registrationName: newVal.registrationName ?? existing.registrationName,
      seatCapacity: newVal.seatCapacity ?? existing.seatCapacity,
      vehicleCategory: newVal.vehicleCategory ?? existing.vehicleCategory,
    } : newVal)
  }

  return Array.from(byPlate.values())
}
