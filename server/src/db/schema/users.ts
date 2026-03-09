/**
 * Users Schema
 * Migrated from Firebase RTDB: users
 */
import { pgTable, uuid, varchar, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { locations } from './locations.js'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseId: varchar('firebase_id', { length: 100 }).unique(),
  // Auth fields
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  // Profile fields
  name: varchar('name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 50 }).default('user').notNull(),
  // Status
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: boolean('email_verified').default(false),
  // Bến phụ trách (Assigned station)
  benPhuTrach: uuid('ben_phu_trach').references(() => locations.id),
  // Session tracking
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  // Metadata
  metadata: jsonb('metadata'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
  benPhuTrachIdx: index('users_ben_phu_trach_idx').on(table.benPhuTrach),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
