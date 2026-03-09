import api from '@/lib/api'
import { toast } from 'react-toastify'
import type { Driver, DriverInput } from '@/types'

// Cache for drivers
let driversCache: { data: Driver[]; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const driverService = {
  getAll: async (operatorId?: string, isActive?: boolean, forceRefresh = false): Promise<Driver[]> => {
    try {
      // Check cache (only for unfiltered queries)
      if (!forceRefresh && !operatorId && isActive === undefined && driversCache && Date.now() - driversCache.timestamp < CACHE_TTL) {
        return driversCache.data
      }

      const params = new URLSearchParams()
      if (operatorId) params.append('operatorId', operatorId)
      if (isActive !== undefined) params.append('isActive', String(isActive))

      const queryString = params.toString()
      const url = queryString ? `/drivers?${queryString}` : '/drivers'

      const response = await api.get<Driver[]>(url)

      // Cache unfiltered results
      if (!operatorId && isActive === undefined) {
        driversCache = { data: response.data, timestamp: Date.now() }
      }

      return response.data
    } catch (error) {
      console.error('Error fetching drivers:', error)
      // Return stale cache on error
      if (driversCache) return driversCache.data
      toast.error('Không thể tải danh sách lái xe. Vui lòng thử lại.')
      return []
    }
  },

  clearCache: () => {
    driversCache = null
  },

  getById: async (id: string): Promise<Driver> => {
    const response = await api.get<Driver>(`/drivers/${id}`)
    return response.data
  },

  create: async (input: DriverInput): Promise<Driver> => {
    const response = await api.post<Driver>('/drivers', input)
    return response.data
  },

  update: async (id: string, input: Partial<DriverInput>): Promise<Driver> => {
    const response = await api.put<Driver>(`/drivers/${id}`, input)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/drivers/${id}`)
  },
}
