import api from '@/lib/api'
import type { ServiceCharge, ServiceChargeInput, ServiceType } from '@/types'

export const serviceChargeService = {
  getAll: async (dispatchRecordId?: string): Promise<ServiceCharge[]> => {
    const params = dispatchRecordId ? { dispatchRecordId } : {}
    const response = await api.get<ServiceCharge[]>('/service-charges', { params })
    return response.data
  },

  getById: async (id: string): Promise<ServiceCharge> => {
    const response = await api.get<ServiceCharge>(`/service-charges/${id}`)
    return response.data
  },

  create: async (data: ServiceChargeInput): Promise<ServiceCharge> => {
    const response = await api.post<ServiceCharge>('/service-charges', data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/service-charges/${id}`)
  },

  getServiceTypes: async (isActive?: boolean): Promise<ServiceType[]> => {
    const params = isActive !== undefined ? { isActive: isActive.toString() } : {}
    const response = await api.get<ServiceType[]>('/service-charges/types', { params })
    return response.data
  },
}

