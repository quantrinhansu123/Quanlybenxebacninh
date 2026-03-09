/**
 * Fleet Module
 * Public exports for Vehicle, Driver, VehicleType management
 */

// Types
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
} from './fleet-types.js'

// Validation
export {
  createVehicleSchema,
  updateVehicleSchema,
  createDriverSchema,
  updateDriverSchema,
  validateCreateVehicle,
  validateUpdateVehicle,
  validateCreateDriver,
  validateUpdateDriver,
} from './fleet-validation.js'
export type {
  CreateVehicleInput,
  UpdateVehicleInput,
  CreateDriverInput,
  UpdateDriverInput,
  VehicleDocumentInput,
  VehicleDocumentsInput,
} from './fleet-validation.js'

// Mappers
export {
  mapVehicleToAPI,
  mapDriverToAPI,
  mapDriverWithOperators,
  buildDocumentsMap,
  mapAuditLogToAPI,
} from './fleet-mappers.js'

// Repositories
export { vehicleRepository, VehicleRepository } from './repositories/vehicle.repository.js'
export { driverRepository, DriverRepository } from './repositories/driver.repository.js'

// Services
export { vehicleService, VehicleService } from './services/vehicle.service.js'
export type { CreateVehicleDTO, UpdateVehicleDTO, VehicleFilters } from './services/vehicle.service.js'
export { driverService, DriverService } from './services/driver.service.js'
export type { CreateDriverDTO, UpdateDriverDTO, DriverFilters } from './services/driver.service.js'

// Controllers
export {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleDocumentAuditLogs,
} from './controllers/vehicle.controller.js'
export {
  getAllDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
} from './controllers/driver.controller.js'

// Routes
export { default as vehicleRoutes } from './vehicle.routes.js'
export { default as driverRoutes } from './driver.routes.js'
