/**
 * Drivers Schema (Tài xế)
 * Migrated from Firebase RTDB: drivers
 */
import { pgTable, uuid, varchar, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { operators } from './operators'

export const drivers = pgTable('drivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseId: varchar('firebase_id', { length: 100 }).unique(),
  // Core fields
  fullName: varchar('full_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  idNumber: varchar('id_number', { length: 20 }),
  // Foreign key
  operatorId: uuid('operator_id').references(() => operators.id),
  // License info
  licenseNumber: varchar('license_number', { length: 50 }),
  licenseClass: varchar('license_class', { length: 10 }),
  licenseExpiryDate: varchar('license_expiry_date', { length: 10 }),
  // Other info
  dateOfBirth: varchar('date_of_birth', { length: 10 }),
  address: varchar('address', { length: 500 }),
  province: varchar('province', { length: 100 }),
  district: varchar('district', { length: 100 }),
  imageUrl: varchar('image_url'),
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  // Denormalized fields
  operatorName: varchar('operator_name', { length: 255 }),
  operatorCode: varchar('operator_code', { length: 50 }),
  // Metadata
  metadata: jsonb('metadata'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  operatorIdx: index('drivers_operator_idx').on(table.operatorId),
  activeIdx: index('drivers_active_idx').on(table.isActive),
  nameIdx: index('drivers_name_idx').on(table.fullName),
}))

export const driversRelations = relations(drivers, ({ one }) => ({
  operator: one(operators, {
    fields: [drivers.operatorId],
    references: [operators.id],
  }),
}))

export type Driver = typeof drivers.$inferSelect
export type NewDriver = typeof drivers.$inferInsert
