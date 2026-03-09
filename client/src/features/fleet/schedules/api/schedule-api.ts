// Schedule API Service (AppSheet sync only)

import api from '@/lib/api'

const SYNC_CHUNK_SIZE = 500

export const scheduleApi = {
  /** Push AppSheet-polled schedules to backend for DB persistence (chunked) */
  syncFromAppSheet: async (scheduleData: unknown[]): Promise<void> => {
    if (!scheduleData.length) return
    try {
      for (let i = 0; i < scheduleData.length; i += SYNC_CHUNK_SIZE) {
        const chunk = scheduleData.slice(i, i + SYNC_CHUNK_SIZE)
        await api.post('/vehicles/schedules/appsheet-sync', { schedules: chunk })
      }
    } catch (error) {
      console.warn('AppSheet schedule sync to DB failed:', error)
    }
  },
}

export default scheduleApi
