/**
 * Business hours calculation utility.
 *
 * @description Provides functions to calculate elapsed business time
 * and add business time to a date, respecting working hours, weekends,
 * and holidays. All calculations use UTC.
 */

export interface BusinessCalendar {
  timezone: string;
  workingHours: { start: number; end: number }; // 0-24 hours (e.g., 9-17)
  holidays: string[]; // ISO date strings (YYYY-MM-DD)
}

const DEFAULT_CALENDAR: BusinessCalendar = {
  timezone: "UTC",
  workingHours: { start: 9, end: 17 },
  holidays: [],
};

/**
 * Check if a given date falls on a working day (not weekend, not holiday).
 */
function isWorkingDay(date: Date, calendar: BusinessCalendar): boolean {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  const dateStr = date.toISOString().split("T")[0]!;
  return !calendar.holidays.includes(dateStr);
}

/**
 * Get working milliseconds in a single day.
 */
function getWorkingMsPerDay(calendar: BusinessCalendar): number {
  const { start, end } = calendar.workingHours;
  return (end - start) * 60 * 60 * 1000;
}

/**
 * Calculate business milliseconds elapsed between two dates.
 *
 * @param start - Start timestamp
 * @param end - End timestamp
 * @param calendar - Business calendar configuration
 * @returns Elapsed business time in milliseconds
 */
export function calculateBusinessMs(
  start: Date,
  end: Date,
  calendar: BusinessCalendar = DEFAULT_CALENDAR,
): number {
  if (end <= start) return 0;

  const { start: workStart, end: workEnd } = calendar.workingHours;
  let totalMs = 0;

  const current = new Date(start);

  while (current < end) {
    if (isWorkingDay(current, calendar)) {
      const dayStart = new Date(current);
      dayStart.setUTCHours(workStart, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setUTCHours(workEnd, 0, 0, 0);

      const effectiveStart = current > dayStart ? current : dayStart;
      const effectiveEnd = end < dayEnd ? end : dayEnd;

      if (effectiveStart < effectiveEnd) {
        totalMs += effectiveEnd.getTime() - effectiveStart.getTime();
      }
    }

    // Move to next day start
    current.setUTCDate(current.getUTCDate() + 1);
    current.setUTCHours(workStart, 0, 0, 0);
  }

  return totalMs;
}

/**
 * Add business milliseconds to a start date.
 *
 * @param start - Start timestamp
 * @param ms - Business milliseconds to add
 * @param calendar - Business calendar configuration
 * @returns Date after adding the business time
 */
export function addBusinessMs(
  start: Date,
  ms: number,
  calendar: BusinessCalendar = DEFAULT_CALENDAR,
): Date {
  if (ms <= 0) return new Date(start);

  const { start: workStart, end: workEnd } = calendar.workingHours;
  let remaining = ms;
  const current = new Date(start);

  // If starting outside business hours, move to next business hour
  const currentHour = current.getUTCHours() + current.getUTCMinutes() / 60;
  if (currentHour < workStart || currentHour >= workEnd || !isWorkingDay(current, calendar)) {
    if (currentHour >= workEnd || !isWorkingDay(current, calendar)) {
      current.setUTCDate(current.getUTCDate() + 1);
    }
    current.setUTCHours(workStart, 0, 0, 0);
    while (!isWorkingDay(current, calendar)) {
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  while (remaining > 0) {
    if (isWorkingDay(current, calendar)) {
      const dayEnd = new Date(current);
      dayEnd.setUTCHours(workEnd, 0, 0, 0);

      const availableMs = dayEnd.getTime() - current.getTime();

      if (remaining <= availableMs) {
        current.setTime(current.getTime() + remaining);
        remaining = 0;
      } else {
        remaining -= availableMs;
        current.setUTCDate(current.getUTCDate() + 1);
        current.setUTCHours(workStart, 0, 0, 0);
      }
    } else {
      current.setUTCDate(current.getUTCDate() + 1);
      current.setUTCHours(workStart, 0, 0, 0);
    }
  }

  return current;
}
