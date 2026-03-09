/**
 * Vehicle Badges Schema (Phù hiệu xe)
 * Migrated from Firebase RTDB: vehicle_badges, datasheet/PHUHIEUXE
 */
import { pgTable, uuid, varchar, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { vehicles } from './vehicles'
import { operators } from './operators'
import { routes } from './routes'

export const vehicleBadges = pgTable('vehicle_badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseId: varchar('firebase_id', { length: 100 }).unique(),
  // Core fields
  badgeNumber: varchar('badge_number', { length: 50 }),
  plateNumber: varchar('plate_number', { length: 20 }).notNull(),
  // Foreign keys (nullable - may reference legacy data)
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  operatorId: uuid('operator_id').references(() => operators.id),
  routeId: uuid('route_id').references(() => routes.id),
  // Badge details
  badgeType: varchar('badge_type', { length: 50 }),
  routeCode: varchar('route_code', { length: 50 }),
  routeName: varchar('route_name', { length: 255 }),
  // Validity (stored as YYYY-MM-DD strings)
  issueDate: varchar('issue_date', { length: 10 }),
  expiryDate: varchar('expiry_date', { length: 10 }),
  // Status
  status: varchar('status', { length: 50 }).default('active'),
  isActive: boolean('is_active').default(true).notNull(),
  // Denormalized fields
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
  plateIdx: index('badges_plate_idx').on(table.plateNumber),
  operatorIdx: index('badges_operator_idx').on(table.operatorId),
  routeCodeIdx: index('badges_route_code_idx').on(table.routeCode),
  expiryIdx: index('badges_expiry_idx').on(table.expiryDate),
}))

export const vehicleBadgesRelations = relations(vehicleBadges, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleBadges.vehicleId],
    references: [vehicles.id],
  }),
  operator: one(operators, {
    fields: [vehicleBadges.operatorId],
    references: [operators.id],
  }),
  route: one(routes, {
    fields: [vehicleBadges.routeId],
    references: [routes.id],
  }),
}))

export type VehicleBadge = typeof vehicleBadges.$inferSelect
export type NewVehicleBadge = typeof vehicleBadges.$inferInsert
