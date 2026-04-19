// Operator API Service

import api from '@/lib/api'
import type { Operator, OperatorInput } from '../types'

/** Chunk size for backend sync batches */
const SYNC_CHUNK_SIZE = 500

export const operatorApi = {
  getAll: async (_isActive?: boolean): Promise<Operator[]> => {
    try {
      // Use legacy endpoint to get operators from RTDB (Google Sheets data)
      // This returns 2943+ operators vs only 3 from Supabase
      const response = await api.get<Operator[]>('/operators/legacy')
      return response.data
    } catch (error) {
      console.error('Error fetching operators:', error)
      return []
    }
  },

  getById: async (id: string): Promise<Operator> => {
    const response = await api.get<Operator>(`/operators/${id}`)
    return response.data
  },

  create: async (input: OperatorInput): Promise<Operator> => {
    const response = await api.post<Operator>('/operators', input)
    return response.data
  },

  update: async (id: string, input: Partial<OperatorInput>): Promise<Operator> => {
    const response = await api.put<Operator>(`/operators/${id}`, input)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/operators/${id}`)
  },
}

// Re-export for backward compatibility
export const operatorService = operatorApi
export default operatorApi
