import api from '@/lib/api'
import type { Route, RouteInput } from '@/types'

export interface LegacyRoute {
  id: string
  routeCode: string
  routeCodeOld: string
  routeCodeFixed: string
  routeClass: string
  routeType: string
  routePath: string
  departureStation: string
  departureStationRef: string
  departureProvince: string
  departureProvinceOld: string
  arrivalStation: string
  arrivalStationRef: string
  arrivalProvince: string
  arrivalProvinceOld: string
  distanceKm: number
  minIntervalMinutes: number
  totalTripsMonth: number
  tripsInOperation: number
  remainingCapacity: number
  operationStatus: string
  calendarType: string
  decisionNumber: string
  decisionDate: string
  issuingAuthority: string
  notes: string
  filePath: string
  _source: string
}

// Cache for legacy routes
let legacyRoutesCache: { data: LegacyRoute[]; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const routeService = {
  getAll: async (_operatorId?: string, _limit?: number, isActive?: boolean): Promise<Route[]> => {
    try {
      const params = new URLSearchParams()
      if (isActive !== undefined) params.append('isActive', String(isActive))

      const queryString = params.toString()
      const url = queryString ? `/routes?${queryString}` : '/routes'

      const response = await api.get<Route[]>(url)
      return response.data
    } catch (error) {
      console.error('Error fetching routes:', error)
      return []
    }
  },

  getLegacy: async (forceRefresh = false): Promise<LegacyRoute[]> => {
    try {
      // Check cache
      if (!forceRefresh && legacyRoutesCache && Date.now() - legacyRoutesCache.timestamp < CACHE_TTL) {
        return legacyRoutesCache.data
      }

      const url = forceRefresh ? '/routes/legacy?refresh=true' : '/routes/legacy'
      const response = await api.get<LegacyRoute[]>(url)
      
      // Update cache
      legacyRoutesCache = { data: response.data, timestamp: Date.now() }
      
      return response.data
    } catch (error) {
      console.error('Error fetching legacy routes:', error)
      if (legacyRoutesCache) {
        return legacyRoutesCache.data
      }
      return []
    }
  },

  getById: async (id: string): Promise<Route> => {
    const response = await api.get<Route>(`/routes/${id}`)
    return response.data
  },

  create: async (input: RouteInput): Promise<Route> => {
    const response = await api.post<Route>('/routes', input)
    return response.data
  },

  update: async (id: string, input: Partial<RouteInput>): Promise<Route> => {
    const response = await api.put<Route>(`/routes/${id}`, input)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/routes/${id}`)
  },
}
