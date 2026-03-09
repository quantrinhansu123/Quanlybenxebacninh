/**
 * Driver-Operators Junction Table
 * Manages many-to-many relationship between drivers and operators
 */
import { pgTable, uuid, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { drivers } from './drivers.js'
import { operators } from './operators.js'

export const driverOperators = pgTable('driver_operators', {
  id: uuid('id').primaryKey().defaultRandom(),
  driverId: uuid('driver_id').notNull().references(() => drivers.id, { onDelete: 'cascade' }),
  operatorId: uuid('operator_id').notNull().references(() => operators.id, { onDelete: 'cascade' }),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  driverIdx: index('driver_operators_driver_id_idx').on(table.driverId),
  operatorIdx: index('driver_operators_operator_id_idx').on(table.operatorId),
  primaryIdx: index('driver_operators_primary_idx').on(table.isPrimary),
  uniqueDriverOperator: unique('driver_operators_driver_id_operator_id_unique').on(table.driverId, table.operatorId),
}))

export const driverOperatorsRelations = relations(driverOperators, ({ one }) => ({
  driver: one(drivers, {
    fields: [driverOperators.driverId],
    references: [drivers.id],
  }),
  operator: one(operators, {
    fields: [driverOperators.operatorId],
    references: [operators.id],
  }),
}))

export type DriverOperator = typeof driverOperators.$inferSelect
export type NewDriverOperator = typeof driverOperators.$inferInsert
