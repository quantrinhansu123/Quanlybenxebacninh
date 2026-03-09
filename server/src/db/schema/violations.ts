/**
 * Violations & Violation Types Schema
 * Tables: violations, violation_types
 */
import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { vehicles } from './vehicles'
import { drivers } from './drivers'
import { dispatchRecords } from './dispatch-records'
import { users } from './users'

export const violationTypes = pgTable('violation_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  severity: varchar('severity', { length: 50 }).notNull(), // low, medium, high, critical
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  codeIdx: index('violation_types_code_idx').on(table.code),
  severityIdx: index('violation_types_severity_idx').on(table.severity),
}))

export const violations = pgTable('violations', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Foreign keys
  dispatchRecordId: uuid('dispatch_record_id').references(() => dispatchRecords.id),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  driverId: uuid('driver_id').references(() => drivers.id),
  violationTypeId: uuid('violation_type_id').references(() => violationTypes.id).notNull(),
  recordedBy: uuid('recorded_by').references(() => users.id),
  // Core fields
  violationDate: timestamp('violation_date', { withTimezone: true }).notNull(),
  description: text('description'),
  resolutionStatus: varchar('resolution_status', { length: 50 }).default('pending').notNull(), // pending, resolved, dismissed
  resolutionNotes: text('resolution_notes'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  vehicleIdx: index('violations_vehicle_idx').on(table.vehicleId),
  driverIdx: index('violations_driver_idx').on(table.driverId),
  dispatchIdx: index('violations_dispatch_idx').on(table.dispatchRecordId),
  typeIdx: index('violations_type_idx').on(table.violationTypeId),
  statusIdx: index('violations_status_idx').on(table.resolutionStatus),
  dateIdx: index('violations_date_idx').on(table.violationDate),
}))

export const violationsRelations = relations(violations, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [violations.vehicleId],
    references: [vehicles.id],
  }),
  driver: one(drivers, {
    fields: [violations.driverId],
    references: [drivers.id],
  }),
  dispatchRecord: one(dispatchRecords, {
    fields: [violations.dispatchRecordId],
    references: [dispatchRecords.id],
  }),
  violationType: one(violationTypes, {
    fields: [violations.violationTypeId],
    references: [violationTypes.id],
  }),
  recorder: one(users, {
    fields: [violations.recordedBy],
    references: [users.id],
  }),
}))

export const violationTypesRelations = relations(violationTypes, ({ many }) => ({
  violations: many(violations),
}))

export type ViolationType = typeof violationTypes.$inferSelect
export type NewViolationType = typeof violationTypes.$inferInsert
export type Violation = typeof violations.$inferSelect
export type NewViolation = typeof violations.$inferInsert
