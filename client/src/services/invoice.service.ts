import api from '@/lib/api'
import type { Invoice, InvoiceInput } from '@/types'

export const invoiceService = {
  getAll: async (
    operatorId?: string,
    paymentStatus?: 'pending' | 'paid' | 'overdue' | 'cancelled',
    startDate?: string,
    endDate?: string
  ): Promise<Invoice[]> => {
    const params: Record<string, string> = {}
    if (operatorId) params.operatorId = operatorId
    if (paymentStatus) params.paymentStatus = paymentStatus
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    const response = await api.get<Invoice[]>('/invoices', { params })
    return response.data
  },

  getById: async (id: string): Promise<Invoice> => {
    const response = await api.get<Invoice>(`/invoices/${id}`)
    return response.data
  },

  create: async (data: InvoiceInput): Promise<Invoice> => {
    const response = await api.post<Invoice>('/invoices', data)
    return response.data
  },

  update: async (id: string, data: Partial<InvoiceInput>): Promise<Invoice> => {
    const response = await api.put<Invoice>(`/invoices/${id}`, data)
    return response.data
  },

  updatePayment: async (
    id: string,
    data: {
      paymentStatus: 'pending' | 'paid' | 'overdue' | 'cancelled'
      paymentDate?: string
    }
  ): Promise<Invoice> => {
    const response = await api.patch<Invoice>(`/invoices/${id}/payment`, data)
    return response.data
  },
}

