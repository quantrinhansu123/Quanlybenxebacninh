// Vehicle API Service

import api from '@/lib/api'
import type { Vehicle, VehicleInput } from '../types'

/** Chunk size for backend sync batches */
const SYNC_CHUNK_SIZE = 500

export const vehicleApi = {
  getAll: async (operatorId?: string, isActive?: boolean): Promise<Vehicle[]> => {
    try {
      const params = new URLSearchParams()
      if (operatorId) params.append('operatorId', operatorId)
      if (isActive !== undefined) params.append('isActive', String(isActive))

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

  getDocumentAuditLogs: async (vehicleId: string): Promise<unknown[]> => {
    try {
      const response = await api.get<unknown[]>(`/vehicles/${vehicleId}/document-audit-logs`)
      return response.data
    } catch (error) {
      console.error('Error fetching vehicle document audit logs:', error)
      return []
    }
  },

  /** Push AppSheet-polled vehicles to backend for DB persistence (chunked) */
  syncFromAppSheet: async (vehicles: unknown[]): Promise<void> => {
    if (!vehicles.length) return
    // Add unstable/metadata fields here (not in normalizer, to avoid breaking per-record diff)
    const now = new Date().toISOString()
    const withMeta = (vehicles as Record<string, unknown>[]).map(v => ({
      ...v,
      firebaseId: v.plateNumber, // Use plate as stable ID
      source: 'appsheet',
      syncedAt: now,
    }))
    try {
      for (let i = 0; i < withMeta.length; i += SYNC_CHUNK_SIZE) {
        const chunk = withMeta.slice(i, i + SYNC_CHUNK_SIZE)
        await api.post('/vehicles/appsheet-sync', { vehicles: chunk })
      }
    } catch (error) {
      console.warn('AppSheet vehicle sync to DB failed:', error)
    }
  },
}

// Re-export for backward compatibility
export const vehicleService = vehicleApi
export default vehicleApi
