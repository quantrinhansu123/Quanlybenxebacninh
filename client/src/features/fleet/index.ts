// Fleet Feature Public API
// Groups Vehicle, Driver, Operator, and Vehicle Badge management

// ============ Vehicles ============
export {
  vehicleApi,
  vehicleService,
  vehicleTypeApi,
  vehicleTypeService,
  VehicleForm,
  VehicleView,
} from './vehicles'

export type {
  Vehicle,
  VehicleInput,
  VehicleDocuments,
  DocumentInfo,
  VehicleType,
  VehicleTypeInput,
  VehicleFilters,
  VehicleFormMode,
} from './vehicles'

// ============ Drivers ============
export {
  driverApi,
  driverService,
  DriverDialog,
  DriverForm,
  DriverView,
} from './drivers'

export type {
  Driver,
  DriverInput,
  DriverFilters,
  DriverFormMode,
} from './drivers'

// ============ Operators ============
export {
  operatorApi,
  operatorService,
  OperatorDialog,
  OperatorForm,
  OperatorView,
  OperatorDetailDialog,
} from './operators'

export type {
  Operator,
  OperatorInput,
  OperatorFilters,
  OperatorFormMode,
} from './operators'

// ============ Routes ============
export {
  routeApi,
  routeService,
} from './routes'

// ============ Vehicle Badges ============
export {
  vehicleBadgeApi,
  vehicleBadgeService,
} from './vehicle-badges'

export type {
  VehicleBadge,
  VehicleBadgeFilters,
  VehicleBadgeStats,
} from './vehicle-badges'
