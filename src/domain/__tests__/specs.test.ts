import { describe, expect, it } from './testHelper';
import { PLATFORM_SPECS, PLATFORM_COLORS } from '../specs';

describe('platform specifications and color tokens', () => {
  it('defines valid specs for all 4 platforms', () => {
    expect(PLATFORM_SPECS.linkedin).toBeDefined();
    expect(PLATFORM_SPECS.instagram).toBeDefined();
    expect(PLATFORM_SPECS.facebook).toBeDefined();
    expect(PLATFORM_SPECS.tiktok).toBeDefined();
  });

  it('checks LinkedIn specs: post ratio and duration limits, story unsupported', () => {
    const li = PLATFORM_SPECS.linkedin;
    expect(li.story.supported).toBe(false);
    expect(li.post.image?.ratio.min).toBe(1.0);
    expect(li.post.image?.ratio.max).toBe(1.91);
    expect(li.post.video?.ratio.min).toBeCloseTo(1 / 2.4, 4);
    expect(li.post.video?.ratio.max).toBe(2.4);
    expect(li.post.video?.durationMs?.minMs).toBe(3000);
    expect(li.post.video?.durationMs?.maxMs).toBe(600000);
  });

  it('checks Instagram specs: post and story limits', () => {
    const ig = PLATFORM_SPECS.instagram;
    expect(ig.story.supported).toBe(true);
    expect(ig.story.ratio).toBe(9 / 16);
    expect(ig.story.maxVideoDurationMs).toBe(60000);
    expect(ig.story.photoDurationMs).toBe(7000);
    expect(ig.story.maxPartsPerDay).toBe(100);
    expect(ig.story.maxSizeBytesPerPart).toBe(250 * 1024 * 1024);

    expect(ig.post.image?.maxSizeBytes).toBe(30 * 1024 * 1024);
    expect(ig.post.video?.durationMs?.maxMs).toBe(900000);
  });

  it('checks Facebook specs: 9:16 to 16:9 post ratios and 60s story limit', () => {
    const fb = PLATFORM_SPECS.facebook;
    expect(fb.story.supported).toBe(true);
    expect(fb.story.maxVideoDurationMs).toBe(60000);
    expect(fb.post.video?.ratio.min).toBe(9 / 16);
    expect(fb.post.video?.ratio.max).toBe(16 / 9);
  });

  it('checks TikTok specs: 9:16 recommended, JPG only, story unsupported', () => {
    const tt = PLATFORM_SPECS.tiktok;
    expect(tt.story.supported).toBe(false);
    expect(tt.post.image?.allowedMimes).toContain('image/jpeg');
    expect(tt.post.video?.durationMs?.maxMs).toBe(600000);
  });

  it('verifies platform brand color hex codes', () => {
    expect(PLATFORM_COLORS.linkedin).toBe('#0A66C2');
    expect(PLATFORM_COLORS.facebook).toBe('#1877F2');
    expect(PLATFORM_COLORS.instagram).toBe('#E1306C');
    expect(PLATFORM_COLORS.tiktok).toBe('#FE2C55');
  });
});
