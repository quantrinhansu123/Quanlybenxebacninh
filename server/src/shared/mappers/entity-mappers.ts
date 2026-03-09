/**
 * Entity Mappers
 * Maps database records to API response format
 */

// ============================================
// OPERATOR MAPPER
// ============================================
export interface OperatorDB {
  id: string
  name: string
  code: string
  tax_code?: string
  phone?: string
  email?: string
  address?: string
  province?: string
  district?: string
  representative_name?: string
  representative_position?: string
  is_ticket_delegated?: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface OperatorAPI {
  id: string
  name: string
  code: string
  taxCode?: string
  phone?: string
  email?: string
  address?: string
  province?: string
  district?: string
  representativeName?: string
  representativePosition?: string
  isTicketDelegated?: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export function mapOperator(db: OperatorDB): OperatorAPI {
  return {
    id: db.id,
    name: db.name,
    code: db.code,
    taxCode: db.tax_code,
    phone: db.phone,
    email: db.email,
    address: db.address,
    province: db.province,
    district: db.district,
    representativeName: db.representative_name,
    representativePosition: db.representative_position,
    isTicketDelegated: db.is_ticket_delegated,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

export function mapOperatorToDB(api: Partial<OperatorAPI>): Partial<OperatorDB> {
  const result: Partial<OperatorDB> = {}
  if (api.name !== undefined) result.name = api.name
  if (api.code !== undefined) result.code = api.code
  if (api.taxCode !== undefined) result.tax_code = api.taxCode
  if (api.phone !== undefined) result.phone = api.phone
  if (api.email !== undefined) result.email = api.email
  if (api.address !== undefined) result.address = api.address
  if (api.province !== undefined) result.province = api.province
  if (api.district !== undefined) result.district = api.district
  if (api.representativeName !== undefined) result.representative_name = api.representativeName
  if (api.representativePosition !== undefined) result.representative_position = api.representativePosition
  if (api.isTicketDelegated !== undefined) result.is_ticket_delegated = api.isTicketDelegated
  if (api.isActive !== undefined) result.is_active = api.isActive
  return result
}

// ============================================
// VEHICLE TYPE MAPPER
// ============================================
export interface VehicleTypeDB {
  id: string
  name: string
  description?: string
  created_at?: string
}

export interface VehicleTypeAPI {
  id: string
  name: string
  description?: string
  createdAt?: string
}

export function mapVehicleType(db: VehicleTypeDB): VehicleTypeAPI {
  return {
    id: db.id,
    name: db.name,
    description: db.description,
    createdAt: db.created_at,
  }
}

// ============================================
// VEHICLE MAPPER
// ============================================
export interface VehicleDB {
  id: string
  plate_number: string
  vehicle_type_id?: string
  operator_id?: string
  seat_capacity: number
  bed_capacity?: number
  chassis_number?: string
  engine_number?: string
  image_url?: string
  insurance_expiry_date?: string
  inspection_expiry_date?: string
  cargo_length?: number
  cargo_width?: number
  cargo_height?: number
  gps_provider?: string
  gps_username?: string
  gps_password?: string
  province?: string
  notes?: string
  operator_name?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface VehicleAPI {
  id: string
  plateNumber: string
  vehicleTypeId?: string
  vehicleType?: VehicleTypeAPI
  operatorId?: string
  operator?: OperatorAPI
  operatorName?: string
  seatCapacity: number
  bedCapacity?: number
  chassisNumber?: string
  engineNumber?: string
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
  documents?: Record<string, any>
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export function mapVehicle(
  db: VehicleDB,
  vehicleType?: VehicleTypeDB | null,
  operator?: OperatorDB | null,
  documents?: Record<string, any>
): VehicleAPI {
  return {
    id: db.id,
    plateNumber: db.plate_number,
    vehicleTypeId: db.vehicle_type_id,
    vehicleType: vehicleType ? mapVehicleType(vehicleType) : undefined,
    operatorId: db.operator_id,
    operator: operator ? mapOperator(operator) : undefined,
    operatorName: operator?.name || db.operator_name || undefined,
    seatCapacity: db.seat_capacity,
    bedCapacity: db.bed_capacity,
    chassisNumber: db.chassis_number,
    engineNumber: db.engine_number,
    imageUrl: db.image_url,
    insuranceExpiryDate: db.insurance_expiry_date,
    inspectionExpiryDate: db.inspection_expiry_date,
    cargoLength: db.cargo_length,
    cargoWidth: db.cargo_width,
    cargoHeight: db.cargo_height,
    gpsProvider: db.gps_provider,
    gpsUsername: db.gps_username,
    gpsPassword: db.gps_password,
    province: db.province,
    notes: db.notes,
    documents,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

export function mapVehicleToDB(api: Partial<VehicleAPI>): Partial<VehicleDB> {
  const result: Partial<VehicleDB> = {}
  if (api.plateNumber !== undefined) result.plate_number = api.plateNumber
  if (api.vehicleTypeId !== undefined) result.vehicle_type_id = api.vehicleTypeId
  if (api.operatorId !== undefined) result.operator_id = api.operatorId
  if (api.seatCapacity !== undefined) result.seat_capacity = api.seatCapacity
  if (api.bedCapacity !== undefined) result.bed_capacity = api.bedCapacity
  if (api.chassisNumber !== undefined) result.chassis_number = api.chassisNumber
  if (api.engineNumber !== undefined) result.engine_number = api.engineNumber
  if (api.imageUrl !== undefined) result.image_url = api.imageUrl
  if (api.insuranceExpiryDate !== undefined) result.insurance_expiry_date = api.insuranceExpiryDate
  if (api.inspectionExpiryDate !== undefined) result.inspection_expiry_date = api.inspectionExpiryDate
  if (api.cargoLength !== undefined) result.cargo_length = api.cargoLength
  if (api.cargoWidth !== undefined) result.cargo_width = api.cargoWidth
  if (api.cargoHeight !== undefined) result.cargo_height = api.cargoHeight
  if (api.gpsProvider !== undefined) result.gps_provider = api.gpsProvider
  if (api.gpsUsername !== undefined) result.gps_username = api.gpsUsername
  if (api.gpsPassword !== undefined) result.gps_password = api.gpsPassword
  if (api.province !== undefined) result.province = api.province
  if (api.notes !== undefined) result.notes = api.notes
  if (api.isActive !== undefined) result.is_active = api.isActive
  return result
}

// ============================================
// DRIVER MAPPER
// ============================================
export interface DriverDB {
  id: string
  operator_id?: string
  full_name: string
  id_number: string
  phone?: string
  email?: string
  province?: string
  district?: string
  address?: string
  license_number: string
  license_class: string
  license_issue_date?: string
  license_expiry_date?: string
  image_url?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface DriverAPI {
  id: string
  operatorId?: string
  operator?: OperatorAPI
  fullName: string
  idNumber: string
  phone?: string
  email?: string
  province?: string
  district?: string
  address?: string
  licenseNumber: string
  licenseClass: string
  licenseIssueDate?: string
  licenseExpiryDate?: string
  imageUrl?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export function mapDriver(db: DriverDB, operator?: OperatorDB | null): DriverAPI {
  return {
    id: db.id,
    operatorId: db.operator_id,
    operator: operator ? mapOperator(operator) : undefined,
    fullName: db.full_name,
    idNumber: db.id_number,
    phone: db.phone,
    email: db.email,
    province: db.province,
    district: db.district,
    address: db.address,
    licenseNumber: db.license_number,
    licenseClass: db.license_class,
    licenseIssueDate: db.license_issue_date,
    licenseExpiryDate: db.license_expiry_date,
    imageUrl: db.image_url,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

export function mapDriverToDB(api: Partial<DriverAPI>): Partial<DriverDB> {
  const result: Partial<DriverDB> = {}
  if (api.operatorId !== undefined) result.operator_id = api.operatorId
  if (api.fullName !== undefined) result.full_name = api.fullName
  if (api.idNumber !== undefined) result.id_number = api.idNumber
  if (api.phone !== undefined) result.phone = api.phone
  if (api.email !== undefined) result.email = api.email
  if (api.province !== undefined) result.province = api.province
  if (api.district !== undefined) result.district = api.district
  if (api.address !== undefined) result.address = api.address
  if (api.licenseNumber !== undefined) result.license_number = api.licenseNumber
  if (api.licenseClass !== undefined) result.license_class = api.licenseClass
  if (api.licenseIssueDate !== undefined) result.license_issue_date = api.licenseIssueDate
  if (api.licenseExpiryDate !== undefined) result.license_expiry_date = api.licenseExpiryDate
  if (api.imageUrl !== undefined) result.image_url = api.imageUrl
  if (api.isActive !== undefined) result.is_active = api.isActive
  return result
}

// ============================================
// LOCATION MAPPER
// ============================================
export interface LocationDB {
  id: string
  name: string
  code: string
  station_type?: string
  province?: string
  district?: string
  address?: string
  phone?: string
  email?: string
  latitude?: number
  longitude?: number
  is_active: boolean
  created_at?: string
}

export interface LocationAPI {
  id: string
  name: string
  code: string
  stationType?: string
  province?: string
  district?: string
  address?: string
  phone?: string
  email?: string
  latitude?: number
  longitude?: number
  isActive: boolean
  createdAt?: string
}

export function mapLocation(db: LocationDB): LocationAPI {
  return {
    id: db.id,
    name: db.name,
    code: db.code,
    stationType: db.station_type,
    province: db.province,
    district: db.district,
    address: db.address,
    phone: db.phone,
    email: db.email,
    latitude: db.latitude,
    longitude: db.longitude,
    isActive: db.is_active,
    createdAt: db.created_at,
  }
}

// ============================================
// ROUTE MAPPER
// ============================================
export interface RouteDB {
  id: string
  route_code: string
  route_name: string
  origin_id: string
  destination_id: string
  distance_km?: number
  estimated_duration_minutes?: number
  route_type?: string
  planned_frequency?: string
  boarding_point?: string
  journey_description?: string
  departure_times_description?: string
  rest_stops?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface RouteAPI {
  id: string
  routeCode: string
  routeName: string
  originId: string
  origin?: LocationAPI
  originName?: string
  destinationId: string
  destination?: LocationAPI
  destinationName?: string
  distanceKm?: number
  estimatedDurationMinutes?: number
  routeType?: string
  plannedFrequency?: string
  boardingPoint?: string
  journeyDescription?: string
  departureTimesDescription?: string
  restStops?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export function mapRoute(
  db: RouteDB,
  origin?: LocationDB | null,
  destination?: LocationDB | null
): RouteAPI {
  return {
    id: db.id,
    routeCode: db.route_code,
    routeName: db.route_name,
    originId: db.origin_id,
    origin: origin ? mapLocation(origin) : undefined,
    originName: origin?.name,
    destinationId: db.destination_id,
    destination: destination ? mapLocation(destination) : undefined,
    destinationName: destination?.name,
    distanceKm: db.distance_km,
    estimatedDurationMinutes: db.estimated_duration_minutes,
    routeType: db.route_type,
    plannedFrequency: db.planned_frequency,
    boardingPoint: db.boarding_point,
    journeyDescription: db.journey_description,
    departureTimesDescription: db.departure_times_description,
    restStops: db.rest_stops,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

// ============================================
// SHIFT MAPPER
// ============================================
export interface ShiftDB {
  id: string
  name: string
  start_time: string
  end_time: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface ShiftAPI {
  id: string
  name: string
  startTime: string
  endTime: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export function mapShift(db: ShiftDB): ShiftAPI {
  return {
    id: db.id,
    name: db.name,
    startTime: db.start_time,
    endTime: db.end_time,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

