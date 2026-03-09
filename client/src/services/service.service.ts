import api from '@/lib/api'
import type { Service, ServiceInput } from '@/types'

export const serviceService = {
  getAll: async (isActive?: boolean): Promise<Service[]> => {
    try {
      const params = new URLSearchParams()
      if (isActive !== undefined) params.append('isActive', String(isActive))

      const queryString = params.toString()
      const url = queryString ? `/services?${queryString}` : '/services'

      const response = await api.get<Service[]>(url)
      return response.data
    } catch (error) {
      console.error('Error fetching services:', error)
      return []
    }
  },

  getById: async (id: string): Promise<Service> => {
    const response = await api.get<Service>(`/services/${id}`)
    return response.data
  },

  create: async (input: ServiceInput): Promise<Service> => {
    const response = await api.post<Service>('/services', input)
    return response.data
  },

  update: async (id: string, input: Partial<ServiceInput>): Promise<Service> => {
    const response = await api.put<Service>(`/services/${id}`, input)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/services/${id}`)
  },
}
