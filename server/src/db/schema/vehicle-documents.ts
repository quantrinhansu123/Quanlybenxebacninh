/**
 * Vehicle Documents Schema
 * Stores vehicle registration, inspection, insurance, operation permit, emblem documents
 */
import { pgTable, uuid, varchar, date, text, timestamp, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { vehicles } from './vehicles'
import { users } from './users'

export const vehicleDocuments = pgTable('vehicle_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id).notNull(),
  documentType: varchar('document_type', { length: 50 }).notNull(), // registration, inspection, insurance, operation_permit, emblem
  documentNumber: varchar('document_number', { length: 100 }),
  issueDate: date('issue_date'),
  expiryDate: date('expiry_date'),
  issuingAuthority: varchar('issuing_authority', { length: 255 }),
  documentUrl: text('document_url'),
  notes: text('notes'),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  vehicleIdx: index('vehicle_documents_vehicle_idx').on(table.vehicleId),
  documentTypeIdx: index('vehicle_documents_type_idx').on(table.documentType),
  expiryIdx: index('vehicle_documents_expiry_idx').on(table.expiryDate),
}))

export const vehicleDocumentsRelations = relations(vehicleDocuments, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleDocuments.vehicleId],
    references: [vehicles.id],
  }),
  updatedByUser: one(users, {
    fields: [vehicleDocuments.updatedBy],
    references: [users.id],
  }),
}))

export type VehicleDocument = typeof vehicleDocuments.$inferSelect
export type NewVehicleDocument = typeof vehicleDocuments.$inferInsert
