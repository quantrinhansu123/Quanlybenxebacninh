/**
 * ID Mappings Table
 * Tracks Firebase ID → PostgreSQL UUID mappings for migration
 */
import { pgTable, uuid, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const idMappings = pgTable('id_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseId: varchar('firebase_id', { length: 100 }).notNull(),
  postgresId: uuid('postgres_id').notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueFirebaseEntity: uniqueIndex('unique_firebase_entity').on(table.firebaseId, table.entityType),
}))

export type IdMapping = typeof idMappings.$inferSelect
export type NewIdMapping = typeof idMappings.$inferInsert
