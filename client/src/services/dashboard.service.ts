import api from '@/lib/api'

export interface DashboardStats {
  totalVehiclesToday: number    // Total unique vehicles entered today
  vehiclesInStation: number     // Currently in station
  vehiclesDepartedToday: number // Already departed
  revenueToday: number
  invalidVehicles: number
}

export interface ChartDataPoint {
  hour: string
  count: number
}

export interface RecentActivity {
  id: string
  vehiclePlateNumber: string
  route: string
  entryTime: string
  status: string
}

export interface Warning {
  type: 'vehicle' | 'driver'
  plateNumber?: string
  name?: string
  document: string
  expiryDate: string
  vehicleId?: string
  driverId?: string
  badgeType?: string
}

export interface WeeklyStat {
  day: string
  dayName: string
  departed: number
  inStation: number
  total: number
}

export interface MonthlyStat {
  month: string
  monthName: string
  departed: number
  waiting: number
  other: number
}

export interface RouteBreakdown {
  routeId: string
  routeName: string
  count: number
  percentage: number
}

export interface DashboardData {
  stats: DashboardStats
  chartData: ChartDataPoint[]
  recentActivity: RecentActivity[]
  warnings: Warning[]
  weeklyStats: WeeklyStat[]
  monthlyStats: MonthlyStat[]
  routeBreakdown: RouteBreakdown[]
}

export interface UpdateDocumentInput {
  documentNumber: string
  issueDate: string
  expiryDate: string
  issuingAuthority?: string
  notes?: string
}

// Map document display name to document type
const DOCUMENT_NAME_TO_TYPE: Record<string, string> = {
  'Đăng ký': 'registration',
  'Đăng kiểm': 'inspection',
  'Bảo hiểm': 'insurance',
  'Phù hiệu': 'emblem',
  'Giấy phép kinh doanh': 'operation_permit',
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    try {
      const response = await api.get<DashboardStats>('/dashboard/stats')
      return response.data
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return {
        totalVehiclesToday: 0,
        vehiclesInStation: 0,
        vehiclesDepartedToday: 0,
        revenueToday: 0,
        invalidVehicles: 0,
      }
    }
  },

  getChartData: async (): Promise<ChartDataPoint[]> => {
    try {
      const response = await api.get<ChartDataPoint[]>('/dashboard/chart-data')
      return response.data
    } catch (error) {
      console.error('Error fetching chart data:', error)
      return []
    }
  },

  getRecentActivity: async (): Promise<RecentActivity[]> => {
    try {
      const response = await api.get<RecentActivity[]>('/dashboard/recent-activity')
      return response.data
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      return []
    }
  },

  getWarnings: async (): Promise<Warning[]> => {
    try {
      const response = await api.get<Warning[]>('/dashboard/warnings')
      return response.data
    } catch (error) {
      console.error('Error fetching warnings:', error)
      return []
    }
  },

  getDashboardData: async (): Promise<DashboardData> => {
    // Single API call - no fallback to prevent masking backend issues
    // Dashboard service on backend already handles data aggregation
    const response = await api.get<DashboardData>('/dashboard')
    return response.data
  },

  /**
   * Update a vehicle document by looking up the vehicle by plate number
   * and updating the specific document type
   */
  updateVehicleDocument: async (
    plateNumber: string,
    documentName: string,
    data: UpdateDocumentInput
  ): Promise<void> => {
    // Map document name to type
    const documentType = DOCUMENT_NAME_TO_TYPE[documentName]
    if (!documentType) {
      throw new Error(`Unknown document type: ${documentName}`)
    }

    // Special handling for Phù hiệu - stored in vehicle_badges table
    if (documentType === 'emblem') {
      // Lookup badge by plate number
      const badgeResponse = await api.get<{ id: string; badge_number?: string }>(`/vehicle-badges/by-plate/${encodeURIComponent(plateNumber)}`)
      const badge = badgeResponse.data

      if (!badge?.id) {
        throw new Error(`Badge not found for plate number: ${plateNumber}`)
      }

      // Update badge with new dates
      await api.put(`/vehicle-badges/${badge.id}`, {
        badge_number: data.documentNumber || badge.badge_number,
        issue_date: data.issueDate,
        expiry_date: data.expiryDate,
        notes: data.notes,
      })
      return
    }

    // For other document types, use vehicle documents update
    // First lookup vehicle by plate number
    const lookupResponse = await api.get<{ id: string }>(`/vehicles/lookup/${encodeURIComponent(plateNumber)}`)
    const vehicleId = lookupResponse.data?.id

    if (!vehicleId) {
      throw new Error(`Vehicle not found with plate number: ${plateNumber}`)
    }

    // Build documents update object
    const documents: Record<string, { number: string; issueDate: string; expiryDate: string; issuingAuthority?: string; notes?: string }> = {
      [documentType]: {
        number: data.documentNumber,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        issuingAuthority: data.issuingAuthority,
        notes: data.notes,
      }
    }

    // Update vehicle with the document
    await api.put(`/vehicles/${vehicleId}`, { documents })
  },
}
