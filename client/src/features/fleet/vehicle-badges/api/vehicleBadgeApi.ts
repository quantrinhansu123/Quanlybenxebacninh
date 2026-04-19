// Vehicle Badge API Service

import api from '@/lib/api'
import type { VehicleBadge } from '../types'

export interface VehicleBadgeStats {
  total: number
  active: number
  expired: number
  expiringSoon: number
}

/** Chunk size for backend sync batches */
const SYNC_CHUNK_SIZE = 500

export const vehicleBadgeApi = {
  // Read-only service - data comes from external source
  getAll: async (): Promise<VehicleBadge[]> => {
    try {
      const response = await api.get<VehicleBadge[]>('/vehicle-badges')
      return response.data
    } catch (error) {
      console.error('Error fetching vehicle badges:', error)
      return []
    }
  },

  getById: async (id: string): Promise<VehicleBadge | null> => {
    try {
      const response = await api.get<VehicleBadge>(`/vehicle-badges/${id}`)
      return response.data
    } catch (error) {
      console.error('Error fetching vehicle badge by id:', error)
      return null
    }
  },

  getStats: async (): Promise<VehicleBadgeStats> => {
    try {
      const response = await api.get<VehicleBadgeStats>('/vehicle-badges/stats')
      return response.data
    } catch (error) {
      console.error('Error fetching vehicle badge stats:', error)
      return {
        total: 0,
        active: 0,
        expired: 0,
        expiringSoon: 0,
      }
    }
  },
}

// Re-export for backward compatibility
export const vehicleBadgeService = vehicleBadgeApi
export default vehicleBadgeApi
