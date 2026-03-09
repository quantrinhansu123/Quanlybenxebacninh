// Route API Service (AppSheet sync only — routes are read from DB via other endpoints)

import api from '@/lib/api'

/** Chunk size for backend sync batches */
const SYNC_CHUNK_SIZE = 500

export const routeApi = {
  /** Push AppSheet-polled routes to backend for DB persistence (chunked) */
  syncFromAppSheet: async (routes: unknown[]): Promise<void> => {
    if (!routes.length) return
    try {
      for (let i = 0; i < routes.length; i += SYNC_CHUNK_SIZE) {
        const chunk = (routes as Record<string, unknown>[]).slice(i, i + SYNC_CHUNK_SIZE)
        await api.post('/vehicles/routes/appsheet-sync', { routes: chunk })
      }
    } catch (error) {
      console.warn('AppSheet route sync to DB failed:', error)
    }
  },
}

export const routeService = routeApi
export default routeApi
