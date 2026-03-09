import api from '@/lib/api'
import type { GtvtContractStatus, GtvtLastSyncResponse, GtvtSyncSummaryResponse } from '@/types/gtvt-sync.types'

export const gtvtSyncService = {
  syncRoutesSchedules: async (dryRun = false): Promise<GtvtSyncSummaryResponse> => {
    const response = await api.post<GtvtSyncSummaryResponse>('/integrations/gtvt/sync-routes-schedules', { dryRun }, { timeout: 120000 })
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

