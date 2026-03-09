// Vehicles Domain Types

export type {
  Vehicle,
  VehicleInput,
  VehicleDocuments,
  DocumentInfo,
  VehicleType,
  VehicleTypeInput,
} from '@/types/fleet.types'

// Feature-specific types
export interface VehicleFilters {
  search?: string
  operatorId?: string
  vehicleTypeId?: string
  provinceId?: string
  isActive?: boolean
}

export interface VehicleFormMode {
  mode: 'create' | 'edit' | 'view'
  vehicleId?: string
}
