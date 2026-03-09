export const GTVT_SYNC_SOURCE = 'gtvt_appsheet_manual' as const

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
  source: typeof GTVT_SYNC_SOURCE
  startedAt: string
  finishedAt: string
  durationMs: number
  summary: GtvtSyncCounters
  errors: GtvtSyncErrorItem[]
}

export interface GtvtLastSyncResponse {
  source: typeof GTVT_SYNC_SOURCE
  lastRouteSyncAt: string | null
  lastScheduleSyncAt: string | null
}

export interface GtvtSyncOptions {
  dryRun: boolean
  triggeredBy?: string
}

export interface GtvtNormalizedRoute {
  firebaseId: string
  routeCode: string
  routeCodeOld: string | null
  routeType: string | null
  departureStation: string | null
  arrivalStation: string | null
  operationStatus: string | null
  distanceKm: number | null
  metadata: Record<string, unknown>
}

export interface GtvtNormalizedSchedule {
  firebaseId: string
  routeFirebaseId: string | null
  routeCode: string | null
  operatorFirebaseId: string | null
  operatorCode: string | null
  scheduleCode: string | null
  departureTime: string
  direction: string
  frequencyType: 'daily' | 'weekly' | 'specific_days'
  daysOfWeek: number[]
  daysOfMonth: number[]
  calendarType: string
  effectiveFrom: string
  notificationNumber: string | null
  tripStatus: string
  metadata: Record<string, unknown>
}

export interface GtvtAppsheetPayload {
  routes: Record<string, unknown>[]
  schedules: Record<string, unknown>[]
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

export class GtvtConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GtvtConfigError'
  }
}

export class GtvtSourceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GtvtSourceError'
  }
}

export class GtvtInternalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GtvtInternalError'
  }
}

