import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export Vietnam time utilities for convenience
export {
  parseVietnamDateTime,
  formatVietnamDateTime,
  getCurrentVietnamTime,
  getCurrentVietnamTimeFormatted,
  toVietnamISO,
  isValidISODateString,
  DEFAULT_DATE_FORMAT,
  VIETNAM_TIMEZONE,
  VIETNAM_TIMEZONE_OFFSET_HOURS,
} from "./vietnam-time"

