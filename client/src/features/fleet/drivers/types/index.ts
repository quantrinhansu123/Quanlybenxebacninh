// Drivers Domain Types

export type {
  Driver,
  DriverInput,
} from '@/types/fleet.types'

// Feature-specific types
export interface DriverFilters {
  search?: string
  operatorId?: string
  isActive?: boolean
}

export interface DriverFormMode {
  mode: 'create' | 'edit' | 'view'
  driverId?: string
}
