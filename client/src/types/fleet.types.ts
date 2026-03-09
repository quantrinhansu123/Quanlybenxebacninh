// Fleet Feature Types - Vehicle, Driver, Operator, Vehicle Badge

// ==================== Operator Types ====================

export interface Operator {
  id: string
  name: string
  code: string
  taxCode?: string

  isTicketDelegated: boolean
  province?: string
  district?: string
  address?: string

  phone?: string
  email?: string
  representativeName?: string
  representativePosition?: string

  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface OperatorInput {
  name: string
  code: string
  taxCode?: string

  isTicketDelegated?: boolean
  province?: string
  district?: string
  address?: string

  phone?: string
  email?: string
  representativeName?: string
  representativePosition?: string
}

// ==================== Vehicle Type Types ====================

export interface VehicleType {
  id: string
  name: string
  description?: string
  defaultSeatCapacity?: number | null
  defaultBedCapacity?: number | null
  createdAt?: string
}

export interface VehicleTypeInput {
  name: string
  description?: string
}

// ==================== Vehicle Types ====================

export interface DocumentInfo {
  number: string
  issueDate: string
  expiryDate: string
  issuingAuthority?: string
  documentUrl?: string
  notes?: string
  isValid: boolean
}

export interface VehicleDocuments {
  registration?: DocumentInfo
  inspection?: DocumentInfo
  insurance?: DocumentInfo
  operation_permit?: DocumentInfo
  emblem?: DocumentInfo
}

export interface Vehicle {
  id: string
  plateNumber: string
  vehicleTypeId?: string
  vehicleType?: VehicleType
  operatorId: string
  operator?: Operator
  operatorName?: string  // For legacy vehicles without operatorId
  seatCapacity: number
  bedCapacity?: number
  manufactureYear?: number
  chassisNumber?: string
  engineNumber?: string
  color?: string
  imageUrl?: string

  insuranceExpiryDate?: string
  inspectionExpiryDate?: string

  cargoLength?: number
  cargoWidth?: number
  cargoHeight?: number

  gpsProvider?: string
  gpsUsername?: string
  gpsPassword?: string

  province?: string

  isActive: boolean
  hasBadge?: boolean
  hasValidBadge?: boolean
  notes?: string
  documents?: VehicleDocuments
  createdAt?: string
  updatedAt?: string
}

export interface VehicleInput {
  plateNumber: string
  vehicleTypeId?: string
  operatorId: string
  seatCapacity: number
  bedCapacity?: number
  manufactureYear?: number
  chassisNumber?: string
  engineNumber?: string
  color?: string
  imageUrl?: string

  insuranceExpiryDate?: string
  inspectionExpiryDate?: string

  cargoLength?: number
  cargoWidth?: number
  cargoHeight?: number

  gpsProvider?: string
  gpsUsername?: string
  gpsPassword?: string

  province?: string

  notes?: string
  documents?: VehicleDocuments
}

// ==================== Driver Types ====================

export interface Driver {
  id: string
  operatorId: string // Keep for backward compatibility
  operator?: Operator // Keep for backward compatibility
  operatorIds?: string[] // Array of operator IDs
  operators?: Array<Operator & { isPrimary?: boolean }> // Array of operators with primary flag
  fullName: string
  idNumber: string
  phone?: string
  province?: string
  district?: string
  address?: string
  licenseNumber: string
  licenseClass: string
  licenseExpiryDate: string
  imageUrl?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface DriverInput {
  operatorIds: string[] // Array of operator IDs (at least one required)
  fullName: string
  idNumber: string
  phone?: string
  province?: string
  district?: string
  address?: string
  licenseNumber: string
  licenseClass: string
  licenseExpiryDate: string
  imageUrl?: string | null // null to explicitly remove image
}

// ==================== Vehicle Badge Types ====================

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
  status: string
  vehicle_id: string
  warn_duplicate_plate: boolean
  operational_status: OperationalStatus  // 'trong_ben' (in station) or 'dang_chay' (running)
}
