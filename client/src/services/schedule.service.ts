import api from '@/lib/api'
import type { Schedule, ScheduleInput, ValidateDayResponse, TripLimitResponse } from '@/types'

export const scheduleService = {
  getAll: async (routeId?: string, operatorId?: string, isActive?: boolean, direction?: string): Promise<Schedule[]> => {
    try {
      const params = new URLSearchParams()
      if (routeId) params.append('routeId', routeId)
      if (operatorId) params.append('operatorId', operatorId)
      if (isActive !== undefined) params.append('isActive', String(isActive))
      if (direction) params.append('direction', direction)

      const queryString = params.toString()
      const url = queryString ? `/schedules?${queryString}` : '/schedules'

      const response = await api.get<Schedule[]>(url)
      return response.data
    } catch (error) {
      console.error('Error fetching schedules:', error)
      return []
    }
  },

  getById: async (id: string): Promise<Schedule> => {
    const response = await api.get<Schedule>(`/schedules/${id}`)
    return response.data
  },

  create: async (input: ScheduleInput): Promise<Schedule> => {
    const response = await api.post<Schedule>('/schedules', input)
    return response.data
  },

  update: async (id: string, input: Partial<ScheduleInput>): Promise<Schedule> => {
    const response = await api.put<Schedule>(`/schedules/${id}`, input)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/schedules/${id}`)
  },

  validateDay: async (scheduleId: string, date: string): Promise<ValidateDayResponse> => {
    const response = await api.post<ValidateDayResponse>('/schedules/validate-day', { scheduleId, date })
    return response.data
  },

  checkTripLimit: async (routeId: string, vehiclePlateNumber: string, date: string): Promise<TripLimitResponse> => {
    const params = new URLSearchParams({ routeId, vehiclePlateNumber, date })
    const response = await api.get<TripLimitResponse>(`/schedules/trip-limit?${params}`)
    return response.data
  },
}
