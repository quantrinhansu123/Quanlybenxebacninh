// Dispatch Feature API Service

import api from '@/lib/api'
import type {
  DispatchRecord,
  DispatchInput,
  DispatchStatus,
  DispatchFilters,
  PassengerDropInput,
  PermitInput,
  PaymentInput,
  DepartureOrderInput,
  ExitInput,
} from '../types'

export const dispatchApi = {
  // Get all dispatch records with optional filters
  getAll: async (filters?: DispatchFilters): Promise<DispatchRecord[]> => {
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.vehicleId) params.append('vehicleId', filters.vehicleId)
      if (filters?.driverId) params.append('driverId', filters.driverId)
      if (filters?.routeId) params.append('routeId', filters.routeId)
      if (filters?.from) params.append('from', filters.from)
      if (filters?.to) params.append('to', filters.to)

      const queryString = params.toString()
      const url = queryString ? `/dispatch?${queryString}` : '/dispatch'

      const response = await api.get<DispatchRecord[]>(url)
      return response.data
    } catch (error) {
      console.error('Error fetching dispatch records:', error)
      return []
    }
  },

  // Get single dispatch record by ID
  getById: async (id: string): Promise<DispatchRecord> => {
    const response = await api.get<DispatchRecord>(`/dispatch/${id}`)
    return response.data
  },

  // Create new dispatch record (vehicle entry)
  create: async (input: DispatchInput): Promise<DispatchRecord> => {
    const response = await api.post<DispatchRecord>('/dispatch', input)
    return response.data
  },

  // Record passenger drop-off
  recordPassengerDrop: async (
    id: string,
    input: PassengerDropInput
  ): Promise<DispatchRecord> => {
    const response = await api.post<DispatchRecord>(`/dispatch/${id}/passenger-drop`, input)
    return response.data
  },

  // Issue boarding permit
  issuePermit: async (id: string, input: PermitInput): Promise<DispatchRecord> => {
    const response = await api.post<DispatchRecord>(`/dispatch/${id}/permit`, input)
    return response.data
  },

  // Process payment
  processPayment: async (id: string, input: PaymentInput): Promise<DispatchRecord> => {
    const response = await api.post<DispatchRecord>(`/dispatch/${id}/payment`, input)
    return response.data
  },

  // Issue departure order
  issueDepartureOrder: async (
    id: string,
    input: DepartureOrderInput
  ): Promise<DispatchRecord> => {
    const response = await api.post<DispatchRecord>(`/dispatch/${id}/departure-order`, input)
    return response.data
  },

  // Record vehicle exit
  recordExit: async (id: string, input?: ExitInput): Promise<DispatchRecord> => {
    const response = await api.post<DispatchRecord>(`/dispatch/${id}/exit`, input || {})
    return response.data
  },

  // Bulk exit multiple vehicles
  bulkExit: async (ids: string[], input?: ExitInput): Promise<DispatchRecord[]> => {
    const response = await api.post<DispatchRecord[]>('/dispatch/bulk-exit', {
      ids,
      ...input,
    })
    return response.data
  },

  // Delete dispatch record
  delete: async (id: string): Promise<void> => {
    await api.delete(`/dispatch/${id}`)
  },

  // Legacy methods for backward compatibility
  updateStatus: async (
    id: string,
    status: DispatchStatus,
    data?: Partial<DispatchRecord>
  ): Promise<DispatchRecord> => {
    if (status === 'permit_issued') {
      return dispatchApi.issuePermit(id, {
        transportOrderCode: data?.transportOrderCode || '',
        plannedDepartureTime: data?.plannedDepartureTime || new Date().toISOString(),
        seatCount: data?.seatCount || 0,
      })
    }
    if (status === 'paid') {
      return dispatchApi.processPayment(id, {
        paymentAmount: data?.paymentAmount || 0,
      })
    }
    if (status === 'departed') {
      return dispatchApi.recordExit(id)
    }
    throw new Error('Legacy updateStatus is deprecated. Use specific workflow methods.')
  },

  depart: async (
    id: string,
    _exitTime: string,
    passengerCount: number
  ): Promise<DispatchRecord> => {
    await dispatchApi.issueDepartureOrder(id, { passengersDeparting: passengerCount })
    return dispatchApi.recordExit(id)
  },
}

export default dispatchApi
