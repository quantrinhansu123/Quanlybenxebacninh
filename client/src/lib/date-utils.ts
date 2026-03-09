import { format, isValid } from 'date-fns'

/**
 * Format date string for display, handling UTC timezone correctly.
 * Use this for date-only fields (no time component) like license expiry.
 *
 * Approach: Extract date part and set time to noon to avoid timezone shift.
 */
export const formatDateOnly = (dateString: string | Date | undefined | null): string => {
  if (!dateString) return "N/A"

  try {
    let date: Date

    if (dateString instanceof Date) {
      date = dateString
    } else if (typeof dateString === 'string') {
      // If already formatted (contains '/'), return as-is
      if (dateString.includes('/')) return dateString

      // Validate string format before parsing
      const datePart = dateString.split('T')[0]

      // Check for valid YYYY-MM-DD format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return "N/A"
      }

      // Set time to noon (12:00) to prevent timezone shift to previous day
      date = new Date(datePart + 'T12:00:00')
    } else {
      return "N/A"
    }

    // Validate the date is actually valid
    if (!isValid(date) || isNaN(date.getTime())) return "N/A"

    return format(date, "dd/MM/yyyy")
  } catch {
    return "N/A"
  }
}
