/**
 * Schedules Schema (Lịch trình cố định)
 * Operating schedules for routes by operators
 */
import { pgTable, uuid, varchar, time, jsonb, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { routes } from './routes'
import { operators } from './operators'

export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Schedule identification
  scheduleCode: varchar('schedule_code', { length: 50 }).unique().notNull(),
  // References
  routeId: uuid('route_id').notNull().references(() => routes.id, { onDelete: 'cascade' }),
  operatorId: uuid('operator_id').notNull().references(() => operators.id, { onDelete: 'cascade' }),
  // Schedule details
  departureTime: time('departure_time').notNull(), // HH:MM format
  frequencyType: varchar('frequency_type', { length: 20 }).notNull(), // daily, weekly, specific_days
  daysOfWeek: jsonb('days_of_week').$type<number[]>(), // [1,2,3,4,5,6,7] for Mon-Sun
  effectiveFrom: varchar('effective_from', { length: 20 }).notNull(), // Date string
  effectiveTo: varchar('effective_to', { length: 20 }), // Optional end date
  // Sync fields
  firebaseId: varchar('firebase_id', { length: 100 }).unique(),
  direction: varchar('direction', { length: 10 }),
  daysOfMonth: jsonb('days_of_month').$type<number[]>(),
  calendarType: varchar('calendar_type', { length: 20 }),
  notificationNumber: varchar('notification_number', { length: 100 }),
  tripStatus: varchar('trip_status', { length: 50 }),
  source: varchar('source', { length: 50 }).default('manual'),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  scheduleCodeIdx: index('schedules_code_idx').on(table.scheduleCode),
  routeIdx: index('schedules_route_idx').on(table.routeId),
  operatorIdx: index('schedules_operator_idx').on(table.operatorId),
  activeIdx: index('schedules_active_idx').on(table.isActive),
  firebaseIdIdx: index('schedules_firebase_id_idx').on(table.firebaseId),
}))

export type Schedule = typeof schedules.$inferSelect
export type NewSchedule = typeof schedules.$inferInsert
