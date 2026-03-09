/**
 * Vehicle Repository
 * Data access layer for Vehicle entity
 * Now using Drizzle ORM instead of Firebase RTDB
 */

// Re-export from Drizzle implementation
export {
  vehicleRepository,
  VehicleRepository,
  type Vehicle,
  type NewVehicle,
  type VehicleAPI,
} from './vehicle-repository-drizzle.js'
