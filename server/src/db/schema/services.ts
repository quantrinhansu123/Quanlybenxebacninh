import { pgTable, uuid, varchar, decimal, boolean, integer, timestamp } from 'drizzle-orm/pg-core'

/**
 * Services Table
 * Stores service definitions for dispatch operations
 */
export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  taxPercentage: decimal('tax_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  materialType: varchar('material_type', { length: 100 }).notNull(),
  useQuantityFormula: boolean('use_quantity_formula').notNull().default(false),
  usePriceFormula: boolean('use_price_formula').notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  isDefault: boolean('is_default').notNull().default(false),
  autoCalculateQuantity: boolean('auto_calculate_quantity').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  description: varchar('description', { length: 500 }),
  basePrice: decimal('base_price', { precision: 15, scale: 2 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Service Formulas Table
 * Stores formula definitions for quantity and price calculations
 */
export const serviceFormulas = pgTable('service_formulas', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  formulaType: varchar('formula_type', { length: 20 }).notNull(), // 'quantity' or 'price'
  formulaExpression: varchar('formula_expression', { length: 1000 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Service Formula Usage Table
 * Junction table linking services to formulas
 */
export const serviceFormulaUsage = pgTable('service_formula_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  formulaId: uuid('formula_id').notNull().references(() => serviceFormulas.id, { onDelete: 'cascade' }),
  usageType: varchar('usage_type', { length: 20 }).notNull(), // 'quantity' or 'price'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Service Charges Table
 * Stores charges applied to dispatch records
 */
export const serviceCharges = pgTable('service_charges', {
  id: uuid('id').primaryKey().defaultRandom(),
  dispatchRecordId: uuid('dispatch_record_id').notNull(),
  serviceId: uuid('service_id').notNull().references(() => services.id),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unitPrice: decimal('unit_price', { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
