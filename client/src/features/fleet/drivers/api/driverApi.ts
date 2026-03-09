// Driver API Service

import api from '@/lib/api'
import type { Driver, DriverInput } from '../types'

export const driverApi = {
  getAll: async (operatorId?: string, isActive?: boolean): Promise<Driver[]> => {
    try {
      const params = new URLSearchParams()
      if (operatorId) params.append('operatorId', operatorId)
      if (isActive !== undefined) params.append('isActive', String(isActive))

      const queryString = params.toString()
      const url = queryString ? `/drivers?${queryString}` : '/drivers'

      const response = await api.get<Driver[]>(url)
      return response.data
    } catch (error) {
      console.error('Error fetching drivers:', error)
      return []
    }
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

// Re-export for backward compatibility
export const driverService = driverApi
export default driverApi
