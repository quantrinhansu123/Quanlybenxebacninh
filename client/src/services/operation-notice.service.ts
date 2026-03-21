import api from '@/lib/api'
import type { OperationNotice } from '@/types'

const normNotice = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()

export const operationNoticeService = {
  getByRouteCode: async (routeCode: string, noticeNumber?: string): Promise<OperationNotice[]> => {
    const params = new URLSearchParams({ routeCode: routeCode.trim() })
    if (noticeNumber) params.append('noticeNumber', noticeNumber.trim())
    const response = await api.get<OperationNotice[]>(`/operation-notices?${params}`)
    return response.data
  },

  /**
   * Khớp SoThongBao với DB: thử đúng chuỗi trước, rồi so khớp đã chuẩn hóa (khoảng trắng, hoa thường)
   * và chứa lẫn nhau (một số nguồn AppSheet/Sheet lệch định dạng).
   */
  resolveForSchedule: async (routeCode: string, noticeNumber: string): Promise<OperationNotice | null> => {
    const rc = routeCode.trim()
    const raw = noticeNumber.trim()
    if (!rc || !raw) return null

    const exact = await operationNoticeService.getByRouteCode(rc, raw)
    if (exact.length > 0) return exact[0]

    const all = await operationNoticeService.getByRouteCode(rc)
    const target = normNotice(raw)
    const byNorm = all.find((n) => normNotice(n.noticeNumber) === target)
    if (byNorm) return byNorm

    return (
      all.find(
        (n) =>
          target.includes(normNotice(n.noticeNumber)) || normNotice(n.noticeNumber).includes(target),
      ) ?? null
    )
  },
}
