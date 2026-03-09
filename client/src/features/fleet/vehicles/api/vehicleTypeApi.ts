// Vehicle Type API Service

import api from '@/lib/api'
import type { VehicleType, VehicleTypeInput } from '../types'

export const vehicleTypeApi = {
  getAll: async (): Promise<VehicleType[]> => {
    try {
      const response = await api.get<VehicleType[]>('/vehicle-types')
      return response.data
    } catch (error) {
      console.error('Error fetching vehicle types:', error)
      return []
    }
  },

  getById: async (id: string): Promise<VehicleType> => {
    const response = await api.get<VehicleType>(`/vehicle-types/${id}`)
    return response.data
  },

  create: async (input: VehicleTypeInput): Promise<VehicleType> => {
    const response = await api.post<VehicleType>('/vehicle-types', input)
    return response.data
  },

  update: async (id: string, input: Partial<VehicleTypeInput>): Promise<VehicleType> => {
    const response = await api.put<VehicleType>(`/vehicle-types/${id}`, input)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/vehicle-types/${id}`)
  },
}

// Re-export for backward compatibility
export const vehicleTypeService = vehicleTypeApi
export default vehicleTypeApi
