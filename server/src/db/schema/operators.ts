/**
 * Operators Schema (Nhà xe/Đơn vị vận tải)
 * Migrated from Firebase RTDB: operators, datasheet/DONVIVANTAI
 */
import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

export const operators = pgTable('operators', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Legacy ID from Firebase for migration mapping
  firebaseId: varchar('firebase_id', { length: 100 }).unique(),
  // Business fields
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  shortName: varchar('short_name', { length: 100 }),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  taxCode: varchar('tax_code', { length: 20 }),
  representative: varchar('representative', { length: 255 }),
  representativePosition: varchar('representative_position', { length: 100 }),
  businessLicense: varchar('business_license', { length: 100 }),
  // Location
  province: varchar('province', { length: 100 }),
  district: varchar('district', { length: 100 }),
  // Ticket delegation
  isTicketDelegated: boolean('is_ticket_delegated').default(false),
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  // Metadata from Sheets
  metadata: jsonb('metadata'),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  source: varchar('source', { length: 50 }).default('manual'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  codeIdx: index('operators_code_idx').on(table.code),
  activeIdx: index('operators_active_idx').on(table.isActive),
}))

export type Operator = typeof operators.$inferSelect
export type NewOperator = typeof operators.$inferInsert
