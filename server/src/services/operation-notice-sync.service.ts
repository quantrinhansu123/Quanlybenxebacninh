/**
 * Thống kê link file có thể mở từ file_path (build runtime, không ghi DB).
 */
import { db } from '../db/drizzle.js'
import { operationNotices } from '../db/schema/index.js'
import { buildThongBaoFileUrlFromPath } from '../utils/operation-notice-file-url.js'

export type GenerateOperationNoticeFileUrlsResult = {
  scanned: number
  updated: number
  skipped: number
  totalInDb: number
  withFileUrl: number
}

export async function generateOperationNoticeFileUrlsFromFilePath(
  dryRun = false,
): Promise<GenerateOperationNoticeFileUrlsResult> {
  void dryRun
  if (!db) throw new Error('Database not configured')

  const rows = await db
    .select({
      id: operationNotices.id,
      filePath: operationNotices.filePath,
    })
    .from(operationNotices)

  let withFileUrl = 0
  let skipped = 0

  for (const row of rows) {
    const built = buildThongBaoFileUrlFromPath(row.filePath)
    if (built) withFileUrl++
    else skipped++
  }

  return {
    scanned: rows.length,
    updated: 0,
    skipped,
    totalInDb: rows.length,
    withFileUrl,
  }
}
