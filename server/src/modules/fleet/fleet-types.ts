/**
 * Fleet Module Types
 * Type definitions for Vehicle and Driver entities
 */

// ========== Vehicle Types ==========

export interface VehicleDocument {
  number: string
  issueDate: string
  expiryDate: string
  issuingAuthority?: string | null
  documentUrl?: string | null
  notes?: string | null
  isValid?: boolean
}

export interface VehicleDocuments {
  registration?: VehicleDocument
  inspection?: VehicleDocument
  insurance?: VehicleDocument
  operation_permit?: VehicleDocument
  emblem?: VehicleDocument
}

export type DocumentType = 'registration' | 'inspection' | 'insurance' | 'operation_permit' | 'emblem'

export interface VehicleRecord {
  id: string
  plateNumber: string
  vehicleTypeId?: string | null
  vehicleType?: {
    id: string
    name: string
  }
  operatorId?: string | null
  operator?: {
    id: string
    name: string
    code: string
  }
  seatCapacity: number
  bedCapacity?: number
  manufactureYear?: number | null
  chassisNumber?: string | null
  engineNumber?: string | null
  color?: string | null
  imageUrl?: string | null
  insuranceExpiryDate?: string | null
  inspectionExpiryDate?: string | null
  cargoLength?: number | null
  cargoWidth?: number | null
  cargoHeight?: number | null
  gpsProvider?: string | null
  gpsUsername?: string | null
  gpsPassword?: string | null
  province?: string | null
  isActive: boolean
  notes?: string | null
  documents?: VehicleDocuments
  createdAt: string
  updatedAt: string
}

export interface VehicleDBRecord {
  id: string
  plate_number: string
  vehicle_type_id?: string | null
  operator_id?: string | null
  seat_capacity: number
  bed_capacity?: number | null
  manufacture_year?: number | null
  chassis_number?: string | null
  engine_number?: string | null
  color?: string | null
  image_url?: string | null
  insurance_expiry_date?: string | null
  inspection_expiry_date?: string | null
  cargo_length?: number | null
  cargo_width?: number | null
  cargo_height?: number | null
  gps_provider?: string | null
  gps_username?: string | null
  gps_password?: string | null
  province?: string | null
  is_active: boolean
  notes?: string | null
  created_at: string
  updated_at: string
  // Joined relations (optional)
  operators?: {
    id: string
    name: string
    code: string
  }
  vehicle_types?: {
    id: string
    name: string
  }
}

export interface VehicleDocumentDB {
  id: string
  vehicle_id: string
  document_type: DocumentType
  document_number: string
  issue_date: string
  expiry_date: string
  issuing_authority?: string | null
  document_url?: string | null
  notes?: string | null
  updated_by?: string | null
  created_at: string
  updated_at: string
}

export interface VehicleFilters {
  operatorId?: string
  isActive?: boolean
  vehicleTypeId?: string
}

// ========== Driver Types ==========

export interface OperatorInfo {
  id: string
  name: string
  code: string
  isPrimary?: boolean
}

export interface DriverRecord {
  id: string
  operatorId?: string | null
  operator?: OperatorInfo
  operatorIds: string[]
  operators: OperatorInfo[]
  fullName: string
  idNumber: string
  phone?: string | null
  email?: string | null
  province?: string | null
  district?: string | null
  address?: string | null
  licenseNumber: string
  licenseClass: string
  licenseIssueDate?: string | null
  licenseExpiryDate?: string | null
  imageUrl?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DriverDBRecord {
  id: string
  operator_id?: string | null
  full_name: string
  id_number: string
  phone?: string | null
  email?: string | null
  province?: string | null
  district?: string | null
  address?: string | null
  license_number: string
  license_class: string
  license_issue_date?: string | null
  license_expiry_date?: string | null
  image_url?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined relations (optional)
  operators?: {
    id: string
    name: string
    code: string
  }
  driver_operators?: Array<{
    operator_id: string
    is_primary: boolean
    operators?: {
      id: string
      name: string
      code: string
    }
  }>
}

export interface DriverFilters {
  operatorId?: string
  isActive?: boolean
}

// ========== Audit Log Types ==========

export interface AuditLogRecord {
  id: string
  userId?: string | null
  userName: string
  action: string
  recordId: string
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  createdAt: string
}
