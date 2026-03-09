/**
 * Fleet Module Mappers
 * Transform database records to API format
 */

import {
  VehicleRecord,
  VehicleDBRecord,
  VehicleDocumentDB,
  VehicleDocuments,
  DriverRecord,
  DriverDBRecord,
  OperatorInfo,
  AuditLogRecord,
} from './fleet-types.js'

// ========== Vehicle Mappers ==========

/**
 * Build documents map from vehicle documents array
 */
export function buildDocumentsMap(documents: VehicleDocumentDB[] | null): VehicleDocuments {
  const docsMap: VehicleDocuments = {}
  const today = new Date().toISOString().split('T')[0]

  documents?.forEach((doc) => {
    const mappedDoc = {
      number: doc.document_number,
      issueDate: doc.issue_date,
      expiryDate: doc.expiry_date,
      issuingAuthority: doc.issuing_authority,
      documentUrl: doc.document_url,
      notes: doc.notes,
      isValid: doc.expiry_date >= today,
    }

    switch (doc.document_type) {
      case 'registration':
        docsMap.registration = mappedDoc
        break
      case 'inspection':
        docsMap.inspection = mappedDoc
        break
      case 'insurance':
        docsMap.insurance = mappedDoc
        break
      case 'operation_permit':
        docsMap.operation_permit = mappedDoc
        break
      case 'emblem':
        docsMap.emblem = mappedDoc
        break
    }
  })

  return docsMap
}

/**
 * Map vehicle database record to API format
 * Note: operator and vehicleType should be passed separately (Firebase RTDB doesn't support joins)
 */
export function mapVehicleToAPI(
  vehicle: VehicleDBRecord,
  documents?: VehicleDocumentDB[] | null,
  operator?: { id: string; name: string; code: string } | null,
  vehicleType?: { id: string; name: string } | null
): VehicleRecord {
  const docsMap = documents ? buildDocumentsMap(documents) : undefined

  return {
    id: vehicle.id,
    plateNumber: vehicle.plate_number,
    vehicleTypeId: vehicle.vehicle_type_id,
    vehicleType: vehicleType
      ? {
          id: vehicleType.id,
          name: vehicleType.name,
        }
      : undefined,
    operatorId: vehicle.operator_id,
    operator: operator
      ? {
          id: operator.id,
          name: operator.name,
          code: operator.code,
        }
      : undefined,
    seatCapacity: vehicle.seat_capacity,
    bedCapacity: vehicle.bed_capacity ?? undefined,
    manufactureYear: vehicle.manufacture_year,
    chassisNumber: vehicle.chassis_number,
    engineNumber: vehicle.engine_number,
    color: vehicle.color,
    imageUrl: vehicle.image_url,
    insuranceExpiryDate: vehicle.insurance_expiry_date,
    inspectionExpiryDate: vehicle.inspection_expiry_date,
    cargoLength: vehicle.cargo_length,
    cargoWidth: vehicle.cargo_width,
    cargoHeight: vehicle.cargo_height,
    gpsProvider: vehicle.gps_provider,
    gpsUsername: vehicle.gps_username,
    gpsPassword: vehicle.gps_password,
    province: vehicle.province,
    isActive: vehicle.is_active,
    notes: vehicle.notes,
    documents: docsMap
      ? {
          registration: docsMap.registration,
          inspection: docsMap.inspection,
          insurance: docsMap.insurance,
          operation_permit: docsMap.operation_permit,
          emblem: docsMap.emblem,
        }
      : undefined,
    createdAt: vehicle.created_at,
    updatedAt: vehicle.updated_at,
  }
}

// ========== Driver Mappers ==========

/**
 * Extract operators from driver record with junction table data
 */
function extractOperators(driver: DriverDBRecord): {
  primaryOperator: OperatorInfo | undefined
  allOperators: OperatorInfo[]
} {
  // Get primary operator from operator_id (backward compatibility)
  const primaryOperator: OperatorInfo | undefined = driver.operators
    ? {
        id: driver.operators.id,
        name: driver.operators.name,
        code: driver.operators.code,
      }
    : undefined

  // Get all operators from junction table
  const allOperators: OperatorInfo[] =
    driver.driver_operators
      ?.map((doRel) => ({
        id: doRel.operators?.id ?? '',
        name: doRel.operators?.name ?? '',
        code: doRel.operators?.code ?? '',
        isPrimary: doRel.is_primary,
      }))
      .filter((op) => op.id) ?? []

  // If no operators from junction table, use primary operator
  const operators =
    allOperators.length > 0 ? allOperators : primaryOperator ? [primaryOperator] : []

  return { primaryOperator, allOperators: operators }
}

/**
 * Map driver database record to API format
 */
export function mapDriverToAPI(driver: DriverDBRecord): DriverRecord {
  const { primaryOperator, allOperators } = extractOperators(driver)

  return {
    id: driver.id,
    operatorId: driver.operator_id,
    operator: primaryOperator,
    operatorIds: allOperators.map((op) => op.id),
    operators: allOperators,
    fullName: driver.full_name,
    idNumber: driver.id_number,
    phone: driver.phone,
    email: driver.email,
    province: driver.province,
    district: driver.district,
    address: driver.address,
    licenseNumber: driver.license_number,
    licenseClass: driver.license_class,
    licenseIssueDate: driver.license_issue_date,
    licenseExpiryDate: driver.license_expiry_date,
    imageUrl: driver.image_url,
    isActive: driver.is_active,
    createdAt: driver.created_at,
    updatedAt: driver.updated_at,
  }
}

/**
 * Map driver with separately fetched junction data
 */
export function mapDriverWithOperators(
  driver: DriverDBRecord,
  junctionData: Array<{
    operator_id: string
    is_primary: boolean
    operators?: { id: string; name: string; code: string }
  }> | null
): DriverRecord {
  const primaryOperator: OperatorInfo | undefined = driver.operators
    ? {
        id: driver.operators.id,
        name: driver.operators.name,
        code: driver.operators.code,
      }
    : undefined

  const allOperators: OperatorInfo[] =
    junctionData
      ?.map((doRel) => ({
        id: doRel.operators?.id ?? '',
        name: doRel.operators?.name ?? '',
        code: doRel.operators?.code ?? '',
        isPrimary: doRel.is_primary,
      }))
      .filter((op) => op.id) ?? []

  const operators =
    allOperators.length > 0 ? allOperators : primaryOperator ? [primaryOperator] : []

  return {
    id: driver.id,
    operatorId: driver.operator_id,
    operator: primaryOperator,
    operatorIds: operators.map((op) => op.id),
    operators,
    fullName: driver.full_name,
    idNumber: driver.id_number,
    phone: driver.phone,
    email: driver.email,
    province: driver.province,
    district: driver.district,
    address: driver.address,
    licenseNumber: driver.license_number,
    licenseClass: driver.license_class,
    licenseIssueDate: driver.license_issue_date,
    licenseExpiryDate: driver.license_expiry_date,
    imageUrl: driver.image_url,
    isActive: driver.is_active,
    createdAt: driver.created_at,
    updatedAt: driver.updated_at,
  }
}

// ========== Audit Log Mappers ==========

/**
 * Convert UTC timestamp to Vietnam timezone (UTC+7)
 */
function toVietnamTime(timestamp: string): string {
  if (!timestamp || typeof timestamp !== 'string') return timestamp

  if (timestamp.endsWith('Z')) {
    const utcDate = new Date(timestamp)
    const vietnamDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000)
    const year = vietnamDate.getUTCFullYear()
    const month = String(vietnamDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(vietnamDate.getUTCDate()).padStart(2, '0')
    const hours = String(vietnamDate.getUTCHours()).padStart(2, '0')
    const minutes = String(vietnamDate.getUTCMinutes()).padStart(2, '0')
    const seconds = String(vietnamDate.getUTCSeconds()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`
  }

  if (!timestamp.includes('+') && !timestamp.includes('Z')) {
    return timestamp.endsWith('+07:00') ? timestamp : `${timestamp}+07:00`
  }

  return timestamp
}

/**
 * Map audit log to API format
 */
export function mapAuditLogToAPI(log: {
  id: string
  user_id?: string | null
  users?: { full_name?: string; username?: string } | null
  action: string
  record_id: string
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  created_at: string
}): AuditLogRecord {
  return {
    id: log.id,
    userId: log.user_id,
    userName: log.users?.full_name || log.users?.username || 'Không xác định',
    action: log.action,
    recordId: log.record_id,
    oldValues: log.old_values,
    newValues: log.new_values,
    createdAt: toVietnamTime(log.created_at),
  }
}
