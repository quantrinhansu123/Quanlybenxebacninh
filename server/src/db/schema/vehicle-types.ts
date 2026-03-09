/**
 * Vehicle Types Schema
 * Reference table for vehicle categories
 */
import { pgTable, uuid, varchar, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core'

export const vehicleTypes = pgTable('vehicle_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseId: varchar('firebase_id', { length: 100 }).unique(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }).unique(),
  seatCount: integer('seat_count'),
  description: varchar('description', { length: 255 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  codeIdx: index('vehicle_types_code_idx').on(table.code),
}))

export type VehicleType = typeof vehicleTypes.$inferSelect
export type NewVehicleType = typeof vehicleTypes.$inferInsert
