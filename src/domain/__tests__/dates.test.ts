import { describe, expect, it } from './testHelper';
import {
  combineDateTimeToUtc,
  formatInTimezone,
  formatRelativeTime,
  getDaysInMonth,
  isLeapYear,
} from '../dates';
import dateVectors from './vectors/date_vectors.json';

describe('dates domain logic', () => {
  it('correctly calculates leap years using pure calendar math', () => {
    const leapVector = dateVectors[0].leapYears!;
    for (const item of leapVector) {
      expect(isLeapYear(item.year)).toBe(item.expected);
    }
  });

  it('correctly gets days in month across leap and non-leap years', () => {
    const daysVector = dateVectors[1].daysInMonth!;
    for (const item of daysVector) {
      expect(getDaysInMonth(item.year, item.month)).toBe(item.expected);
    }
  });

  it('converts local wall-clock time in Asia/Kuala_Lumpur to UTC ISO string', () => {
    const tzVector = dateVectors[2].timezoneConversions!;
    for (const item of tzVector) {
      const utc = combineDateTimeToUtc(item.dateStr, item.timeStr, item.timeZone);
      expect(utc).toBe(item.expectedUtc);
    }
  });

  it('formats dates in target timezone', () => {
    const utcString = '2026-10-10T07:00:00.000Z';
    const formatted = formatInTimezone(utcString, 'Asia/Kuala_Lumpur');
    expect(formatted).toContain('Oct 10, 2026');
    expect(formatted).toContain('03:00 PM');
  });

  it('computes relative time', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    const past10m = new Date('2026-10-10T11:50:00Z');
    const past2h = new Date('2026-10-10T10:00:00Z');

    expect(formatRelativeTime(past10m, now)).toBe('10m ago');
    expect(formatRelativeTime(past2h, now)).toBe('2h ago');
  });
});
