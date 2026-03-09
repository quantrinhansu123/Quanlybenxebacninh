/**
 * Fleet Module Validation
 * Zod schemas for Vehicle and Driver input validation
 */

import { z } from 'zod'

// ========== Document Schema ==========

const documentSchema = z.object({
  number: z.string().min(1, 'Document number is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  issuingAuthority: z.string().optional(),
  documentUrl: z.string().optional(),
  notes: z.string().optional(),
})

const documentsSchema = z.object({
  registration: documentSchema.optional(),
  inspection: documentSchema.optional(),
  insurance: documentSchema.optional(),
  operation_permit: documentSchema.optional(),
  emblem: documentSchema.optional(),
})

// ========== Vehicle Schemas ==========

export const createVehicleSchema = z.object({
  plateNumber: z.string().min(1, 'Plate number is required'),
  vehicleTypeId: z.string().min(1).optional(),
  operatorId: z.string().min(1, 'Invalid operator ID').optional(),
  seatCapacity: z.number().int().positive('Seat capacity must be positive'),
  bedCapacity: z.number().int().optional(),
  chassisNumber: z.string().optional(),
  engineNumber: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  insuranceExpiryDate: z.string().optional(),
  inspectionExpiryDate: z.string().optional(),
  cargoLength: z.number().optional(),
  cargoWidth: z.number().optional(),
  cargoHeight: z.number().optional(),
  gpsProvider: z.string().optional(),
  gpsUsername: z.string().optional(),
  gpsPassword: z.string().optional(),
  province: z.string().optional(),
  notes: z.string().optional(),
  documents: documentsSchema.optional(),
})

export const updateVehicleSchema = createVehicleSchema.partial()

// ========== Driver Schemas ==========

export const createDriverSchema = z.object({
  operatorIds: z.array(z.string().min(1, 'Invalid operator ID')).min(1, 'At least one operator is required'),
  fullName: z.string().min(1, 'Full name is required'),
  idNumber: z.string().min(1, 'ID number is required'),
  phone: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  address: z.string().optional(),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseClass: z.string().min(1, 'License class is required'),
  licenseExpiryDate: z.string().min(1, 'License expiry date is required'),
  imageUrl: z.string().url().optional().or(z.literal('')).nullable(),
})

export const updateDriverSchema = createDriverSchema.partial()

// ========== Type Exports ==========

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>
export type CreateDriverInput = z.infer<typeof createDriverSchema>
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>
export type VehicleDocumentInput = z.infer<typeof documentSchema>
export type VehicleDocumentsInput = z.infer<typeof documentsSchema>

// ========== Validation Functions ==========

export function validateCreateVehicle(data: unknown): CreateVehicleInput {
  return createVehicleSchema.parse(data)
}

export function validateUpdateVehicle(data: unknown): UpdateVehicleInput {
  return updateVehicleSchema.parse(data)
}

export function validateCreateDriver(data: unknown): CreateDriverInput {
  return createDriverSchema.parse(data)
}

export function validateUpdateDriver(data: unknown): UpdateDriverInput {
  return updateDriverSchema.parse(data)
}
