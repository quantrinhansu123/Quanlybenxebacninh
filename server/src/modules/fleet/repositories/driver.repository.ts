/**
 * Driver Repository
 * Data access layer for Driver entity
 * Now using Drizzle ORM instead of Firebase RTDB
 */

// Re-export from Drizzle implementation
export {
  driverRepository,
  DriverRepository,
  type Driver,
  type NewDriver,
} from './driver-repository-drizzle.js'
