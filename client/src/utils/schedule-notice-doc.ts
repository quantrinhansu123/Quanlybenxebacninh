import type { Schedule } from '@/types'
import { buildThongBaoFileUrlFromPath } from '@/utils/operation-notice-file-url'

type ScheduleWithNoticeMeta = Schedule & {
  metadata?: {
    notice_meta?: {
      id?: string
      filePath?: string
      fileUrl?: string
      number?: string
      routeRef?: string
      displayText?: string
    }
    notice?: {
      File?: string
      ThongBaoHienThi?: string
    }
  }
}

function resolveFilePath(schedule: Schedule): string {
  const s = schedule as ScheduleWithNoticeMeta
  return String(
    s.metadata?.notice_meta?.filePath ||
      s.metadata?.notice?.File ||
      '',
  ).trim()
}

/** URL văn bản TB: file_url DB hoặc tạo từ file_path (AppSheet gettablefileurl). */
export function getScheduleNoticeFileUrl(schedule: Schedule): string {
  const s = schedule as ScheduleWithNoticeMeta
  const fromDb = String(s.notificationFileUrl || s.metadata?.notice_meta?.fileUrl || '').trim()
  if (fromDb) return fromDb
  return buildThongBaoFileUrlFromPath(resolveFilePath(schedule)) || ''
}

export function getScheduleNoticeId(schedule: Schedule): string {
  const s = schedule as ScheduleWithNoticeMeta
  return String(s.refThongBaoKhaiThac || s.metadata?.notice_meta?.id || '').trim()
}

export function openNoticeFileUrl(raw: string): void {
  const href = String(raw || '').trim()
  if (!href) return
  window.open(href, '_blank', 'noopener,noreferrer')
}
