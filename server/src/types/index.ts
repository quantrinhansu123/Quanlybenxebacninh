/**
 * Types Index
 * Central export for all shared types
 */

// Common types (errors, responses, pagination)
export {
  isAppError,
  getErrorMessage,
  isDuplicateKeyError,
  isValidationError,
} from './common.js'

export type {
  AppError,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  PaginationParams,
  PaginatedResponse,
  BaseDBRecord,
  FirebaseQueryResult,
  FirebaseSingleResult,
  OperatorSummary,
  VehicleTypeSummary,
  RouteSummary,
  UserSummary,
} from './common.js'

// Re-export module-specific types for convenience
// Dispatch types
export type {
  DispatchRecord,
  DispatchDBRecord,
  DispatchFilters,
} from '../modules/dispatch/dispatch-types.js'

export type {
  DispatchStatusType,
  CreateDispatchInput,
  PassengerDropInput,
  IssuePermitInput,
  PaymentInput,
  DepartureOrderInput,
  ExitInput,
} from '../modules/dispatch/dispatch-validation.js'

// Fleet types
export type {
  VehicleRecord,
  VehicleDBRecord,
  VehicleDocument,
  VehicleDocuments,
  VehicleDocumentDB,
  VehicleFilters as VehicleQueryFilters,
  DriverRecord,
  DriverDBRecord,
  DriverFilters as DriverQueryFilters,
  OperatorInfo,
  DocumentType,
  AuditLogRecord,
} from '../modules/fleet/fleet-types.js'

export type {
  CreateVehicleInput,
  UpdateVehicleInput,
  CreateDriverInput,
  UpdateDriverInput,
  VehicleDocumentInput,
  VehicleDocumentsInput,
} from '../modules/fleet/fleet-validation.js'
