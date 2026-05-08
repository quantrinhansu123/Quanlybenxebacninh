import api from '@/lib/api'
import type { GtvtContractStatus, GtvtLastSyncResponse, GtvtSyncSummaryResponse } from '@/types/gtvt-sync.types'

export type GtvtCompareResponse = {
  routes: {
    appsheet: number
    supabase: number
    onlyInAppSheet: { count: number; items: string[] }
    onlyInSupabase: { count: number; items: string[] }
  }
  schedules: {
    appsheet: number
    supabase: number
    onlyInAppSheet: { count: number; items: string[] }
    onlyInSupabase: { count: number; items: string[] }
  }
  operatorRefs: {
    totalInNotices: number
    missingInSupabase: { count: number; items: string[] }
  }
  limit: number
}

export const gtvtSyncService = {
  compare: async (limit = 200): Promise<GtvtCompareResponse> => {
    const response = await api.get<GtvtCompareResponse>(`/integrations/gtvt/compare?limit=${limit}`, { timeout: 120000 })
    return response.data
  },
  syncRoutesSchedules: async (dryRun = false, routeCode?: string): Promise<GtvtSyncSummaryResponse> => {
    const response = await api.post<GtvtSyncSummaryResponse>(
      '/integrations/gtvt/sync-routes-schedules',
      { dryRun, routeCode },
      { timeout: 120000 }
    )
    return response.data
  },

  getLastSync: async (): Promise<GtvtLastSyncResponse> => {
    const response = await api.get<GtvtLastSyncResponse>('/integrations/gtvt/last-sync')
    return response.data
  },

  getContractStatus: async (): Promise<GtvtContractStatus> => {
    const response = await api.get<GtvtContractStatus>('/integrations/gtvt/contract-status')
    return response.data
  },
}

