// Vehicle Badges Domain Types

export type { VehicleBadge } from '@/types/fleet.types'

// Feature-specific types
export interface VehicleBadgeFilters {
  search?: string
  status?: string
  badgeType?: string
  badgeColor?: string
  page?: number
  limit?: number
}
