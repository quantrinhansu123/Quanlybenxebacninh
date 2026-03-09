import api from '@/lib/api'

export type OperationalStatus = 'trong_ben' | 'dang_chay'

export interface VehicleBadge {
  id: string
  badge_color: string
  badge_number: string
  badge_type: string
  bus_route_ref: string
  business_license_ref: string
  created_at: string
  created_by: string
  email_notification_sent: boolean
  expiry_date: string
  file_code: string
  issue_date: string
  issue_type: string
  issuing_authority_ref: string
  license_plate_sheet: string
  notes: string
  notification_ref: string
  previous_badge_number: string
  renewal_due_date: string
  renewal_reason: string
  renewal_reminder_shown: boolean
  replacement_vehicle_id: string
  revocation_date: string
  revocation_decision: string
  revocation_reason: string
  route_id: string
  route_code: string
  route_name: string
  itinerary: string
  status: string
  vehicle_id: string
  vehicle_type: string
  warn_duplicate_plate: boolean
  operational_status: OperationalStatus  // 'trong_ben' (in station) or 'dang_chay' (running)
}

export interface CreateVehicleBadgeInput {
  badge_number: string
  license_plate_sheet: string
  badge_type?: string
  badge_color?: string
  issue_date?: string
  expiry_date?: string
  status?: string
  file_code?: string
  issue_type?: string
  bus_route_ref?: string
  vehicle_type?: string
  notes?: string
}

export interface UpdateVehicleBadgeInput extends Partial<CreateVehicleBadgeInput> {}

export interface AllBadgesResponse {
  badges: (VehicleBadge & { is_expired: boolean })[]
  validCount: number
  expiredCount: number
}

// Frontend cache for badges
let badgesCache: VehicleBadge[] | null = null
let badgesCacheTime = 0
const FE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes frontend cache

export const vehicleBadgeService = {
  getAll: async (forceRefresh = false): Promise<VehicleBadge[]> => {
    try {
      const now = Date.now()
      
      // Return cached data if valid and not forcing refresh
      if (!forceRefresh && badgesCache && (now - badgesCacheTime) < FE_CACHE_TTL) {
        return badgesCache
      }
      
      const response = await api.get<VehicleBadge[]>('/vehicle-badges')
      badgesCache = response.data
      badgesCacheTime = now
      return response.data
    } catch (error) {
      console.error('Error fetching vehicle badges:', error)
      return badgesCache || [] // Return stale cache on error
    }
  },
  
  clearCache: () => {
    badgesCache = null
    badgesCacheTime = 0
  },

  getById: async (id: string): Promise<VehicleBadge | null> => {
    try {
      const response = await api.get<VehicleBadge>(`/vehicle-badges/${id}`)
      return response.data
    } catch (error) {
      console.error('Error fetching vehicle badge by id:', error)
      return null
    }
  },

  getByPlateNumber: async (plateNumber: string): Promise<VehicleBadge | null> => {
    try {
      const response = await api.get<VehicleBadge>(`/vehicle-badges/by-plate/${encodeURIComponent(plateNumber)}`)
      return response.data
    } catch (error) {
      console.error('Error fetching vehicle badge by plate number:', error)
      return null
    }
  },

  getAllByPlateNumber: async (plateNumber: string): Promise<AllBadgesResponse> => {
    try {
      const response = await api.get<AllBadgesResponse>(
        `/vehicle-badges/by-plate/${encodeURIComponent(plateNumber)}/all`
      )
      return response.data
    } catch (error) {
      console.error('Error fetching all badges by plate number:', error)
      return { badges: [], validCount: 0, expiredCount: 0 }
    }
  },

  getStats: async (): Promise<{
    total: number
    active: number
    expired: number
    expiringSoon: number
  }> => {
    try {
      const response = await api.get<{
        total: number
        active: number
        expired: number
        expiringSoon: number
      }>('/vehicle-badges/stats')
      return response.data
    } catch (error) {
      console.error('Error fetching vehicle badge stats:', error)
      return {
        total: 0,
        active: 0,
        expired: 0,
        expiringSoon: 0,
      }
    }
  },

  create: async (data: CreateVehicleBadgeInput): Promise<VehicleBadge> => {
    const response = await api.post<VehicleBadge>('/vehicle-badges', data)
    vehicleBadgeService.clearCache()
    return response.data
  },

  update: async (id: string, data: UpdateVehicleBadgeInput): Promise<VehicleBadge> => {
    const response = await api.put<VehicleBadge>(`/vehicle-badges/${id}`, data)
    vehicleBadgeService.clearCache()
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/vehicle-badges/${id}`)
    vehicleBadgeService.clearCache()
  },
}
