import api from '@/lib/api'
import type { Violation, ViolationInput, ViolationType } from '@/types'

export const violationService = {
  getAll: async (
    vehicleId?: string,
    driverId?: string,
    dispatchRecordId?: string,
    resolutionStatus?: 'pending' | 'resolved' | 'dismissed'
  ): Promise<Violation[]> => {
    const params: Record<string, string> = {}
    if (vehicleId) params.vehicleId = vehicleId
    if (driverId) params.driverId = driverId
    if (dispatchRecordId) params.dispatchRecordId = dispatchRecordId
    if (resolutionStatus) params.resolutionStatus = resolutionStatus
    const response = await api.get<Violation[]>('/violations', { params })
    return response.data
  },

  getById: async (id: string): Promise<Violation> => {
    const response = await api.get<Violation>(`/violations/${id}`)
    return response.data
  },

  create: async (data: ViolationInput): Promise<Violation> => {
    const response = await api.post<Violation>('/violations', data)
    return response.data
  },

  update: async (
    id: string,
    data: {
      resolutionStatus: 'pending' | 'resolved' | 'dismissed'
      resolutionNotes?: string
    }
  ): Promise<Violation> => {
    const response = await api.put<Violation>(`/violations/${id}`, data)
    return response.data
  },

  getViolationTypes: async (): Promise<ViolationType[]> => {
    const response = await api.get<ViolationType[]>('/violations/types')
    return response.data
  },
}

