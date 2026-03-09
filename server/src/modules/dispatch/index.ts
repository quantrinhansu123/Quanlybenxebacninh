/**
 * Dispatch Module
 * Export all dispatch-related functionality
 */

// Types (without input types that are also in validation)
export type {
  DispatchRecord,
  DispatchDBRecord,
  DispatchFilters,
} from './dispatch-types.js'

// Validation (includes input types)
export {
  DISPATCH_STATUS,
  validateStatusTransition,
  createDispatchSchema,
  passengerDropSchema,
  issuePermitSchema,
  paymentSchema,
  departureOrderSchema,
  exitSchema,
  validateCreateDispatch,
  validatePassengerDrop,
  validateIssuePermit,
  validatePayment,
  validateDepartureOrder,
  validateExit,
} from './dispatch-validation.js'
export type {
  DispatchStatusType,
  CreateDispatchInput,
  PassengerDropInput,
  IssuePermitInput,
  PaymentInput,
  DepartureOrderInput,
  ExitInput,
} from './dispatch-validation.js'

// Mappers
export { mapDispatchToAPI, mapDispatchListToAPI } from './dispatch-mappers.js'

// Repository
export { dispatchRepository } from './dispatch-repository.js'

// Controller
export {
  getAllDispatchRecords,
  getDispatchRecordById,
  createDispatchRecord,
  recordPassengerDrop,
  issuePermit,
  processPayment,
  issueDepartureOrder,
  recordExit,
} from './controllers/dispatch.controller.js'

// Routes
export { default as dispatchRoutes } from './dispatch.routes.js'
