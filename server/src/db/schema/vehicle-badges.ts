/**
 * Vehicle Badges Schema (Phù hiệu xe)
 * Migrated from Firebase RTDB: vehicle_badges, datasheet/PHUHIEUXE
 */
import { pgTable, uuid, varchar, boolean, timestamp, text, index } from 'drizzle-orm/pg-core'

export const vehicleBadges = pgTable('vehicle_badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseId: varchar('firebase_id', { length: 100 }).unique(),
  // Core fields
  badgeNumber: varchar('badge_number', { length: 50 }),
  plateNumber: varchar('plate_number', { length: 20 }).notNull(),
  // Ref text (AppSheet / firebase_id / uuid string) — không FK DB sau migration 021
  vehicleId: text('vehicle_id'),
  operatorId: text('operator_id'),
  routeId: text('route_id'),
  // Badge details
  badgeType: varchar('badge_type', { length: 50 }),
  routeCode: varchar('route_code', { length: 50 }),
  tuyenBusCode: varchar('tuyen_bus_code', { length: 50 }),
  // AppSheet PHUHIEUXE refs (quoted column names)
  refGpkd: varchar('Ref_GPKD', { length: 255 }),
  refThongBao: varchar('Ref_ThongBao', { length: 255 }),
  refDonViCapPhuHieu: varchar('Ref_DonViCapPhuHieu', { length: 255 }),
  loaiCap: varchar('LoaiCap', { length: 255 }),
  lyDoCapLai: text('LyDoCapLai'),
  soPhuHieuCu: varchar('SoPhuHieuCu', { length: 50 }),
  maHoSo: varchar('MaHoSo', { length: 255 }),
  // Validity (stored as YYYY-MM-DD strings)
  issueDate: varchar('issue_date', { length: 10 }),
  expiryDate: varchar('expiry_date', { length: 10 }),
  // Status
  status: varchar('status', { length: 50 }).default('active'),
  isActive: boolean('is_active').default(true).notNull(),
  // Denormalized fields
  operatorName: varchar('operator_name', { length: 255 }),
  operatorCode: varchar('operator_code', { length: 50 }),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  plateIdx: index('badges_plate_idx').on(table.plateNumber),
  operatorIdx: index('badges_operator_idx').on(table.operatorId),
  routeCodeIdx: index('badges_route_code_idx').on(table.routeCode),
  expiryIdx: index('badges_expiry_idx').on(table.expiryDate),
  refDonViIdx: index('vb_ref_don_vi_cap_idx').on(table.refDonViCapPhuHieu),
  refThongBaoIdx: index('vb_ref_thong_bao_idx').on(table.refThongBao),
}))

export type VehicleBadge = typeof vehicleBadges.$inferSelect
export type NewVehicleBadge = typeof vehicleBadges.$inferInsert
