/**
 * Drizzle Query Helpers
 * Replaces Firebase .from() pattern with composable query helpers
 */
import { eq, desc, asc, and, or, inArray } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import { db } from '../drizzle'
import * as schema from '../schema'

// Re-export db and operators for convenience
export { db }
export { eq, desc, asc, and, or, inArray }

// Re-export all schema tables
export const {
  operators,
  vehicleTypes,
  vehicles,
  drivers,
  routes,
  vehicleBadges,
  users,
  shifts,
  dispatchRecords,
  invoices,
  idMappings,
} = schema

/**
 * Get all records from a table
 * @example await getAll(operators)
 */
export async function getAll(table: PgTable): Promise<any[]> {
  if (!db) throw new Error('Database not initialized')
  return db.select().from(table as any)
}

/**
 * Get single record by ID field
 * @example await getById(operators, operators.id, '123')
 */
export async function getById(
  table: PgTable,
  idField: any,
  id: string | number
): Promise<any | null> {
  if (!db) throw new Error('Database not initialized')
  const results = await db.select().from(table as any).where(eq(idField, id)).limit(1)
  return results[0] ?? null
}

/**
 * Get records by field value
 * @example await getByField(vehicles, vehicles.operatorId, 'op-123')
 */
export async function getByField(
  table: PgTable,
  field: any,
  value: string | number | boolean
): Promise<any[]> {
  if (!db) throw new Error('Database not initialized')
  return db.select().from(table as any).where(eq(field, value))
}

/**
 * Get records with custom WHERE clause
 * @example await getWhere(vehicles, and(eq(vehicles.operatorId, 'op-1'), eq(vehicles.status, 'active')))
 */
export async function getWhere(
  table: PgTable,
  condition: SQL | undefined
): Promise<any[]> {
  if (!db) throw new Error('Database not initialized')
  return db.select().from(table as any).where(condition)
}
