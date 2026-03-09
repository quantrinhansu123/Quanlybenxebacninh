import api from '@/lib/api'
import type { ServiceFormula, ServiceFormulaInput } from '@/types'

export const serviceFormulaService = {
  getAll: async (formulaType?: 'quantity' | 'price', isActive?: boolean): Promise<ServiceFormula[]> => {
    try {
      const params = new URLSearchParams()
      if (formulaType) params.append('formulaType', formulaType)
      if (isActive !== undefined) params.append('isActive', String(isActive))

      const queryString = params.toString()
      const url = queryString ? `/service-formulas?${queryString}` : '/service-formulas'

      const response = await api.get<ServiceFormula[]>(url)
      return response.data
    } catch (error) {
      console.error('Error fetching service formulas:', error)
      return []
    }
  },

  getById: async (id: string): Promise<ServiceFormula> => {
    const response = await api.get<ServiceFormula>(`/service-formulas/${id}`)
    return response.data
  },

  create: async (input: ServiceFormulaInput): Promise<ServiceFormula> => {
    const response = await api.post<ServiceFormula>('/service-formulas', input)
    return response.data
  },

  update: async (id: string, input: Partial<ServiceFormulaInput>): Promise<ServiceFormula> => {
    const response = await api.put<ServiceFormula>(`/service-formulas/${id}`, input)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/service-formulas/${id}`)
  },
}
