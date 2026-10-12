/**
 * Pure date calculations and timezone helpers.
 * All backend timestamps are stored in UTC (ISO-8601).
 * UI displays are formatted using Intl.DateTimeFormat in the user's target timezone (default Asia/Kuala_Lumpur).
 * Zero hardcoded months or manual daylight-saving math.
 */

export const DEFAULT_USER_TIMEZONE = 'Asia/Kuala_Lumpur';

/**
 * Checks whether a given year is a leap year using real calendar math.
 */
export function isLeapYear(year: number): boolean {
  return new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
}

/**
 * Returns number of days in a month (1-indexed month 1..12).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Formats a UTC ISO string into localized human-readable date & time in target timezone.
 */
export function formatInTimezone(
  utcIsoString: string | Date,
  timeZone = DEFAULT_USER_TIMEZONE,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof utcIsoString === 'string' ? new Date(utcIsoString) : utcIsoString;
  if (isNaN(date.getTime())) return '';

  const defaultOpts: Intl.DateTimeFormatOptions = {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };

  return new Intl.DateTimeFormat('en-US', options ?? defaultOpts).format(date);
}

/**
 * Formats a short date: e.g. "Oct 9, 2026"
 */
export function formatShortDate(
  utcIsoString: string | Date,
  timeZone = DEFAULT_USER_TIMEZONE
): string {
  return formatInTimezone(utcIsoString, timeZone, {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats time only: e.g. "03:30 PM"
 */
export function formatTimeOnly(
  utcIsoString: string | Date,
  timeZone = DEFAULT_USER_TIMEZONE
): string {
  return formatInTimezone(utcIsoString, timeZone, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats month and year header: e.g. "October 2026"
 */
export function formatMonthHeader(
  year: number,
  month: number, // 1..12
  timeZone = DEFAULT_USER_TIMEZONE
): string {
  const d = new Date(Date.UTC(year, month - 1, 15));
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Converts a date input string ('YYYY-MM-DD') and time ('HH:MM') selected in user's timezone into UTC ISO string.
 */
export function combineDateTimeToUtc(
  dateStr: string, // YYYY-MM-DD
  timeStr: string, // HH:MM (24-hour)
  timeZone = DEFAULT_USER_TIMEZONE
): string {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const [hourStr, minuteStr] = timeStr.split(':');

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr || '0', 10);
  const minute = parseInt(minuteStr || '0', 10);

  // Determine timezone offset dynamically using Intl
  const testUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(testUtc);

  const getPart = (type: string) => {
    const p = parts.find((pt) => pt.type === type);
    return p ? parseInt(p.value, 10) : 0;
  };

  const tzYear = getPart('year');
  const tzMonth = getPart('month');
  const tzDay = getPart('day');
  let tzHour = getPart('hour');
  if (tzHour === 24) tzHour = 0;
  const tzMinute = getPart('minute');

  const tzDateAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute);
  const offsetMs = tzDateAsUtc - testUtc.getTime();

  // The local wall-clock target time in ms:
  const localTargetMs = Date.UTC(year, month - 1, day, hour, minute);
  const trueUtcDate = new Date(localTargetMs - offsetMs);

  return trueUtcDate.toISOString();
}

/**
 * Human-friendly relative time label (e.g. "just now", "15m ago", "2h ago", "yesterday", "in 3 days").
 */
export function formatRelativeTime(
  utcIsoString: string | Date,
  referenceNow: Date = new Date()
): string {
  const target = typeof utcIsoString === 'string' ? new Date(utcIsoString) : utcIsoString;
  const diffMs = target.getTime() - referenceNow.getTime();
  const absDiffSec = Math.floor(Math.abs(diffMs) / 1000);
  const isPast = diffMs < 0;

  if (absDiffSec < 60) {
    return 'just now';
  }

  const minutes = Math.floor(absDiffSec / 60);
  if (minutes < 60) {
    return isPast ? `${minutes}m ago` : `in ${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return isPast ? `${hours}h ago` : `in ${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return isPast ? `${days}d ago` : `in ${days}d`;
  }

  const months = Math.floor(days / 30);
  return isPast ? `${months}mo ago` : `in ${months}mo`;
}

/**
 * Calendar grid generator cell definition.
 */
export interface CalendarCell {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatDateYmd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calendar grid generator for Month view starting on Monday.
 * Week starts Monday (Mon=0 .. Sun=6).
 */
export function generateMonthCalendarGrid(
  year: number,
  month: number, // 1..12
  timeZone = DEFAULT_USER_TIMEZONE
): CalendarCell[][] {
  const daysInMonth = getDaysInMonth(year, month);
  
  // First day of target month (0 = Sun, 1 = Mon, ... 6 = Sat)
  const firstDaySundayBased = new Date(year, month - 1, 1).getDay();
  // Monday-based offset: 0 = Mon, 1 = Tue, ..., 6 = Sun
  const firstDayMondayBased = (firstDaySundayBased + 6) % 7;

  const now = new Date();
  const todayStr = formatDateYmd(now);

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const cells: CalendarCell[] = [];

  // Previous month padding
  for (let i = firstDayMondayBased - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = (firstDayMondayBased - 1 - i + 7) % 7; // Monday-based index
    cells.push({
      date: dateStr,
      dayNumber: day,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = (firstDayMondayBased + (d - 1)) % 7;
    cells.push({
      date: dateStr,
      dayNumber: d,
      month,
      year,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
    });
  }

  // Next month padding to fill out multiple of 7 (35 or 42 cells)
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = (cells.length) % 7;
    cells.push({
      date: dateStr,
      dayNumber: d,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
    });
  }

  // Chunk into 7-day rows
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return weeks;
}

/**
 * Calendar grid generator for Week view starting on Monday.
 * Given any reference Date, returns the 7 days of that week (Mon..Sun).
 */
export function generateWeekCalendarDays(referenceDate: Date): CalendarCell[] {
  const current = new Date(referenceDate);
  const daySundayBased = current.getDay();
  const dayMondayBased = (daySundayBased + 6) % 7; // 0 = Mon, 6 = Sun

  // Start on Monday
  const monday = new Date(current);
  monday.setDate(current.getDate() - dayMondayBased);

  const todayStr = formatDateYmd(new Date());
  const days: CalendarCell[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = formatDateYmd(d);
    days.push({
      date: dateStr,
      dayNumber: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: i === 5 || i === 6,
    });
  }

  return days;
}

/**
 * Checks if two dates fall on the same day in target timezone.
 */
export function isSameDayInTimezone(
  utcIsoA: string | Date,
  utcIsoB: string | Date,
  timeZone = DEFAULT_USER_TIMEZONE
): boolean {
  const dateA = typeof utcIsoA === 'string' ? new Date(utcIsoA) : utcIsoA;
  const dateB = typeof utcIsoB === 'string' ? new Date(utcIsoB) : utcIsoB;
  if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return false;

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);

  return fmt(dateA) === fmt(dateB);
}
