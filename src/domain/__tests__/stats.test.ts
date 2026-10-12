import { describe, expect, it } from './testHelper';
import {
  aggregateChartData,
  computeCtaPerformance,
  computeDateWindow,
  computePlatformBreakdown,
  computePlatformSummaryCards,
  computePostMetricsSummary,
  computeTrend,
  filterPostsForStats,
  generateTimeBuckets,
  getPostMetricValue,
} from '../stats';
import { PostItem } from '../types';

describe('stats domain logic', () => {
  const samplePosts: PostItem[] = [
    {
      id: 'p1',
      profileId: 'company',
      title: 'Post 1',
      caption: '',
      videoUrl: '',
      videoDuration: '',
      videoAspect: '16:9',
      thumbnailUrl: '',
      platforms: ['linkedin', 'instagram'],
      status: 'published',
      publishedAt: '2026-10-01T00:00:00Z',
      createdAt: '2026-10-01T00:00:00Z',
      author: 'Author',
      cta: 'link',
      ctaClicks: 50,
      metrics: {
        views: 1000,
        impressions: 2000,
        engagementRate: 4.5,
        clicks: 50,
        shares: 10,
        comments: 5,
      },
      platformMetrics: {
        linkedin: {
          impressions: 2000,
          reactions: 90,
          comments: 5,
          shares: 10,
          clicks: 50,
          clickRate: 2.5,
          ctaClicks: 50,
        },
      },
    },
    {
      id: 'p2',
      profileId: 'company',
      title: 'Post 2',
      caption: '',
      videoUrl: '',
      videoDuration: '',
      videoAspect: '9:16',
      thumbnailUrl: '',
      platforms: ['tiktok'],
      status: 'published',
      publishedAt: '2026-10-02T00:00:00Z',
      createdAt: '2026-10-02T00:00:00Z',
      author: 'Author',
      cta: 'link',
      ctaClicks: 120,
      metrics: {
        views: 3000,
        impressions: 5000,
        engagementRate: 6.5,
        clicks: 120,
        shares: 40,
        comments: 15,
      },
      platformMetrics: {
        tiktok: {
          views: 3000,
          likes: 250,
          comments: 15,
          shares: 40,
          avgWatchTime: 18.5,
          ctaClicks: 120,
        },
      },
    },
    {
      id: 'p3',
      profileId: 'company',
      title: 'Post 3 (Failed)',
      caption: '',
      videoUrl: '',
      videoDuration: '',
      videoAspect: '16:9',
      thumbnailUrl: '',
      platforms: ['facebook'],
      status: 'failed',
      createdAt: '2026-10-03T00:00:00Z',
      author: 'Author',
    },
    {
      id: 'p4',
      profileId: 'company',
      type: 'story',
      title: 'Story Post 4',
      caption: '',
      videoUrl: '',
      videoDuration: '0:45',
      videoAspect: '9:16',
      thumbnailUrl: '',
      platforms: ['instagram'],
      status: 'published',
      publishedAt: '2026-10-05T00:00:00Z',
      createdAt: '2026-10-05T00:00:00Z',
      author: 'Author',
      cta: 'link',
      ctaClicks: 100,
      storyParts: [
        { index: 1, startMs: 0, endMs: 15000 },
        { index: 2, startMs: 15000, endMs: 30000 },
        { index: 3, startMs: 30000, endMs: 45000 },
      ],
      storyPartMetrics: [
        { partIndex: 1, views: 500, reach: 400, likes: 30, ctaClicks: 35 },
        { partIndex: 2, views: 400, reach: 350, likes: 25, ctaClicks: 35 },
        { partIndex: 3, views: 300, reach: 250, likes: 20, ctaClicks: 30 },
      ],
      platformMetrics: {
        instagram: {
          reach: 400,
          views: 1200,
          likes: 75,
          comments: 8,
          saves: 15,
          shares: 20,
          profileVisits: 35,
          ctaClicks: 100,
        },
      },
    },
    {
      id: 'p5-imported',
      profileId: 'company',
      title: 'Imported Post',
      caption: '',
      videoUrl: '',
      videoDuration: '',
      videoAspect: '16:9',
      thumbnailUrl: '',
      platforms: ['linkedin'],
      status: 'published',
      publishedAt: '2026-08-05T00:00:00Z',
      createdAt: '2026-08-05T00:00:00Z',
      author: 'Author',
      isImported: true,
      cta: 'sign up',
      ctaClicks: 45,
      metrics: {
        views: 800,
        impressions: 1100,
        engagementRate: 3.5,
        clicks: 45,
        shares: 5,
        comments: 2,
      },
    },
  ];

  it('computes correct metrics summary', () => {
    const summary = computePostMetricsSummary(samplePosts);
    expect(summary.totalViews).toBe(4800);
    expect(summary.totalImpressions).toBe(8100);
    expect(summary.publishedCount).toBe(4);
    expect(summary.failedCount).toBe(1);
    expect(summary.totalClicks).toBe(215);
  });

  it('computes platform breakdown correctly', () => {
    const breakdown = computePlatformBreakdown(samplePosts);
    const linkedin = breakdown.find((b) => b.platform === 'linkedin');
    expect(linkedin?.postsCount).toBe(2);
    expect(linkedin?.estimatedViews).toBe(1800);

    const tiktok = breakdown.find((b) => b.platform === 'tiktok');
    expect(tiktok?.postsCount).toBe(1);
    expect(tiktok?.estimatedViews).toBe(3000);

    const facebook = breakdown.find((b) => b.platform === 'facebook');
    expect(facebook?.failedCount).toBe(1);
  });

  it('computes percentage trends', () => {
    const up = computeTrend(120, 100);
    expect(up.direction).toBe('up');
    expect(up.changePercent).toBe(20);

    const down = computeTrend(80, 100);
    expect(down.direction).toBe('down');
    expect(down.changePercent).toBe(20);

    const neutral = computeTrend(100, 100);
    expect(neutral.direction).toBe('neutral');
    expect(neutral.changePercent).toBe(0);

    const zeroPrev = computeTrend(50, 0);
    expect(zeroPrev.direction).toBe('up');
    expect(zeroPrev.changePercent).toBe(100);
  });

  describe('Window and Clamp Logic', () => {
    const refNow = new Date('2026-08-20T00:00:00Z');
    const trackedSince = '2026-08-12T00:00:00Z'; // Connected on 12 Aug

    it('clamps 30d window to trackedSince when nominal start is before trackedSince', () => {
      // 30 days before Aug 20 is ~July 21, which is before Aug 12
      const window = computeDateWindow('30d', trackedSince, refNow);
      expect(window.clamped).toBe(true);
      expect(window.clampedDateString).toBe('Data starts 12 Aug');
      expect(window.windowStart.toISOString()).toBe('2026-08-12T00:00:00.000Z');
      expect(window.windowEnd.toISOString()).toBe('2026-08-20T00:00:00.000Z');
    });

    it('does not clamp 7d window when nominal start is after trackedSince', () => {
      // 7 days before Aug 20 is Aug 13, which is after Aug 12
      const window = computeDateWindow('7d', trackedSince, refNow);
      expect(window.clamped).toBe(false);
      expect(window.clampedDateString).toBe(undefined);
      expect(window.windowStart.toISOString()).toBe('2026-08-13T00:00:00.000Z');
    });

    it('handles all time window as starting at trackedSince without clamp flag', () => {
      const window = computeDateWindow('all', trackedSince, refNow);
      expect(window.clamped).toBe(false);
      expect(window.windowStart.toISOString()).toBe('2026-08-12T00:00:00.000Z');
      expect(window.trackedSinceDateString).toBe('Tracking since 12 Aug 2026');
    });

    it('calculates previous period of the exact same effective duration', () => {
      const window = computeDateWindow('7d', trackedSince, refNow);
      const currentDuration = window.windowEnd.getTime() - window.windowStart.getTime();
      const prevDuration =
        window.previousWindowEnd.getTime() - window.previousWindowStart.getTime();
      expect(prevDuration).toBe(currentDuration);
      expect(window.previousWindowEnd.getTime()).toBe(window.windowStart.getTime());
    });
  });

  describe('Aggregation by Day, Week, Month', () => {
    const trackedSince = '2026-08-01T00:00:00Z';
    const refNow = new Date('2026-10-10T00:00:00Z');

    it('aggregates by day for 7d range', () => {
      const window = computeDateWindow('7d', trackedSince, refNow);
      const bucketsInfo = generateTimeBuckets(window);
      expect(bucketsInfo.granularity).toBe('day');
      expect(bucketsInfo.buckets.length).toBe(7);
    });

    it('aggregates by week for 30d and 90d ranges', () => {
      const window30 = computeDateWindow('30d', trackedSince, refNow);
      const buckets30 = generateTimeBuckets(window30);
      expect(buckets30.granularity).toBe('week');
      expect(buckets30.buckets.length).toBeGreaterThanOrEqual(4);

      // Early tracking date so 90 days is not clamped
      const earlyTracking = '2026-06-01T00:00:00Z';
      const window90 = computeDateWindow('90d', earlyTracking, refNow);
      const buckets90 = generateTimeBuckets(window90);
      expect(buckets90.granularity).toBe('week');
      expect(buckets90.buckets.length).toBeGreaterThanOrEqual(12);
    });

    it('aggregates by month for all time range', () => {
      const windowAll = computeDateWindow('all', trackedSince, refNow);
      const bucketsAll = generateTimeBuckets(windowAll);
      expect(bucketsAll.granularity).toBe('month');
      // Aug, Sep, Oct = 3 months
      expect(bucketsAll.buckets.length).toBe(3);
    });

    it('computes grouped bars in platform breakdown for All platform', () => {
      const window = computeDateWindow('30d', trackedSince, refNow);
      const chart = aggregateChartData(samplePosts, window, 'all', 'views');
      expect(chart.granularity).toBe('week');
      expect(chart.buckets.length).toBeGreaterThan(0);

      const bucketWithPosts = chart.buckets.find((b) => b.total > 0);
      expect(bucketWithPosts).toBeDefined();
      expect(typeof bucketWithPosts?.breakdown.linkedin).toBe('number');
      expect(typeof bucketWithPosts?.breakdown.tiktok).toBe('number');
      expect(typeof bucketWithPosts?.breakdown.instagram).toBe('number');
    });
  });

  describe('Summary Cards and Platform Metrics', () => {
    it('returns 4 summary cards max for any platform', () => {
      const currentPosts = samplePosts.slice(0, 3);
      const prevPosts = samplePosts.slice(0, 2);

      const cardsAll = computePlatformSummaryCards(currentPosts, prevPosts, 'all');
      expect(cardsAll.length).toBe(4);

      const cardsLinkedin = computePlatformSummaryCards(currentPosts, prevPosts, 'linkedin');
      expect(cardsLinkedin.length).toBe(4);
      expect(cardsLinkedin.map((c) => c.key)).toEqual([
        'impressions',
        'reactions',
        'comments',
        'shares',
      ]);
    });

    it('extracts platform-specific metric values accurately', () => {
      const p1 = samplePosts[0];
      const impressions = getPostMetricValue(p1, 'linkedin', 'impressions');
      expect(impressions).toBe(2000);

      const clicks = getPostMetricValue(p1, 'linkedin', 'clicks');
      expect(clicks).toBe(50);

      const clickRate = getPostMetricValue(p1, 'linkedin', 'clickRate');
      expect(clickRate).toBe(2.5);
    });
  });

  describe('CTA Performance Logic', () => {
    it('includes CTA types only when at least 3 posts per type exist', () => {
      // samplePosts has:
      // p1: cta 'link'
      // p2: cta 'link'
      // p4: cta 'link'
      // p5-imported: cta 'sign up' (only 1 post)
      const ctaPerf = computeCtaPerformance(samplePosts);
      expect(ctaPerf.allTypeCounts['link']).toBe(3);
      expect(ctaPerf.allTypeCounts['sign up']).toBe(1);

      // 'link' qualifies because it has 3 posts (>= 3 threshold)
      expect(ctaPerf.qualifyingCount).toBe(1);
      const linkItem = ctaPerf.items.find((i) => i.type === 'link');
      expect(linkItem).toBeDefined();
      expect(linkItem?.postCount).toBe(3);
      // clicks: 50 + 120 + 100 = 270, avg = 270 / 3 = 90
      expect(linkItem?.totalClicks).toBe(270);
      expect(linkItem?.avgClicks).toBe(90);

      // 'sign up' does NOT qualify (< 3 posts)
      const signupItem = ctaPerf.items.find((i) => i.type === 'sign up');
      expect(signupItem).toBe(undefined);
    });
  });
});
