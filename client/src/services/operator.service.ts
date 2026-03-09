import api from '@/lib/api'
import type { Operator, OperatorInput } from '@/types'

export const operatorService = {
  getAll: async (isActive?: boolean): Promise<Operator[]> => {
    try {
      const params = new URLSearchParams()
      if (isActive !== undefined) params.append('isActive', String(isActive))

      const queryString = params.toString()
      const url = queryString ? `/operators?${queryString}` : '/operators'

      const response = await api.get<Operator[]>(url)
      return response.data
    } catch (error) {
      console.error('Error fetching operators:', error)
      return []
    }
  },

  /**
   * Get all operators including legacy ones from datasheet
   * Returns 1154+ operators from datasheet/Xe unique owner_names
   */
  getLegacy: async (): Promise<Operator[]> => {
    try {
      const response = await api.get<Operator[]>('/operators/legacy')
      return response.data
    } catch (error) {
      console.error('Error fetching legacy operators:', error)
      return []
    }
  },

  getById: async (id: string): Promise<Operator> => {
    const response = await api.get<Operator>(`/operators/${id}`)
    return response.data
  },

  /**
   * Get next available operator code (DV001, DV002...)
   */
  getNextCode: async (): Promise<string> => {
    try {
      const response = await api.get<{ code: string }>('/operators/next-code')
      return response.data.code
    } catch (error) {
      console.error('Error getting next operator code:', error)
      return 'DV001'
    }
  },

  /**
   * Check if a tax code already exists
   */
  checkTaxCode: async (taxCode: string, excludeId?: string): Promise<{ exists: boolean; operatorName?: string }> => {
    try {
      const params = new URLSearchParams({ taxCode })
      if (excludeId) params.append('excludeId', excludeId)
      const response = await api.get<{ exists: boolean; operatorName?: string }>(`/operators/check-tax-code?${params}`)
      return response.data
    } catch (error) {
      console.error('Error checking tax code:', error)
      return { exists: false }
    }
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

  // Legacy (RTDB/Google Sheets) operators
  updateLegacy: async (id: string, input: Partial<OperatorInput>): Promise<Operator> => {
    const response = await api.put<Operator>(`/operators/legacy/${id}`, input)
    return response.data
  },

  deleteLegacy: async (id: string): Promise<void> => {
    await api.delete(`/operators/legacy/${id}`)
  },
}
