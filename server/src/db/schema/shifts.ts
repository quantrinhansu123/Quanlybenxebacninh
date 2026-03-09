/**
 * Shifts Schema (Ca trực)
 * Migrated from Firebase RTDB: shifts
 */
import { pgTable, uuid, varchar, time, boolean, timestamp, index } from 'drizzle-orm/pg-core'

export const shifts = pgTable('shifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseId: varchar('firebase_id', { length: 100 }).unique(),
  // Shift details
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }).unique(),
  startTime: time('start_time'),
  endTime: time('end_time'),
  description: varchar('description', { length: 255 }),
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  codeIdx: index('shifts_code_idx').on(table.code),
}))

export type Shift = typeof shifts.$inferSelect
export type NewShift = typeof shifts.$inferInsert
