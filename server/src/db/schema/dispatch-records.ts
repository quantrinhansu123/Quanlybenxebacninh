/**
 * Dispatch Records Schema (Đơn điều độ)
 * Core transactional table - Migrated from Firebase RTDB: dispatch_records
 * Contains denormalized fields for reporting performance
 */
import { pgTable, uuid, varchar, integer, decimal, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { vehicles } from './vehicles'
import { drivers } from './drivers'
import { routes } from './routes'
import { operators } from './operators'
import { users } from './users'
import { shifts } from './shifts'

export const dispatchRecords = pgTable('dispatch_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseId: varchar('firebase_id', { length: 100 }).unique(),
  // Foreign keys
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  driverId: uuid('driver_id').references(() => drivers.id),
  routeId: uuid('route_id').references(() => routes.id),
  operatorId: uuid('operator_id').references(() => operators.id),
  userId: uuid('user_id').references(() => users.id),
  shiftId: uuid('shift_id').references(() => shifts.id),
  scheduleId: uuid('schedule_id'), // Schedule reference (optional)
  // Status workflow
  status: varchar('status', { length: 50 }).default('entered').notNull(),
  permitStatus: varchar('permit_status', { length: 20 }), // 'approved' | 'rejected' | null
  // Timing - Entry
  entryTime: timestamp('entry_time', { withTimezone: true }),
  entryBy: uuid('entry_by').references(() => users.id),
  entryByName: varchar('entry_by_name', { length: 255 }),
  entryShiftId: uuid('entry_shift_id').references(() => shifts.id),
  entryImageUrl: text('entry_image_url'),
  // Timing - Passenger drop
  passengerDropTime: timestamp('passenger_drop_time', { withTimezone: true }),
  passengersArrived: integer('passengers_arrived'),
  passengerDropBy: uuid('passenger_drop_by').references(() => users.id),
  passengerDropByName: varchar('passenger_drop_by_name', { length: 255 }),
  // Timing - Permit (boarding)
  boardingPermitTime: timestamp('boarding_permit_time', { withTimezone: true }),
  boardingPermitBy: uuid('boarding_permit_by').references(() => users.id),
  boardingPermitByName: varchar('boarding_permit_by_name', { length: 255 }),
  permitShiftId: uuid('permit_shift_id').references(() => shifts.id),
  plannedDepartureTime: timestamp('planned_departure_time', { withTimezone: true }),
  transportOrderCode: varchar('transport_order_code', { length: 50 }),
  seatCount: integer('seat_count'),
  // Timing - Payment
  paymentTime: timestamp('payment_time', { withTimezone: true }),
  paymentAmount: decimal('payment_amount', { precision: 12, scale: 2 }),
  paymentMethod: varchar('payment_method', { length: 20 }), // 'cash' | 'transfer' | 'card'
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  paymentBy: uuid('payment_by').references(() => users.id),
  paymentByName: varchar('payment_by_name', { length: 255 }),
  paymentShiftId: uuid('payment_shift_id').references(() => shifts.id),
  // Timing - Departure order
  departureOrderTime: timestamp('departure_order_time', { withTimezone: true }),
  passengersDeparting: integer('passengers_departing'),
  departureOrderBy: uuid('departure_order_by').references(() => users.id),
  departureOrderByName: varchar('departure_order_by_name', { length: 255 }),
  departureOrderShiftId: uuid('departure_order_shift_id').references(() => shifts.id),
  // Timing - Exit
  exitTime: timestamp('exit_time', { withTimezone: true }),
  exitBy: uuid('exit_by').references(() => users.id),
  exitByName: varchar('exit_by_name', { length: 255 }),
  exitShiftId: uuid('exit_shift_id').references(() => shifts.id),
  // Passenger info (legacy)
  passengers: integer('passengers').default(0),
  passengerManifest: jsonb('passenger_manifest'),
  // Financial (legacy)
  fare: decimal('fare', { precision: 12, scale: 2 }),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
  serviceCharges: jsonb('service_charges'),
  // Permit info (legacy)
  permitNumber: varchar('permit_number', { length: 50 }),
  departureOrderNumber: varchar('departure_order_number', { length: 50 }),
  // Notes
  notes: text('notes'),
  rejectionReason: text('rejection_reason'),
  // ====== DENORMALIZED FIELDS FOR REPORTING ======
  // Vehicle snapshot
  vehiclePlateNumber: varchar('vehicle_plate_number', { length: 20 }),
  vehicleSeatCount: integer('vehicle_seat_count'),
  vehicleOperatorId: uuid('vehicle_operator_id'),
  vehicleOperatorName: varchar('vehicle_operator_name', { length: 255 }),
  vehicleOperatorCode: varchar('vehicle_operator_code', { length: 50 }),
  // Driver snapshot
  driverFullName: varchar('driver_full_name', { length: 255 }),
  driverPhone: varchar('driver_phone', { length: 20 }),
  // Operator snapshot (legacy - use vehicle_operator_* instead)
  operatorName: varchar('operator_name', { length: 255 }),
  operatorCode: varchar('operator_code', { length: 50 }),
  // Route snapshot
  routeCode: varchar('route_code', { length: 50 }),
  routeName: varchar('route_name', { length: 255 }),
  routeType: varchar('route_type', { length: 50 }),
  routeDestinationId: uuid('route_destination_id'),
  routeDestinationName: varchar('route_destination_name', { length: 255 }),
  routeDestinationCode: varchar('route_destination_code', { length: 50 }),
  departureStation: varchar('departure_station', { length: 255 }),
  arrivalStation: varchar('arrival_station', { length: 255 }),
  // User snapshot
  createdByName: varchar('created_by_name', { length: 255 }),
  // ====== END DENORMALIZED FIELDS ======
  // Status flags
  isActive: boolean('is_active').default(true).notNull(),
  isDeleted: boolean('is_deleted').default(false),
  // Metadata
  metadata: jsonb('metadata'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  vehicleIdx: index('dispatch_vehicle_idx').on(table.vehicleId),
  driverIdx: index('dispatch_driver_idx').on(table.driverId),
  operatorIdx: index('dispatch_operator_idx').on(table.operatorId),
  statusIdx: index('dispatch_status_idx').on(table.status),
  entryTimeIdx: index('dispatch_entry_time_idx').on(table.entryTime),
  createdAtIdx: index('dispatch_created_at_idx').on(table.createdAt),
  plateNumberIdx: index('dispatch_plate_number_idx').on(table.vehiclePlateNumber),
}))

export const dispatchRecordsRelations = relations(dispatchRecords, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [dispatchRecords.vehicleId],
    references: [vehicles.id],
  }),
  driver: one(drivers, {
    fields: [dispatchRecords.driverId],
    references: [drivers.id],
  }),
  route: one(routes, {
    fields: [dispatchRecords.routeId],
    references: [routes.id],
  }),
  operator: one(operators, {
    fields: [dispatchRecords.operatorId],
    references: [operators.id],
  }),
  user: one(users, {
    fields: [dispatchRecords.userId],
    references: [users.id],
  }),
  shift: one(shifts, {
    fields: [dispatchRecords.shiftId],
    references: [shifts.id],
  }),
}))

export type DispatchRecord = typeof dispatchRecords.$inferSelect
export type NewDispatchRecord = typeof dispatchRecords.$inferInsert
