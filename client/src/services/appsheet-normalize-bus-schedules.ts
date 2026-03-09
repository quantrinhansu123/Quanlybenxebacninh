/**
 * Normalize raw AppSheet GIOCHAY_BUYT (bus schedule) rows
 * Enrichment: must be pre-joined with BIEUDOCHAY_BUYT via enrichRows() before calling normalizer
 *
 * Join config (done in SharedWorker):
 *   enrichRows(busScheduleRows, busLookupRows, {
 *     refKey: 'BieuDo',
 *     lookupIdKey: 'ID_BieuDo',
 *     mappings: [{ from: 'TuyenBuyt', to: 'Ref_Tuyen' }, { from: 'DonViKhaiThac', to: 'Ref_DonVi' }],
 *   })
 *
 * After enrichment, field names align with fixed schedule fields so the same normalizer works.
 */
import {
  normalizeScheduleRows,
  type NormalizedAppSheetSchedule,
} from './appsheet-normalize-schedules'

export type NormalizedAppSheetBusSchedule = NormalizedAppSheetSchedule

/**
 * Normalize bus schedule rows (GIOCHAY_BUYT)
 * MUST be enriched with BIEUDOCHAY_BUYT (via enrichRows) before calling this —
 * enrichment maps TuyenBuyt → Ref_Tuyen and DonViKhaiThac → Ref_DonVi.
 */
export function normalizeBusScheduleRows(
  rawRows: Record<string, unknown>[],
): NormalizedAppSheetBusSchedule[] {
  // Same normalizer works for both fixed and bus schedules after enrichment
  // because enrichRows injects Ref_Tuyen + Ref_DonVi into the same field names
  return normalizeScheduleRows(rawRows)
}
