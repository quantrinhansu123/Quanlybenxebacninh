import api from '@/lib/api'
import type { Location, LocationInput } from '@/types'

export const locationService = {
  getAll: async (isActive?: boolean): Promise<Location[]> => {
    try {
      const params = new URLSearchParams()
      if (isActive !== undefined) params.append('isActive', String(isActive))

      const queryString = params.toString()
      const url = queryString ? `/locations?${queryString}` : '/locations'

      const response = await api.get<Location[]>(url)
      return response.data
    } catch (error) {
      console.error('Error fetching locations:', error)
      return []
    }
  },

  getById: async (id: string): Promise<Location> => {
    const response = await api.get<Location>(`/locations/${id}`)
    return response.data
  },

  create: async (input: LocationInput): Promise<Location> => {
    const response = await api.post<Location>('/locations', input)
    return response.data
  },

  update: async (id: string, input: Partial<LocationInput>): Promise<Location> => {
    const response = await api.put<Location>(`/locations/${id}`, input)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/locations/${id}`)
  },
}
