/**
 * Fetch one AppSheet logical table with progress + chain documentation + missing-endpoint hint.
 */
import { appsheetConfig } from '@/config/appsheet.config'
import { ENV, missingEndpointHint } from '@/config/appsheet-schedule-chain-docs'
import { appsheetClient } from '@/services/appsheet-client.service'
import type { AppSheetScheduleProgressReporter } from '@/types/appsheet-schedule-progress'

export type AppsheetLogicalScheduleTable = keyof typeof ENV

function errDetail(e: unknown): string {
  if (e instanceof Error) return e.message
  return 'Lỗi không xác định'
}

export async function fetchAppsheetTableWithChainDoc(
  logical: AppsheetLogicalScheduleTable,
  progressId: string,
  label: string,
  chainDoc: string,
  report: AppSheetScheduleProgressReporter | undefined,
): Promise<Record<string, unknown>[]> {
  report?.({ id: progressId, label, phase: 'start', detail: chainDoc })
  try {
    const rows = (await appsheetClient.fetchByName(logical)) as Record<string, unknown>[]
    const n = Array.isArray(rows) ? rows.length : 0
    report?.({
      id: progressId,
      label,
      phase: 'done',
      detail: `${chainDoc}\n\n→ Đã đọc ${n} dòng từ AppSheet.`,
    })
    return Array.isArray(rows) ? rows : []
  } catch (e) {
    const msg = errDetail(e)
    const noEp = !appsheetConfig.endpoints[logical]?.trim()
    const hint = noEp || /not configured/i.test(msg) ? missingEndpointHint(logical) : ''
    report?.({
      id: progressId,
      label,
      phase: 'error',
      detail: `${chainDoc}\n\n✗ ${msg}${hint}`,
    })
    return []
  }
}
