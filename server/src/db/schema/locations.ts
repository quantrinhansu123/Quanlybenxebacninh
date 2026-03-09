/**
 * Locations Schema (Điểm đón trả/Trạm xe)
 * Migrated from Supabase: locations table
 */
import { pgTable, uuid, varchar, text, boolean, timestamp, decimal, index } from 'drizzle-orm/pg-core'

export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Basic fields
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  stationType: varchar('station_type', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  // Geographic coordinates
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  codeIdx: index('locations_code_idx').on(table.code),
  activeIdx: index('locations_active_idx').on(table.isActive),
}))

export type Location = typeof locations.$inferSelect
export type NewLocation = typeof locations.$inferInsert
