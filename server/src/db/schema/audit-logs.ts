/**
 * Audit Logs Schema
 * Tracks all data changes for compliance and auditing
 */
import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  recordId: uuid('record_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(), // INSERT, UPDATE, DELETE
  userId: uuid('user_id').references(() => users.id),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tableNameIdx: index('audit_logs_table_idx').on(table.tableName),
  recordIdIdx: index('audit_logs_record_idx').on(table.recordId),
  userIdIdx: index('audit_logs_user_idx').on(table.userId),
  createdAtIdx: index('audit_logs_created_idx').on(table.createdAt),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}))

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
