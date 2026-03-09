import api from '@/lib/api'

export interface QuanLyBadge {
  id: string
  badge_number: string
  license_plate_sheet: string
  badge_type: string
  badge_color: string
  issue_date: string
  expiry_date: string
  status: string
  file_code: string
  issue_type: string
  issuing_authority_ref: string
  route_id: string
  route_code: string
  route_name: string
  itinerary: string
  vehicle_type: string
}

export interface QuanLyVehicle {
  id: string
  plateNumber: string
  seatCapacity: number
  bedCapacity?: number
  operatorId?: string | null
  operatorName: string
  vehicleType: string
  vehicleCategory?: string
  inspectionExpiryDate: string
  isActive: boolean
  hasBadge?: boolean
  hasValidBadge?: boolean
  source: string
}

export interface QuanLyOperator {
  id: string
  name: string
  province: string
  phone: string
  email: string
  address: string
  representativeName: string
  taxCode: string
  isTicketDelegated: boolean
  isActive: boolean
  source: string
}

export interface QuanLyRoute {
  id: string
  code: string
  name: string
  startPoint: string
  endPoint: string
  distance: string
  routeType: string
}

export interface QuanLyData {
  badges?: QuanLyBadge[]
  vehicles?: QuanLyVehicle[]
  operators?: QuanLyOperator[]
  routes?: QuanLyRoute[]
  meta: {
    badgeCount: number
    vehicleCount: number
    operatorCount: number
    routeCount: number
    cachedAt: string
  }
}

// Frontend cache
let dataCache: QuanLyData | null = null
let dataCacheTime = 0
const FE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes frontend cache - stable numbers

export const quanlyDataService = {
  /**
   * Get all data for Quản lý thông tin module in a single request
   * @param include - comma-separated list of data to include (badges,vehicles,operators,routes)
   * @param forceRefresh - bypass cache and fetch fresh data
   */
  async getAll(include?: string[], forceRefresh = false): Promise<QuanLyData> {
    try {
      const now = Date.now()
      
      // Return cached data if valid
      if (!forceRefresh && dataCache && (now - dataCacheTime) < FE_CACHE_TTL) {
        // Filter cached data if specific includes requested
        if (include && include.length > 0) {
          const filtered: QuanLyData = { meta: dataCache.meta }
          if (include.includes('badges') && dataCache.badges) filtered.badges = dataCache.badges
          if (include.includes('vehicles') && dataCache.vehicles) filtered.vehicles = dataCache.vehicles
          if (include.includes('operators') && dataCache.operators) filtered.operators = dataCache.operators
          if (include.includes('routes') && dataCache.routes) filtered.routes = dataCache.routes
          return filtered
        }
        return dataCache
      }
      
      const params: Record<string, string> = {}
      if (include && include.length > 0) {
        params.include = include.join(',')
      }
      if (forceRefresh) {
        params.refresh = 'true'
      }
      
      const response = await api.get<QuanLyData>('/quanly-data', { params })
      
      // Cache the response if it includes all data
      if (!include || include.length === 4) {
        dataCache = response.data
        dataCacheTime = now
      }
      
      return response.data
    } catch (error) {
      console.error('Error fetching quanly data:', error)
      // Return stale cache on error
      if (dataCache) return dataCache
      throw error
    }
  },
  
  /**
   * Get just badges
   */
  async getBadges(forceRefresh = false): Promise<QuanLyBadge[]> {
    const data = await this.getAll(['badges'], forceRefresh)
    return data.badges || []
  },
  
  /**
   * Get just vehicles
   */
  async getVehicles(forceRefresh = false): Promise<QuanLyVehicle[]> {
    const data = await this.getAll(['vehicles'], forceRefresh)
    return data.vehicles || []
  },
  
  /**
   * Get just operators
   */
  async getOperators(forceRefresh = false): Promise<QuanLyOperator[]> {
    const data = await this.getAll(['operators'], forceRefresh)
    return data.operators || []
  },
  
  /**
   * Get just routes
   */
  async getRoutes(forceRefresh = false): Promise<QuanLyRoute[]> {
    const data = await this.getAll(['routes'], forceRefresh)
    return data.routes || []
  },
  
  /**
   * Get lightweight stats
   */
  async getStats(): Promise<QuanLyData['meta']> {
    const response = await api.get<QuanLyData['meta']>('/quanly-data/stats')
    return response.data
  },
  
  /**
   * Clear frontend cache
   */
  clearCache() {
    dataCache = null
    dataCacheTime = 0
  },
}
