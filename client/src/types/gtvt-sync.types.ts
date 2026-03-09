export type GtvtSyncMode = 'dry-run' | 'live'

export interface GtvtSyncErrorItem {
  entity: 'route' | 'schedule' | 'system'
  key: string
  message: string
}

export interface GtvtSyncCounters {
  incomingRoutes: number
  incomingSchedules: number
  insertedRoutes: number
  updatedRoutes: number
  disabledRoutes: number
  insertedSchedules: number
  updatedSchedules: number
  disabledSchedules: number
  failed: number
}

export interface GtvtSyncSummaryResponse {
  mode: GtvtSyncMode
  source: string
  startedAt: string
  finishedAt: string
  durationMs: number
  summary: GtvtSyncCounters
  errors: GtvtSyncErrorItem[]
}

export interface GtvtLastSyncResponse {
  source: string
  lastRouteSyncAt: string | null
  lastScheduleSyncAt: string | null
}

export interface GtvtContractField {
  name: string
  label: string
  required: boolean
  present: boolean
}

export interface GtvtContractStatus {
  ready: boolean
  fields: GtvtContractField[]
}

