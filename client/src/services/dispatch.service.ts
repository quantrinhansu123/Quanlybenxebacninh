import api from '@/lib/api'
import type { DispatchRecord, DispatchInput, DispatchStatus } from '@/types'

export const dispatchService = {
  getAll: async (
    status?: DispatchStatus,
    vehicleId?: string,
    driverId?: string,
    routeId?: string
  ): Promise<DispatchRecord[]> => {
    try {
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      if (vehicleId) params.append('vehicleId', vehicleId)
      if (driverId) params.append('driverId', driverId)
      if (routeId) params.append('routeId', routeId)

      const queryString = params.toString()
      const url = queryString ? `/dispatch?${queryString}` : '/dispatch'
      const response = await api.get<DispatchRecord[]>(url)
      return response.data
    } catch (error) {
      console.error('Error fetching dispatch records:', error)
      return []
    }
  },

  getById: async (id: string): Promise<DispatchRecord> => {
    const response = await api.get<DispatchRecord>(`/dispatch/${id}`)
    return response.data
  },

  create: async (input: DispatchInput): Promise<DispatchRecord> => {
    const response = await api.post<DispatchRecord>('/dispatch', input)
    return response.data
  },

  recordPassengerDrop: async (
    id: string,
    passengersArrived: number,
    routeId?: string
  ): Promise<DispatchRecord> => {
    const response = await api.post<DispatchRecord>(`/dispatch/${id}/passenger-drop`, {
      passengersArrived,
      routeId,
    })
    return response.data
  },

  issuePermit: async (
    id: string,
    data: {
      transportOrderCode?: string
      plannedDepartureTime: string
      seatCount: number
      permitStatus?: 'approved' | 'rejected'
      rejectionReason?: string
      routeId?: string
      scheduleId?: string
      replacementVehicleId?: string
      permitShiftId?: string
    }
  ): Promise<DispatchRecord> => {
    const response = await api.post<DispatchRecord>(`/dispatch/${id}/permit`, data)
    return response.data
  },

  processPayment: async (
    id: string,
    data: {
      paymentAmount: number
      paymentMethod?: 'cash' | 'bank_transfer' | 'card'
      invoiceNumber?: string
      paymentShiftId?: string
    }
  ): Promise<DispatchRecord> => {
    const response = await api.post<DispatchRecord>(`/dispatch/${id}/payment`, data)
    return response.data
  },

  issueDepartureOrder: async (
    id: string,
    passengersDeparting: number,
    departureOrderShiftId?: string
  ): Promise<DispatchRecord> => {
    const response = await api.post<DispatchRecord>(`/dispatch/${id}/departure-order`, {
      passengersDeparting,
      departureOrderShiftId,
    })
    return response.data
  },

  recordExit: async (
    id: string,
    exitTime?: string,
    passengersDeparting?: number,
    exitShiftId?: string
  ): Promise<DispatchRecord> => {
    const response = await api.post<DispatchRecord>(`/dispatch/${id}/exit`, {
      exitTime,
      passengersDeparting,
      exitShiftId,
    })
    return response.data
  },

  updateEntryImage: async (id: string, entryImageUrl: string): Promise<DispatchRecord> => {
    const response = await api.patch<{ dispatch: DispatchRecord }>(`/dispatch/${id}/entry-image`, {
      entryImageUrl,
    })
    return response.data.dispatch
  },

  // Legacy methods for backward compatibility
  updateStatus: async (
    id: string,
    status: DispatchStatus,
    data?: Partial<DispatchRecord>
  ): Promise<DispatchRecord> => {
    if (status === 'permit_issued') {
      return dispatchService.issuePermit(id, {
        transportOrderCode: data?.transportOrderCode || '',
        plannedDepartureTime: data?.plannedDepartureTime || new Date().toISOString(),
        seatCount: data?.seatCount || 0,
      })
    }
    if (status === 'paid') {
      return dispatchService.processPayment(id, {
        paymentAmount: data?.paymentAmount || 0,
      })
    }
    if (status === 'departed') {
      return dispatchService.recordExit(id)
    }
    throw new Error('Legacy updateStatus is deprecated. Use specific workflow methods.')
  },

  depart: async (
    id: string,
    _exitTime: string,
    passengerCount: number
  ): Promise<DispatchRecord> => {
    await dispatchService.issueDepartureOrder(id, passengerCount)
    return dispatchService.recordExit(id)
  },

  update: async (
    id: string,
    data: {
      vehicleId?: string
      driverId?: string
      routeId?: string
      entryTime?: string
      notes?: string
    }
  ): Promise<DispatchRecord> => {
    const response = await api.put<DispatchRecord>(`/dispatch/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/dispatch/${id}`)
  },

  cancel: async (id: string, reason?: string): Promise<DispatchRecord> => {
    const response = await api.post<{ dispatch: DispatchRecord }>(`/dispatch/${id}/cancel`, { reason })
    return response.data.dispatch
  },
}
