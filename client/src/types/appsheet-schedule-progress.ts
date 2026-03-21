/** Sự kiện từ service tải lịch AppSheet (map → hàng hiển thị) */
export type AppSheetScheduleProgressPhase = 'start' | 'done' | 'error'

export interface AppSheetScheduleProgressEvent {
  id: string
  label: string
  phase: AppSheetScheduleProgressPhase
  detail?: string
}

export type AppSheetScheduleProgressReporter = (e: AppSheetScheduleProgressEvent) => void

export type ScheduleAppSheetFetchStepState = 'loading' | 'ok' | 'error'

export interface ScheduleAppSheetFetchStepRow {
  id: string
  label: string
  state: ScheduleAppSheetFetchStepState
  detail?: string
}

export function upsertScheduleProgressRow(
  prev: ScheduleAppSheetFetchStepRow[],
  e: AppSheetScheduleProgressEvent,
): ScheduleAppSheetFetchStepRow[] {
  const state: ScheduleAppSheetFetchStepState =
    e.phase === 'start' ? 'loading' : e.phase === 'done' ? 'ok' : 'error'
  const row: ScheduleAppSheetFetchStepRow = {
    id: e.id,
    label: e.label,
    state,
    detail: e.detail,
  }
  const i = prev.findIndex((x) => x.id === e.id)
  if (i === -1) return [...prev, row]
  const next = [...prev]
  next[i] = row
  return next
}
