/**
 * Helper functions for dispatch record filtering
 */

/**
 * Check if a date string is from today (Vietnam timezone)
 */
export function isToday(dateString: string | undefined): boolean {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  const today = new Date();
  
  // Compare year, month, day
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Filter dispatch records to only include today's entries
 * This allows multiple trips per vehicle in a single day
 */
export function filterTodayRecords<T extends { entryTime: string }>(records: T[]): T[] {
  return records.filter(record => isToday(record.entryTime));
}

/**
 * Get start and end of today for date range filtering
 */
export function getTodayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  
  return { start, end };
}
