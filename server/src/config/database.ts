/**
 * Database Configuration
 *
 * @deprecated This file is deprecated. Import from '../db/drizzle' instead.
 * Left here for backward compatibility during migration.
 *
 * MIGRATION STATUS: Phase 4 Complete
 * - All code migrated to Drizzle ORM
 * - Firebase dependencies removed
 */

// Re-export Drizzle for any remaining imports
export { db, testDrizzleConnection, withTransaction, closeDrizzleConnection } from '../db/drizzle.js'
export * from '../db/schema/index.js'

// Log warning if this file is imported
console.warn('[DEPRECATED] config/database.ts is deprecated. Use db/drizzle.ts directly.')

/**
 * @deprecated Use testDrizzleConnection from '../db/drizzle' instead
 */
export async function testFirebaseConnection(): Promise<boolean> {
  console.warn('[DEPRECATED] testFirebaseConnection is deprecated. Firebase has been removed.')
  return false
}

/**
 * @deprecated Firebase has been removed. Use Drizzle ORM directly.
 */
export const firebaseDb = {
  ref: () => { throw new Error('Firebase has been removed. Use Drizzle ORM.') },
  get: () => { throw new Error('Firebase has been removed. Use Drizzle ORM.') },
  set: () => { throw new Error('Firebase has been removed. Use Drizzle ORM.') },
  update: () => { throw new Error('Firebase has been removed. Use Drizzle ORM.') },
  push: () => { throw new Error('Firebase has been removed. Use Drizzle ORM.') },
  remove: () => { throw new Error('Firebase has been removed. Use Drizzle ORM.') },
  exists: () => { throw new Error('Firebase has been removed. Use Drizzle ORM.') },
  query: () => { throw new Error('Firebase has been removed. Use Drizzle ORM.') },
}

/**
 * @deprecated Firebase has been removed. Use Drizzle ORM directly.
 */
export const firebase = {
  from: () => { throw new Error('Firebase has been removed. Use Drizzle ORM.') },
  rpc: () => { throw new Error('Firebase has been removed. Use Drizzle ORM.') },
}
