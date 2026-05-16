/**
 * Schedules — mirror BieuDoChayXeChiTiet (AppSheet column names in DB).
 */
import { pgTable, uuid, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core'

export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  idNutChay: varchar('ID_NutChay', { length: 100 }).unique(),
  refThongBaoKhaiThac: text('Ref_ThongBaoKhaiThac'),
  soThongBao: varchar('SoThongBao', { length: 100 }),
  chieu: varchar('Chieu', { length: 50 }),
  gioXuatBen: text('GioXuatBen'),
  ngayHoatDong: jsonb('NgayHoatDong').$type<number[]>(),
  loaiNgay: varchar('LoaiNgay', { length: 50 }),
  trangThaiChuyen: varchar('TrangThaiChuyen', { length: 50 }),
  ghiChu: text('GhiChu'),
  thoiGianNhap: varchar('ThoiGianNhap', { length: 50 }),
  soChuyenThangCt: varchar('SoChuyen_Thang_CT', { length: 50 }),
  ngayBiNgung: varchar('NgayBiNgung', { length: 255 }),
  user: text('User'),
  ngayHoatDongGoc: text('NgayHoatDongGoc'),
  trangThaiTongHop: text('TrangThaiTongHop'),
  lanDieuChinhCuoi: text('LanDieuChinhCuoi'),
  refVanBanDieuChinhCuoi: text('Ref_VanBanDieuChinhCuoi'),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Schedule = typeof schedules.$inferSelect
export type NewSchedule = typeof schedules.$inferInsert
