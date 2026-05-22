/** Chỉ hai loại phù hiệu dùng cho Quản lý xe / quanly-data — khớp chính xác chuỗi DB */
export const QUANLY_BADGE_TYPE_BUS = 'Buýt' as const
export const QUANLY_BADGE_TYPE_FIXED_ROUTE = 'Tuyến cố định' as const

export const QUANLY_ALLOWED_BADGE_TYPES = [
  QUANLY_BADGE_TYPE_BUS,
  QUANLY_BADGE_TYPE_FIXED_ROUTE,
] as const

export type QuanLyAllowedBadgeType = (typeof QUANLY_ALLOWED_BADGE_TYPES)[number]

export function isQuanLyAllowedBadgeType(badgeType: string | null | undefined): badgeType is QuanLyAllowedBadgeType {
  const t = (badgeType || '').trim()
  return t === QUANLY_BADGE_TYPE_BUS || t === QUANLY_BADGE_TYPE_FIXED_ROUTE
}

export const QUANLY_ALLOWED_BADGE_TYPES_LABEL = 'Buýt hoặc Tuyến cố định'
