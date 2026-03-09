/**
 * Vehicles Schema (Xe)
 * Migrated from Firebase RTDB: vehicles, datasheet/Xe
 */
import { pgTable, uuid, varchar, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { operators } from './operators'
import { vehicleTypes } from './vehicle-types'

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseId: varchar('firebase_id', { length: 100 }).unique(),
  // Core fields
  plateNumber: varchar('plate_number', { length: 20 }).unique().notNull(),
  // Foreign keys
  operatorId: uuid('operator_id').references(() => operators.id),
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id),
  // Vehicle details
  seatCount: integer('seat_count'),
  bedCapacity: integer('bed_capacity'),
  brand: varchar('brand', { length: 100 }),
  model: varchar('model', { length: 100 }),
  yearOfManufacture: integer('year_of_manufacture'),
  color: varchar('color', { length: 50 }),
  chassisNumber: varchar('chassis_number', { length: 50 }),
  engineNumber: varchar('engine_number', { length: 50 }),
  imageUrl: varchar('image_url', { length: 500 }),
  // Document expiry dates (stored as YYYY-MM-DD strings)
  registrationExpiry: varchar('registration_expiry', { length: 10 }),
  insuranceExpiry: varchar('insurance_expiry', { length: 10 }),
  roadWorthinessExpiry: varchar('road_worthiness_expiry', { length: 10 }),
  // Cargo dimensions
  cargoLength: integer('cargo_length'),
  cargoWidth: integer('cargo_width'),
  cargoHeight: integer('cargo_height'),
  // GPS info
  gpsProvider: varchar('gps_provider', { length: 100 }),
  gpsUsername: varchar('gps_username', { length: 100 }),
  gpsPassword: varchar('gps_password', { length: 100 }),
  gpsUrl: varchar('gps_url', { length: 500 }),
  // Location
  province: varchar('province', { length: 100 }),
  // Notes
  notes: varchar('notes', { length: 500 }),
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  operationalStatus: varchar('operational_status', { length: 50 }).default('active'),
  // Denormalized fields for quick access
  operatorName: varchar('operator_name', { length: 255 }),
  operatorCode: varchar('operator_code', { length: 50 }),
  // Metadata
  metadata: jsonb('metadata'),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  source: varchar('source', { length: 50 }).default('manual'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  plateIdx: index('vehicles_plate_idx').on(table.plateNumber),
  operatorIdx: index('vehicles_operator_idx').on(table.operatorId),
  activeIdx: index('vehicles_active_idx').on(table.isActive),
}))

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  operator: one(operators, {
    fields: [vehicles.operatorId],
    references: [operators.id],
  }),
  vehicleType: one(vehicleTypes, {
    fields: [vehicles.vehicleTypeId],
    references: [vehicleTypes.id],
  }),
}))

export type Vehicle = typeof vehicles.$inferSelect
export type NewVehicle = typeof vehicles.$inferInsert
