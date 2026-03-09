import api from '@/lib/api'
import type { Vehicle, VehicleInput } from '@/types'

export const vehicleService = {
  getAll: async (operatorId?: string, isActive?: boolean, includeLegacy?: boolean): Promise<Vehicle[]> => {
    try {
      const params = new URLSearchParams()
      if (operatorId) params.append('operatorId', operatorId)
      if (isActive !== undefined) params.append('isActive', String(isActive))
      if (includeLegacy !== undefined) params.append('includeLegacy', String(includeLegacy))

      const queryString = params.toString()
      const url = queryString ? `/vehicles?${queryString}` : '/vehicles'

      const response = await api.get<Vehicle[]>(url)
      return response.data
    } catch (error) {
      console.error('Error fetching vehicles:', error)
      return []
    }
  },

  getById: async (id: string): Promise<Vehicle> => {
    const response = await api.get<Vehicle>(`/vehicles/${id}`)
    return response.data
  },

  create: async (input: VehicleInput): Promise<Vehicle> => {
    const response = await api.post<Vehicle>('/vehicles', input)
    return response.data
  },

  update: async (id: string, input: Partial<VehicleInput>): Promise<Vehicle> => {
    const response = await api.put<Vehicle>(`/vehicles/${id}`, input)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/vehicles/${id}`)
  },

  getDocumentAuditLogs: async (vehicleId: string): Promise<any[]> => {
    try {
      const response = await api.get<any[]>(`/vehicles/${vehicleId}/document-audit-logs`)
      return response.data
    } catch (error) {
      console.error('Error fetching vehicle document audit logs:', error)
      return []
    }
  },

  // Get all document audit logs for all vehicles (optimized)
  getAllDocumentAuditLogs: async (): Promise<any[]> => {
    try {
      const response = await api.get<any[]>('/vehicles/document-audit-logs/all')
      return response.data
    } catch (error) {
      console.error('Error fetching all document audit logs:', error)
      return []
    }
  },

  /**
   * Lookup vehicle by plate from RTDB datasheet/Xe
   * Returns seat capacity for ANY vehicle (not filtered by badge)
   */
  lookupByPlate: async (plate: string): Promise<{
    id: string
    plateNumber: string
    seatCapacity: number
    operatorName: string
    vehicleType: string
    source: string
  } | null> => {
    try {
      const response = await api.get(`/vehicles/lookup/${encodeURIComponent(plate)}`)
      return response.data
    } catch (error) {
      console.error('Error looking up vehicle by plate:', error)
      return null
    }
  },
}
