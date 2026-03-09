/**
 * Vietnam Timezone Utility Module
 * 
 * Centralized module for handling Vietnam timezone (UTC+7) conversions.
 * This module provides clean, type-safe utilities for:
 * - Parsing user input in Vietnam time format
 * - Formatting dates for display in Vietnam time
 * - Converting between UTC (database) and Vietnam time
 * 
 * @module vietnam-time
 */

import { format } from "date-fns"

/**
 * Vietnam timezone offset in hours (UTC+7)
 */
export const VIETNAM_TIMEZONE_OFFSET_HOURS = 7

/**
 * Vietnam timezone identifier
 */
export const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh"

/**
 * Default date format used throughout the application
 */
export const DEFAULT_DATE_FORMAT = "HH:mm dd/MM/yyyy"

/**
 * Parse a date string in "HH:mm dd/MM/yyyy" format and convert to ISO string.
 * Treats the input as Vietnam time (UTC+7) and stores it as UTC+7 in database.
 * 
 * @param dateTimeString - Date string in format "HH:mm dd/MM/yyyy"
 * @returns ISO string with UTC+7 offset for database storage
 * 
 * @example
 * parseVietnamDateTime("14:30 25/12/2024")
 * // Returns: "2024-12-25T14:30:00+07:00" (Vietnam time stored as UTC+7)
 */
export function parseVietnamDateTime(dateTimeString: string): string {
  try {
    const parts = dateTimeString.trim().split(" ")
    if (parts.length < 2) {
      throw new Error("Invalid date format")
    }

    const timePart = parts[0]
    const datePart = parts.slice(1).join(" ")
    
    const [hours, minutes] = timePart.split(":").map(Number)
    const [day, month, year] = datePart.split("/").map(Number)

    if (
      isNaN(hours) || isNaN(minutes) ||
      isNaN(day) || isNaN(month) || isNaN(year) ||
      hours < 0 || hours >= 24 ||
      minutes < 0 || minutes >= 60 ||
      day < 1 || day > 31 ||
      month < 1 || month > 12 ||
      year < 1900
    ) {
      throw new Error("Invalid date/time values")
    }

    // Create ISO string with Vietnam timezone offset (+07:00)
    // This will be stored as-is in database, representing Vietnam time
    const isoString = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00+07:00`
    
    // Verify it's a valid date
    const dateObj = new Date(isoString)
    if (isNaN(dateObj.getTime())) {
      throw new Error("Invalid date")
    }

    // Return ISO string with +07:00 offset (representing Vietnam time)
    return isoString
  } catch (error) {
    console.error("Error parsing Vietnam date time:", error, dateTimeString)
    throw new Error(`Failed to parse date: ${dateTimeString}`)
  }
}

/**
 * Format date string from database for display.
 * Database stores time as UTC+7, so we format it directly.
 * 
 * @param dateString - ISO date string from database (can be with or without timezone)
 * @param formatString - Format string (default: "HH:mm dd/MM/yyyy")
 * @returns Formatted date string in Vietnam time, or "-" if invalid
 * 
 * @example
 * formatVietnamDateTime("2024-12-25T14:30:00+07:00")
 * // Returns: "14:30 25/12/2024"
 */
export function formatVietnamDateTime(
  dateString: string | undefined | null,
  formatString: string = DEFAULT_DATE_FORMAT
): string {
  if (!dateString) return "-"

  try {
    // IMPORTANT: Check for UTC format FIRST (ends with 'Z')
    // Database stores time in UTC, so we need to convert to Vietnam time (UTC+7)
    if (dateString.endsWith('Z')) {
      const utcDate = new Date(dateString)
      if (!isNaN(utcDate.getTime())) {
        // Add 7 hours to convert UTC to Vietnam time
        const vnTimeMs = utcDate.getTime() + VIETNAM_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000
        const tempDate = new Date(vnTimeMs)
        // Create new date with the Vietnam time values
        const vnDate = new Date(
          tempDate.getUTCFullYear(),
          tempDate.getUTCMonth(),
          tempDate.getUTCDate(),
          tempDate.getUTCHours(),
          tempDate.getUTCMinutes(),
          tempDate.getUTCSeconds()
        )
        return format(vnDate, formatString)
      }
    }

    // For dates with +07:00 offset, extract components directly
    // These are already in Vietnam time, just need to format
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)

    if (match) {
      const [, year, month, day, hours, minutes, seconds] = match
      // Create date with extracted values (treating them as Vietnam time)
      const vnDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      )

      if (!isNaN(vnDate.getTime())) {
        return format(vnDate, formatString)
      }
    }

    // Last fallback: try parsing directly
    const dateObj = new Date(dateString)
    if (!isNaN(dateObj.getTime())) {
      return format(dateObj, formatString)
    }

    console.warn("Could not parse date string:", dateString)
    return "-"
  } catch (error) {
    console.error("Error formatting Vietnam date time:", error, dateString)
    return "-"
  }
}

/**
 * Get current time in Vietnam timezone as ISO string with +07:00 offset
 * 
 * @returns ISO string with +07:00 offset representing current Vietnam time
 */
export function getCurrentVietnamTime(): string {
  const now = new Date()
  // Add 7 hours to get Vietnam time
  const vietnamTimeMs = now.getTime() + VIETNAM_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000
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

/**
 * Get current time in Vietnam timezone formatted for display
 * 
 * @param formatString - Format string (default: "HH:mm dd/MM/yyyy")
 * @returns Formatted current time in Vietnam timezone
 */
export function getCurrentVietnamTimeFormatted(formatString: string = DEFAULT_DATE_FORMAT): string {
  return formatVietnamDateTime(getCurrentVietnamTime(), formatString)
}

/**
 * Convert a Date object to Vietnam timezone ISO string
 * 
 * @param date - Date object
 * @returns ISO string in UTC
 */
export function toVietnamISO(date: Date): string {
  return date.toISOString()
}

/**
 * Type guard to check if a string is a valid ISO date string
 */
export function isValidISODateString(dateString: string): boolean {
  try {
    const date = new Date(dateString)
    return !isNaN(date.getTime()) && dateString.includes('T')
  } catch {
    return false
  }
}

/**
 * Parse database time string to Date object for form editing.
 * Database stores time in UTC format (ends with Z).
 * This function converts UTC to Vietnam time (UTC+7) for correct display in forms.
 *
 * @param dateString - ISO date string from database (UTC format with Z suffix)
 * @returns Date object representing the correct Vietnam time for form input
 *
 * @example
 * parseDatabaseTimeForEdit("2024-12-29T08:22:00.000Z")
 * // Returns: Date object showing 15:22 (Vietnam time = UTC + 7 hours)
 */
export function parseDatabaseTimeForEdit(dateString: string | undefined | null): Date {
  if (!dateString) return new Date()

  try {
    // Parse the ISO string
    const utcDate = new Date(dateString)

    if (isNaN(utcDate.getTime())) {
      console.error("Invalid date string:", dateString)
      return new Date()
    }

    // If the date is in UTC format (ends with Z), convert to Vietnam time
    if (dateString.endsWith('Z')) {
      // Add 7 hours to convert UTC to Vietnam time
      const vietnamTimeMs = utcDate.getTime() + VIETNAM_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000
      const vietnamDate = new Date(vietnamTimeMs)

      // Create a local Date with Vietnam time values
      // This ensures the form displays the correct Vietnam time
      return new Date(
        vietnamDate.getUTCFullYear(),
        vietnamDate.getUTCMonth(),
        vietnamDate.getUTCDate(),
        vietnamDate.getUTCHours(),
        vietnamDate.getUTCMinutes(),
        vietnamDate.getUTCSeconds()
      )
    }

    // For dates with +07:00 offset, extract components directly
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
    if (match) {
      const [, year, month, day, hours, minutes, seconds] = match
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      )
    }

    // Fallback: return current time
    return new Date()
  } catch (error) {
    console.error("Error parsing database time for edit:", error, dateString)
    return new Date()
  }
}

/**
 * Parse database time string for filtering/comparison purposes.
 * Returns null if the date is invalid (instead of falling back to current date).
 *
 * @param dateString - ISO date string from database
 * @returns Date object or null if invalid
 */
export function parseDatabaseTimeForFilter(dateString: string | undefined | null): Date | null {
  if (!dateString) return null

  try {
    const utcDate = new Date(dateString)
    if (isNaN(utcDate.getTime())) return null

    // If the date is in UTC format (ends with Z), convert to Vietnam time
    if (dateString.endsWith('Z')) {
      const vietnamTimeMs = utcDate.getTime() + VIETNAM_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000
      const vietnamDate = new Date(vietnamTimeMs)
      return new Date(
        vietnamDate.getUTCFullYear(),
        vietnamDate.getUTCMonth(),
        vietnamDate.getUTCDate(),
        vietnamDate.getUTCHours(),
        vietnamDate.getUTCMinutes(),
        vietnamDate.getUTCSeconds()
      )
    }

    // For dates with +07:00 offset, extract components directly
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
    if (match) {
      const [, year, month, day, hours, minutes, seconds] = match
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      )
    }

    return null
  } catch {
    return null
  }
}

