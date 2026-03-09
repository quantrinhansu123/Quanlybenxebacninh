import api from '@/lib/api'
import type { Shift } from '@/types'

// Re-export Shift type for convenience
export type { Shift } from '@/types'

// Default shifts for fallback
const DEFAULT_SHIFTS: Shift[] = [
  { id: 'shift-1', name: 'Ca 1', startTime: '06:00:00', endTime: '14:00:00', isActive: true },
  { id: 'shift-2', name: 'Ca 2', startTime: '14:00:00', endTime: '22:00:00', isActive: true },
  { id: 'shift-3', name: 'Ca 3', startTime: '22:00:00', endTime: '06:00:00', isActive: true },
  { id: 'shift-4', name: 'Hành chính', startTime: '07:30:00', endTime: '17:00:00', isActive: true },
]

export const shiftService = {
  getAll: async (): Promise<Shift[]> => {
    try {
      const response = await api.get<Shift[]>('/shifts')
      if (!response.data || response.data.length === 0) {
        return DEFAULT_SHIFTS
      }
      return response.data
    } catch {
      // Shifts API not available, using default shifts
      return DEFAULT_SHIFTS
    }
  },

  getById: async (id: string): Promise<Shift> => {
    try {
      const response = await api.get<Shift>(`/shifts/${id}`)
      return response.data
    } catch (error) {
      const defaultShift = DEFAULT_SHIFTS.find(s => s.id === id)
      if (defaultShift) return defaultShift
      throw new Error('Shift not found')
    }
  },

  create: async (input: { name: string; startTime: string; endTime: string }): Promise<Shift> => {
    const response = await api.post<Shift>('/shifts', input)
    return response.data
  },

  update: async (
    id: string,
    input: Partial<{ name: string; startTime: string; endTime: string; isActive: boolean }>
  ): Promise<Shift> => {
    const response = await api.put<Shift>(`/shifts/${id}`, input)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/shifts/${id}`)
  },
}
