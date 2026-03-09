import api from '@/lib/api'
import type { VehicleType } from '@/types'

export const vehicleTypeService = {
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

  create: async (input: { name: string; description?: string }): Promise<VehicleType> => {
    const response = await api.post<VehicleType>('/vehicle-types', input)
    return response.data
  },

  update: async (id: string, input: { name?: string; description?: string }): Promise<VehicleType> => {
    const response = await api.put<VehicleType>(`/vehicle-types/${id}`, input)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/vehicle-types/${id}`)
  },
}
