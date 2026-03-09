/**
 * Routes Schema (Tuyến đường)
 * Migrated from Firebase RTDB: routes, datasheet/DANHMUCTUYENCODINH
 */
import { pgTable, uuid, varchar, integer, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseId: varchar('firebase_id', { length: 100 }).unique(),
  // Route identification
  routeCode: varchar('route_code', { length: 50 }).unique().notNull(),
  routeCodeOld: varchar('route_code_old', { length: 50 }),
  // Route details
  departureProvince: varchar('departure_province', { length: 100 }),
  departureStation: varchar('departure_station', { length: 255 }),
  departureStationRef: varchar('departure_station_ref', { length: 20 }),
  arrivalProvince: varchar('arrival_province', { length: 100 }),
  arrivalStation: varchar('arrival_station', { length: 255 }),
  arrivalStationRef: varchar('arrival_station_ref', { length: 20 }),
  // Route specifications
  distanceKm: integer('distance_km'),
  itinerary: text('itinerary'),
  routeType: varchar('route_type', { length: 50 }),
  // Schedule info
  totalTripsPerMonth: integer('total_trips_per_month'),
  tripsOperated: integer('trips_operated'),
  remainingCapacity: integer('remaining_capacity'),
  minIntervalMinutes: integer('min_interval_minutes'),
  // Documentation
  decisionNumber: varchar('decision_number', { length: 100 }),
  decisionDate: varchar('decision_date', { length: 20 }),
  issuingAuthority: varchar('issuing_authority', { length: 255 }),
  operationStatus: varchar('operation_status', { length: 50 }),
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  // Metadata
  metadata: jsonb('metadata'),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  source: varchar('source', { length: 50 }).default('manual'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  routeCodeIdx: index('routes_code_idx').on(table.routeCode),
  departureIdx: index('routes_departure_idx').on(table.departureStation),
  arrivalIdx: index('routes_arrival_idx').on(table.arrivalStation),
}))

export type Route = typeof routes.$inferSelect
export type NewRoute = typeof routes.$inferInsert
