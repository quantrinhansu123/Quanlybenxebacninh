import api from '@/lib/api'
import type { OperationNotice } from '@/types'

export const operationNoticeService = {
  getByRouteCode: async (routeCode: string, noticeNumber?: string): Promise<OperationNotice[]> => {
    const params = new URLSearchParams({ routeCode })
    if (noticeNumber) params.append('noticeNumber', noticeNumber)
    const response = await api.get<OperationNotice[]>(`/operation-notices?${params}`)
    return response.data
  },
}
