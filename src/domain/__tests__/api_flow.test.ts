import { describe, expect, it } from './testHelper';
import { api, validateMedia, createVariant, previewStoryPlan, savePost, schedulePost } from '../../api';
import { validateStoryCutPoints } from '../story';

describe('API methods and Story Cut Points validation', () => {
  it('validates media through API layer', async () => {
    const result = await api.validateMedia(
      {
        id: 'test-1',
        kind: 'video',
        width: 1080,
        height: 1920,
        durationMs: 45000,
        sizeBytes: 12000000,
        mime: 'video/mp4',
      },
      'instagram',
      'post'
    );

    expect(result.passed).toBe(true);
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it('creates variants through API layer', async () => {
    const variant = await api.createVariant({
      assetId: 'asset-1',
      platform: 'tiktok',
      aspect: '9:16',
      fit: 'blur_fill',
      crop: { cx: 0.5, cy: 0.5, zoom: 1.0 },
    });

    expect(variant.id).toBeDefined();
    expect(variant.fit).toBe('blur_fill');
    expect(variant.platform).toBe('tiktok');
  });

  it('previews story plans with cap enforcement', async () => {
    const plan = await api.previewStoryPlan(90000, 60000, 30000);
    expect(plan.blocked).toBe(false);
    expect(plan.parts.length).toBe(3);

    // Over 100 parts test
    const cappedPlan = await api.previewStoryPlan(3600000, 30000, 30000); // 3600s / 30s = 120 parts > 100
    expect(cappedPlan.blocked).toBe(true);
    expect(cappedPlan.blockReason).toContain('100');
  });

  it('saves and schedules posts through API layer', async () => {
    const saved = await api.savePost({
      profileId: 'company',
      title: 'Automated Test Draft',
      caption: 'Draft caption',
      platforms: ['linkedin', 'instagram'],
    });

    expect(saved.id).toBeDefined();
    expect(saved.status).toBe('draft');

    const scheduled = await api.schedulePost({
      id: saved.id,
      profileId: 'company',
      title: 'Automated Test Scheduled',
      caption: 'Scheduled caption',
      platforms: ['linkedin'],
      plannedDate: 'Tomorrow at 15:00',
    });

    expect(scheduled.id).toBe(saved.id);
    expect(scheduled.status).toBe('scheduled');
  });

  it('validates manual story cut points correctly', () => {
    // 90s video cut at 30s and 60s
    const valid = validateStoryCutPoints([30000, 60000], 90000, 60000, 1000);
    expect(valid.valid).toBe(true);
    expect(valid.parts.length).toBe(3);

    // Too short chunk (< 1s)
    const tooShort = validateStoryCutPoints([500], 90000, 60000, 1000);
    expect(tooShort.valid).toBe(false);
    expect(tooShort.error).toContain('too short');

    // Too long chunk (> 60s)
    const tooLong = validateStoryCutPoints([75000], 90000, 60000, 1000);
    expect(tooLong.valid).toBe(false);
    expect(tooLong.error).toContain('exceeds max limit');
  });
});
