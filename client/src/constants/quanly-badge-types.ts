/** Chỉ hai loại phù hiệu — khớp chính xác «Buýt» hoặc «Tuyến cố định» (không TCD, không gần đúng) */
export const QUANLY_BADGE_TYPE_BUS = 'Buýt' as const
export const QUANLY_BADGE_TYPE_FIXED_ROUTE = 'Tuyến cố định' as const

export const QUANLY_ALLOWED_BADGE_TYPES: readonly string[] = [
  QUANLY_BADGE_TYPE_BUS,
  QUANLY_BADGE_TYPE_FIXED_ROUTE,
]

export function isQuanLyAllowedBadgeType(badgeType: string | null | undefined): boolean {
  const t = (badgeType || '').trim()
  return t === QUANLY_BADGE_TYPE_BUS || t === QUANLY_BADGE_TYPE_FIXED_ROUTE
}

export const QUANLY_ALLOWED_BADGE_TYPES_LABEL = 'Buýt hoặc Tuyến cố định'
