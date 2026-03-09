/**
 * Vietnam Timezone Utilities
 *
 * The backend stores timestamps in UTC (with "Z" suffix).
 * These utilities convert UTC to Vietnam time (UTC+7) for display.
 */

/** Vietnam timezone offset in hours (UTC+7) */
const VIETNAM_OFFSET_HOURS = 7;

/**
 * Format a stored ISO timestamp (UTC) to Vietnam time for display
 * @param isoString - ISO string from database (e.g., "2024-12-25T16:54:00.000Z" UTC)
 * @param formatStr - Format pattern: "HH:mm", "dd/MM/yyyy", "dd/MM/yyyy HH:mm", "HH:mm dd/MM/yyyy", "HH:mm dd/MM", "yyyy-MM-dd"
 * @returns Formatted string in Vietnam time (UTC+7)
 */
export function formatVietnamTime(isoString: string | null | undefined, formatStr: string = "HH:mm"): string {
  if (!isoString) return "-";

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "-";

    // Convert UTC to Vietnam time by adding 7 hours
    const vietnamTimeMs = date.getTime() + VIETNAM_OFFSET_HOURS * 60 * 60 * 1000;
    const vnDate = new Date(vietnamTimeMs);

    // Extract Vietnam time components using UTC methods (since we already added offset)
    const year = vnDate.getUTCFullYear();
    const month = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vnDate.getUTCDate()).padStart(2, '0');
    const hours = String(vnDate.getUTCHours()).padStart(2, '0');
    const minutes = String(vnDate.getUTCMinutes()).padStart(2, '0');

    // Handle common format patterns
    switch (formatStr) {
      case "HH:mm":
        return `${hours}:${minutes}`;
      case "dd/MM/yyyy":
        return `${day}/${month}/${year}`;
      case "dd/MM/yyyy HH:mm":
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      case "HH:mm dd/MM/yyyy":
        return `${hours}:${minutes} ${day}/${month}/${year}`;
      case "HH:mm dd/MM":
        return `${hours}:${minutes} ${day}/${month}`;
      case "yyyy-MM-dd":
        return `${year}-${month}-${day}`;
      default:
        // Fallback: replace format tokens
        return formatStr
          .replace("yyyy", String(year))
          .replace("MM", month)
          .replace("dd", day)
          .replace("HH", hours)
          .replace("mm", minutes);
    }
  } catch {
    return "-";
  }
}
