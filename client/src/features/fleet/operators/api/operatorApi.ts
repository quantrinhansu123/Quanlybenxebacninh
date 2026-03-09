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

  /** Push AppSheet-polled operators to backend for DB persistence (chunked) */
  syncFromAppSheet: async (operators: unknown[]): Promise<void> => {
    if (!operators.length) return
    try {
      for (let i = 0; i < operators.length; i += SYNC_CHUNK_SIZE) {
        const chunk = (operators as Record<string, unknown>[]).slice(i, i + SYNC_CHUNK_SIZE)
        await api.post('/vehicles/operators/appsheet-sync', { operators: chunk })
      }
    } catch (error) {
      console.warn('AppSheet operator sync to DB failed:', error)
    }
  },
}

// Re-export for backward compatibility
export const operatorService = operatorApi
export default operatorApi
