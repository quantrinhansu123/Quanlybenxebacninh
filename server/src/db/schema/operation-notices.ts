/**
 * Operation Notices Schema (Thong bao khai thac)
 * Synced from Google Sheet: THONGBAO_KHAITHAC
 */
import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'

export const operationNotices = pgTable('operation_notices', {
  id: uuid('id').primaryKey().defaultRandom(),
  routeCode: varchar('route_code', { length: 50 }).notNull(),
  operatorRef: varchar('operator_ref', { length: 50 }),
  noticeNumber: varchar('notice_number', { length: 100 }).notNull(),
  issueDate: varchar('issue_date', { length: 20 }),
  effectiveDate: varchar('effective_date', { length: 20 }),
  filePath: text('file_path'),
  fileUrl: text('file_url'),
  issuingAuthority: varchar('issuing_authority', { length: 255 }),
  status: varchar('status', { length: 50 }).default('Con hieu luc'),
  noticeType: varchar('notice_type', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  routeCodeIdx: index('notices_route_code_idx').on(table.routeCode),
  noticeNumberIdx: index('notices_notice_number_idx').on(table.noticeNumber),
  routeNoticeUniqueIdx: uniqueIndex('notices_route_notice_unique_idx').on(table.routeCode, table.noticeNumber),
}))

export type OperationNotice = typeof operationNotices.$inferSelect
export type NewOperationNotice = typeof operationNotices.$inferInsert
