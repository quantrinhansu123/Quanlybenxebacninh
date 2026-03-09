/**
 * Invoices Schema (Hóa đơn)
 * Migrated from Firebase RTDB: invoices
 */
import { pgTable, uuid, varchar, decimal, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { dispatchRecords } from './dispatch-records'
import { operators } from './operators'

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseId: varchar('firebase_id', { length: 100 }).unique(),
  // References
  dispatchRecordId: uuid('dispatch_record_id').references(() => dispatchRecords.id),
  operatorId: uuid('operator_id').references(() => operators.id),
  // Invoice details
  invoiceNumber: varchar('invoice_number', { length: 50 }).unique(),
  invoiceDate: timestamp('invoice_date', { withTimezone: true }),
  // Amounts
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }),
  tax: decimal('tax', { precision: 12, scale: 2 }),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
  // Payment
  paymentStatus: varchar('payment_status', { length: 50 }).default('pending'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  // Notes
  notes: text('notes'),
  // Status
  status: varchar('status', { length: 50 }).default('draft'),
  isActive: boolean('is_active').default(true).notNull(),
  // Metadata
  metadata: jsonb('metadata'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  invoiceNumberIdx: index('invoices_number_idx').on(table.invoiceNumber),
  dispatchIdx: index('invoices_dispatch_idx').on(table.dispatchRecordId),
  operatorIdx: index('invoices_operator_idx').on(table.operatorId),
  statusIdx: index('invoices_status_idx').on(table.status),
}))

export const invoicesRelations = relations(invoices, ({ one }) => ({
  dispatchRecord: one(dispatchRecords, {
    fields: [invoices.dispatchRecordId],
    references: [dispatchRecords.id],
  }),
  operator: one(operators, {
    fields: [invoices.operatorId],
    references: [operators.id],
  }),
}))

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
