/**
 * Timezone utilities for Vietnam (UTC+7)
 * 
 * This module handles timezone conversions to ensure dates are stored
 * and retrieved correctly in Vietnam timezone.
 */

const VIETNAM_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000 // 7 hours in milliseconds

/**
 * Convert UTC ISO string to Vietnam timezone and return as ISO string
 * This ensures the timestamp represents Vietnam time when stored in database
 * 
 * @param utcISOString - UTC ISO date string (e.g., "2024-12-25T07:30:00.000Z")
 * @returns ISO string representing Vietnam time (UTC+7)
 * 
 * @example
 * convertUTCToVietnam("2024-12-25T07:30:00.000Z")
 * // Returns: "2024-12-25T14:30:00.000Z" (VN time represented in UTC)
 */
export function convertUTCToVietnam(utcISOString: string): string {
  const utcDate = new Date(utcISOString)
  
  if (isNaN(utcDate.getTime())) {
    throw new Error(`Invalid UTC date string: ${utcISOString}`)
  }
  
  // Add 7 hours to get Vietnam time
  const vietnamTime = new Date(utcDate.getTime() + VIETNAM_TIMEZONE_OFFSET_MS)
  
  return vietnamTime.toISOString()
}

/**
 * Convert Vietnam time ISO string back to UTC ISO string
 * 
 * @param vietnamISOString - ISO date string representing Vietnam time
 * @returns UTC ISO date string
 * 
 * @example
 * convertVietnamToUTC("2024-12-25T14:30:00.000Z")
 * // Returns: "2024-12-25T07:30:00.000Z" (UTC)
 */
export function convertVietnamToUTC(vietnamISOString: string): string {
  const vietnamDate = new Date(vietnamISOString)
  
  if (isNaN(vietnamDate.getTime())) {
    throw new Error(`Invalid date string: ${vietnamISOString}`)
  }
  
  // Subtract 7 hours to get UTC
  const utcTime = new Date(vietnamDate.getTime() - VIETNAM_TIMEZONE_OFFSET_MS)
  
  return utcTime.toISOString()
}

/**
 * Convert time ISO string to UTC ISO string for database storage.
 * Handles both formats:
 * - UTC format (ends with Z): "2024-12-25T07:30:00.000Z" → already UTC, just return as-is
 * - Vietnam format (+07:00): "2024-12-25T14:30:00+07:00" → preserve VN time as fake UTC
 *
 * IMPORTANT: This function now auto-detects the input format:
 * - If input ends with 'Z' (UTC): The time is already in UTC, return as-is
 * - If input has +07:00 offset: Convert to preserve Vietnam time value
 *
 * @param isoString - ISO string (either UTC or with +07:00 offset)
 * @returns UTC ISO string for database storage
 *
 * @example
 * // Frontend sends UTC (from .toISOString())
 * convertVietnamISOToUTCForStorage("2024-12-25T05:30:00.000Z")
 * // Returns: "2024-12-25T05:30:00.000Z" (unchanged - already UTC)
 *
 * @example
 * // Frontend sends Vietnam time with offset
 * convertVietnamISOToUTCForStorage("2024-12-25T12:30:00+07:00")
 * // Returns: "2024-12-25T12:30:00.000Z" (VN time preserved as fake UTC)
 */
export function convertVietnamISOToUTCForStorage(isoString: string): string {
  // Check if input is already in UTC format (ends with Z)
  if (isoString.endsWith('Z')) {
    // Already UTC - return as-is, no conversion needed
    return isoString
  }

  // Check if input has Vietnam timezone offset (+07:00)
  if (isoString.includes('+07:00') || isoString.includes('+07')) {
    // Parse the Vietnam time string
    const date = new Date(isoString)

    // When we parse "2024-12-25T14:30:00+07:00", JavaScript converts to UTC
    // So we need to add 7 hours back to preserve the Vietnam time value as fake UTC
    const vietnamTimeMs = date.getTime() + VIETNAM_TIMEZONE_OFFSET_MS
    const preservedDate = new Date(vietnamTimeMs)

    // Return as UTC ISO string (this represents Vietnam time stored as UTC+7)
    return preservedDate.toISOString()
  }

  // Fallback: treat as local time and convert
  const date = new Date(isoString)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${isoString}`)
  }
  return date.toISOString()
}

/**
 * Get current time in Vietnam timezone as ISO string with +07:00 offset
 * 
 * @returns ISO string with +07:00 offset representing current Vietnam time
 * 
 * @example
 * getCurrentVietnamTime()
 * // Returns: "2024-12-25T14:30:00+07:00" (current Vietnam time)
 */
export function getCurrentVietnamTime(): string {
  const now = new Date()
  // Get current UTC time and add 7 hours
  const vietnamTimeMs = now.getTime() + VIETNAM_TIMEZONE_OFFSET_MS
  const vietnamDate = new Date(vietnamTimeMs)
  
  // Format as ISO string with +07:00 offset
  const year = vietnamDate.getUTCFullYear()
  const month = String(vietnamDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(vietnamDate.getUTCDate()).padStart(2, '0')
  const hours = String(vietnamDate.getUTCHours()).padStart(2, '0')
  const minutes = String(vietnamDate.getUTCMinutes()).padStart(2, '0')
  const seconds = String(vietnamDate.getUTCSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`
}

