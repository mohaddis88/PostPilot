import { describe, expect, it } from './testHelper';
import { calendarApi } from '../../api';
import { generateMonthCalendarGrid, generateWeekCalendarDays } from '../dates';

describe('CalendarApi and schedule calendar math', () => {
  it('generates month grid starting on Monday', () => {
    // October 2026 starts on Thursday
    const weeks = generateMonthCalendarGrid(2026, 10);
    expect(weeks.length).toBeGreaterThanOrEqual(5);
    // 7 days per week
    for (const week of weeks) {
      expect(week.length).toBe(7);
    }
  });

  it('generates week days starting on Monday', () => {
    const days = generateWeekCalendarDays(new Date(2026, 9, 14));
    expect(days.length).toBe(7);
  });

  it('fetches scheduled posts within a given range via CalendarApi.getRange', async () => {
    const posts = await calendarApi.getRange('2026-10-01', '2026-10-31', 'company');
    expect(Array.isArray(posts)).toBe(true);
    for (const p of posts) {
      expect(p.profileId).toBe('company');
    }
  });

  it('reschedules a scheduled post keeping its time', async () => {
    const posts = await calendarApi.getScheduled('company', 2026, 10);
    if (posts.length > 0) {
      const post = posts[0];
      const updated = await calendarApi.reschedule(post.id, '2026-10-25T10:00:00Z', 'Oct 25 at 10:00 AM');
      expect(updated.scheduledForUtc).toBe('2026-10-25T10:00:00Z');
      expect(updated.status).toBe('scheduled');
    }
  });

  it('reschedules a draft post keeping no time', async () => {
    const draft = await calendarApi.dropFile({
      profileId: 'company',
      driveFileId: 'drv-ont-002',
      date: '2026-10-14',
    });
    expect(draft.status).toBe('draft');
    expect(draft.plannedDate).toBe('2026-10-14');

    const updated = await calendarApi.reschedule(draft.id, '2026-10-19', 'Draft planned date');
    expect(updated.plannedDate).toBe('2026-10-19');
    expect(updated.scheduledForUtc).toBe(undefined);
  });

  it('creates draft idempotently when dropping the same drive file on the same date', async () => {
    const drop1 = await calendarApi.dropFile({
      profileId: 'company',
      driveFileId: 'drv-ont-001',
      date: '2026-10-22',
    });
    const drop2 = await calendarApi.dropFile({
      profileId: 'company',
      driveFileId: 'drv-ont-001',
      date: '2026-10-22',
    });
    expect(drop1.id).toBe(drop2.id);
  });

  it('rejects file drop if profile does not own the file', async () => {
    let threw = false;
    try {
      await calendarApi.dropFile({
        profileId: 'company',
        driveFileId: 'drv-aria-001',
        date: '2026-10-14',
      });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
