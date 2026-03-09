/**
 * Dispatch Status Management
 *
 * Simple status validation without full state machine complexity.
 * Defines valid status transitions for dispatch workflow.
 *
 * Workflow:
 * entered -> passengers_dropped -> permit_issued -> paid -> departure_ordered -> departed -> exited
 *    |            |                    |
 *    |            v                    v
 *    |      permit_rejected      permit_rejected -> (retry) passengers_dropped
 *    |
 *    +---> permit_issued (direct)
 *    +---> permit_rejected (direct)
 */

/**
 * Dispatch status constants
 */
export const DISPATCH_STATUS = {
  ENTERED: 'entered',
  PASSENGERS_DROPPED: 'passengers_dropped',
  PERMIT_ISSUED: 'permit_issued',
  PERMIT_REJECTED: 'permit_rejected',
  PAID: 'paid',
  DEPARTURE_ORDERED: 'departure_ordered',
  DEPARTED: 'departed',
  EXITED: 'exited',
  CANCELLED: 'cancelled',
} as const

/**
 * Type for dispatch status values
 */
export type DispatchStatusType = typeof DISPATCH_STATUS[keyof typeof DISPATCH_STATUS]

/**
 * Valid status transitions map
 * Each key maps to array of valid next statuses
 */
export const VALID_TRANSITIONS: Record<DispatchStatusType, DispatchStatusType[]> = {
  [DISPATCH_STATUS.ENTERED]: [DISPATCH_STATUS.PASSENGERS_DROPPED, DISPATCH_STATUS.PERMIT_ISSUED, DISPATCH_STATUS.PERMIT_REJECTED, DISPATCH_STATUS.CANCELLED],
  [DISPATCH_STATUS.PASSENGERS_DROPPED]: [DISPATCH_STATUS.PERMIT_ISSUED, DISPATCH_STATUS.PERMIT_REJECTED, DISPATCH_STATUS.CANCELLED],
  [DISPATCH_STATUS.PERMIT_ISSUED]: [DISPATCH_STATUS.PAID, DISPATCH_STATUS.CANCELLED],
  [DISPATCH_STATUS.PERMIT_REJECTED]: [DISPATCH_STATUS.PASSENGERS_DROPPED, DISPATCH_STATUS.CANCELLED], // Can retry
  [DISPATCH_STATUS.PAID]: [DISPATCH_STATUS.DEPARTURE_ORDERED, DISPATCH_STATUS.CANCELLED],
  [DISPATCH_STATUS.DEPARTURE_ORDERED]: [DISPATCH_STATUS.DEPARTED, DISPATCH_STATUS.CANCELLED],
  [DISPATCH_STATUS.DEPARTED]: [DISPATCH_STATUS.EXITED, DISPATCH_STATUS.CANCELLED],
  [DISPATCH_STATUS.EXITED]: [DISPATCH_STATUS.CANCELLED], // Can still cancel after exited
  [DISPATCH_STATUS.CANCELLED]: [], // Terminal state
}

/**
 * Status display names (Vietnamese)
 */
export const STATUS_DISPLAY_NAMES: Record<DispatchStatusType, string> = {
  [DISPATCH_STATUS.ENTERED]: 'Đã vào bến',
  [DISPATCH_STATUS.PASSENGERS_DROPPED]: 'Đã trả khách',
  [DISPATCH_STATUS.PERMIT_ISSUED]: 'Đã cấp phép',
  [DISPATCH_STATUS.PERMIT_REJECTED]: 'Từ chối cấp phép',
  [DISPATCH_STATUS.PAID]: 'Đã thanh toán',
  [DISPATCH_STATUS.DEPARTURE_ORDERED]: 'Đã điều lệnh',
  [DISPATCH_STATUS.DEPARTED]: 'Đã xuất bến',
  [DISPATCH_STATUS.EXITED]: 'Đã ra khỏi bến',
  [DISPATCH_STATUS.CANCELLED]: 'Đã hủy bỏ',
}

/**
 * Check if a status is a valid dispatch status
 */
export function isValidStatus(status: string): status is DispatchStatusType {
  return Object.values(DISPATCH_STATUS).includes(status as DispatchStatusType)
}

/**
 * Check if transition from one status to another is valid
 */
export function canTransitionStatus(from: DispatchStatusType, to: DispatchStatusType): boolean {
  const validNextStatuses = VALID_TRANSITIONS[from]
  return validNextStatuses?.includes(to) ?? false
}

/**
 * Validate status transition, throw error if invalid
 * @throws Error if transition is not allowed
 */
export function validateStatusTransition(from: string, to: string): void {
  if (!isValidStatus(from)) {
    throw new Error(`Invalid current status: ${from}`)
  }
  if (!isValidStatus(to)) {
    throw new Error(`Invalid target status: ${to}`)
  }
  if (!canTransitionStatus(from, to)) {
    throw new Error(`Invalid status transition: ${from} -> ${to}. Valid transitions from ${from}: ${getNextValidStatuses(from).join(', ') || 'none'}`)
  }
}

/**
 * Get list of valid next statuses for current status
 */
export function getNextValidStatuses(current: DispatchStatusType): DispatchStatusType[] {
  return VALID_TRANSITIONS[current] || []
}

/**
 * Check if status is a terminal state (no further transitions)
 */
export function isTerminalStatus(status: DispatchStatusType): boolean {
  return getNextValidStatuses(status).length === 0
}

/**
 * Get display name for a status
 */
export function getStatusDisplayName(status: DispatchStatusType): string {
  return STATUS_DISPLAY_NAMES[status] || status
}

/**
 * Get all statuses as array (useful for dropdowns)
 */
export function getAllStatuses(): DispatchStatusType[] {
  return Object.values(DISPATCH_STATUS)
}

/**
 * Get all statuses with display names (useful for UI)
 */
export function getStatusOptions(): Array<{ value: DispatchStatusType; label: string }> {
  return getAllStatuses().map(status => ({
    value: status,
    label: getStatusDisplayName(status),
  }))
}
