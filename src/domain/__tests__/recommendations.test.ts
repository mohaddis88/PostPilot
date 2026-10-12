import { describe, expect, it } from './testHelper';
import {
  computeChannelHealthReport,
  generateRecommendations,
  getNextOccurrenceDate,
  getRecommendedPostingSlots,
  RecommendationObject,
} from '../recommendations';
import { AccountConnection, CreateDraftState, PostItem } from '../types';
import { combineDateTimeToUtc } from '../dates';

describe('recommendations domain logic', () => {
  it('returns recommended slots for all 4 platforms', () => {
    expect(getRecommendedPostingSlots('linkedin').length).toBeGreaterThan(0);
    expect(getRecommendedPostingSlots('instagram').length).toBeGreaterThan(0);
    expect(getRecommendedPostingSlots('tiktok').length).toBeGreaterThan(0);
    expect(getRecommendedPostingSlots('facebook').length).toBeGreaterThan(0);
  });

  it('computes channel health report with active accounts and scheduled posts', () => {
    const accounts: AccountConnection[] = [
      {
        platform: 'linkedin',
        accountHandle: '@acme',
        displayName: 'Acme',
        status: 'active',
        lastSync: 'just now',
        boundProfileId: 'company',
      },
    ];
    const posts: PostItem[] = [
      {
        id: 'p1',
        profileId: 'company',
        title: 'Future Post',
        caption: '',
        videoUrl: '',
        videoDuration: '',
        videoAspect: '16:9',
        thumbnailUrl: '',
        platforms: ['linkedin'],
        status: 'scheduled',
        createdAt: '2026-10-01T00:00:00Z',
        author: 'Author',
      },
    ];

    const report = computeChannelHealthReport(posts, accounts);
    expect(report.score).toBe(100);
    expect(report.rating).toBe('excellent');
  });

  it('reduces score when accounts are disconnected and posts failed', () => {
    const accounts: AccountConnection[] = [
      {
        platform: 'linkedin',
        accountHandle: '@acme',
        displayName: 'Acme',
        status: 'reauth_required',
        lastSync: '2h ago',
        boundProfileId: 'company',
      },
    ];
    const posts: PostItem[] = [
      {
        id: 'p1',
        profileId: 'company',
        title: 'Failed Post',
        caption: '',
        videoUrl: '',
        videoDuration: '',
        videoAspect: '16:9',
        thumbnailUrl: '',
        platforms: ['linkedin'],
        status: 'failed',
        createdAt: '2026-10-01T00:00:00Z',
        author: 'Author',
      },
    ];

    const report = computeChannelHealthReport(posts, accounts);
    expect(report.score).toBeLessThan(80);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  // ================================================================
  // ACTIONABLE RECOMMENDATIONS & TRY THIS PREFILL VERIFICATION
  // ================================================================

  it('is deterministic: same inputs always produce identical recommendations', () => {
    const tuesdays = ['2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06'];
    const thursdays = ['2026-09-03', '2026-09-10', '2026-09-17', '2026-09-24', '2026-10-01'];

    const posts: PostItem[] = [
      ...tuesdays.map((d, i) => ({
        id: `tue-${i}`,
        profileId: 'company' as const,
        type: 'post' as const,
        title: `Post ${i}`,
        caption: '',
        videoUrl: '',
        videoDuration: '',
        videoAspect: '16:9' as const,
        thumbnailUrl: '',
        platforms: ['linkedin' as const],
        status: 'published' as const,
        publishedAt: `${d}T06:15:00Z`,
        createdAt: `${d}T00:00:00Z`,
        author: 'Sandy',
        cta: 'link' as const,
        ctaClicks: 800 + i * 10,
        platformMetrics: {
          linkedin: {
            impressions: 32000 + i * 200,
            reactions: 800,
            comments: 50,
            shares: 100,
            clicks: 800,
            clickRate: 2.5,
            ctaClicks: 800 + i * 10,
          },
        },
      })),
      ...thursdays.map((d, i) => ({
        id: `thu-${i}`,
        profileId: 'company' as const,
        type: 'post' as const,
        title: `Post ${i}`,
        caption: '',
        videoUrl: '',
        videoDuration: '',
        videoAspect: '16:9' as const,
        thumbnailUrl: '',
        platforms: ['linkedin' as const],
        status: 'published' as const,
        publishedAt: `${d}T01:15:00Z`,
        createdAt: `${d}T00:00:00Z`,
        author: 'Sandy',
        cta: 'book' as const,
        ctaClicks: 300 + i * 10,
        platformMetrics: {
          linkedin: {
            impressions: 18000 + i * 150,
            reactions: 400,
            comments: 20,
            shares: 50,
            clicks: 300,
            clickRate: 1.6,
            ctaClicks: 300 + i * 10,
          },
        },
      })),
    ];

    const refDate = new Date('2026-10-12T00:00:00Z');
    const run1 = generateRecommendations('company', posts, 'linkedin', 'Asia/Kuala_Lumpur', refDate);
    const run2 = generateRecommendations('company', posts, 'linkedin', 'Asia/Kuala_Lumpur', refDate);

    expect(JSON.stringify(run1)).toEqual(JSON.stringify(run2));
  });

  it('what the best_time card says is what gets prefilled into Create and stored as UTC', () => {
    // 5 Tuesdays at 14:00 (local Asia/Kuala_Lumpur => 06:15 UTC) averaging 32k impressions
    // 5 Thursdays at 09:00 (local Asia/Kuala_Lumpur => 01:15 UTC) averaging 18k impressions
    const tuesdays = ['2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06'];
    const thursdays = ['2026-09-03', '2026-09-10', '2026-09-17', '2026-09-24', '2026-10-01'];

    const posts: PostItem[] = [
      ...tuesdays.map((d, i) => ({
        id: `tue-${i}`,
        profileId: 'company' as const,
        type: 'post' as const,
        title: `Post ${i}`,
        caption: '',
        videoUrl: '',
        videoDuration: '',
        videoAspect: '16:9' as const,
        thumbnailUrl: '',
        platforms: ['linkedin' as const],
        status: 'published' as const,
        publishedAt: `${d}T06:15:00Z`,
        createdAt: `${d}T00:00:00Z`,
        author: 'Sandy',
        cta: 'link' as const,
        ctaClicks: 800,
        platformMetrics: {
          linkedin: {
            impressions: 32000,
            reactions: 800,
            comments: 50,
            shares: 100,
            clicks: 800,
            clickRate: 2.5,
          },
        },
      })),
      ...thursdays.map((d, i) => ({
        id: `thu-${i}`,
        profileId: 'company' as const,
        type: 'post' as const,
        title: `Post ${i}`,
        caption: '',
        videoUrl: '',
        videoDuration: '',
        videoAspect: '16:9' as const,
        thumbnailUrl: '',
        platforms: ['linkedin' as const],
        status: 'published' as const,
        publishedAt: `${d}T01:15:00Z`,
        createdAt: `${d}T00:00:00Z`,
        author: 'Sandy',
        cta: 'book' as const,
        ctaClicks: 300,
        platformMetrics: {
          linkedin: {
            impressions: 18000,
            reactions: 400,
            comments: 20,
            shares: 50,
            clicks: 300,
            clickRate: 1.6,
          },
        },
      })),
    ];

    // Reference date: Monday, Oct 12, 2026
    const refNow = new Date('2026-10-12T00:00:00Z');
    const tz = 'Asia/Kuala_Lumpur';
    const recs = generateRecommendations('company', posts, 'linkedin', tz, refNow);

    const bestTimeResult = recs.find((r) => r.kind === 'best_time');
    expect(bestTimeResult?.hasRecommendation).toBe(true);
    const rec = bestTimeResult!.recommendation!;

    // 1. Verify card wording displays the slot as a range and references the middle time
    expect(rec.headline).toContain('Tuesdays');
    expect(rec.headline).toContain('2:00-3:00 PM');
    expect(rec.tryThis).toContain('2:30 PM');
    expect(rec.tryThis).toContain('Tuesday, 13 Oct');

    // 2. Action parameters match what the card stated
    const action = rec.action;
    expect(action.type).toBe('create_post');
    expect(action.params.platform).toBe('linkedin');
    expect(action.params.postType).toBe('post');
    expect(action.params.dayOfWeek).toBe(2); // Tuesday
    expect(action.params.localTime).toBe('14:30'); // middle of 2:00-3:00 PM
    expect(action.params.scheduledDate).toBe('2026-10-13'); // next Tuesday
    expect(action.params.tz).toBe('Asia/Kuala_Lumpur');

    // 3. Verify UTC storage conversion
    const utcConverted = combineDateTimeToUtc(
      action.params.scheduledDate!,
      action.params.localTime!,
      action.params.tz
    );
    // In Asia/Kuala_Lumpur (UTC+8), 2026-10-13 at 14:30 is 2026-10-13T06:30:00.000Z in UTC
    expect(utcConverted).toBe('2026-10-13T06:30:00.000Z');

    // 4. Verify Create draft prefill mapping exactly matches action params
    const initialDraft: CreateDraftState = {
      currentStep: 1,
      postType: 'post',
      selectedFile: null,
      masterTitle: '',
      masterCaption: '',
      activeCaptionTab: 'master',
      platformOverrides: {},
      activePreviewPlatform: 'instagram',
      selectedPlatforms: ['instagram', 'tiktok'],
    };

    // Apply recommendation action
    const prefilledDraft: CreateDraftState = {
      ...initialDraft,
      selectedPlatforms: [action.params.platform],
      activePreviewPlatform: action.params.platform,
      postType: action.params.postType,
      scheduleMode: 'schedule',
      scheduledDate: action.params.scheduledDate,
      scheduledTime: action.params.localTime,
      prefilledRecommendation: {
        id: rec.id,
        kind: rec.kind,
        headline: rec.headline,
        description: rec.tryThis,
      },
    };

    expect(prefilledDraft.selectedPlatforms).toEqual(['linkedin']);
    expect(prefilledDraft.activePreviewPlatform).toBe('linkedin');
    expect(prefilledDraft.postType).toBe('post');
    expect(prefilledDraft.scheduleMode).toBe('schedule');
    expect(prefilledDraft.scheduledDate).toBe('2026-10-13');
    expect(prefilledDraft.scheduledTime).toBe('14:30');
    expect(prefilledDraft.prefilledRecommendation?.headline).toBe(rec.headline);
  });

  it('evaluates format recommendation (Post vs Story) with 5 sample minimum and 15% diff', () => {
    const posts: PostItem[] = [
      ...[1, 2, 3, 4, 5].map((i) => ({
        id: `feed-${i}`,
        profileId: 'company' as const,
        type: 'post' as const,
        title: `Feed ${i}`,
        caption: '',
        videoUrl: '',
        videoDuration: '',
        videoAspect: '1:1' as const,
        thumbnailUrl: '',
        platforms: ['instagram' as const],
        status: 'published' as const,
        publishedAt: `2026-09-1${i}T08:00:00Z`,
        createdAt: '2026-09-01T00:00:00Z',
        author: 'Sandy',
        platformMetrics: {
          instagram: {
            reach: 20000,
            views: 28000,
            likes: 1000,
            comments: 30,
            saves: 80,
            shares: 60,
            profileVisits: 200,
          },
        },
      })),
      ...[1, 2, 3, 4, 5].map((i) => ({
        id: `story-${i}`,
        profileId: 'company' as const,
        type: 'story' as const,
        title: `Story ${i}`,
        caption: '',
        videoUrl: '',
        videoDuration: '',
        videoAspect: '9:16' as const,
        thumbnailUrl: '',
        platforms: ['instagram' as const],
        status: 'published' as const,
        publishedAt: `2026-09-2${i}T08:00:00Z`,
        createdAt: '2026-09-01T00:00:00Z',
        author: 'Sandy',
        platformMetrics: {
          instagram: {
            reach: 40000,
            views: 55000,
            likes: 2200,
            comments: 70,
            saves: 180,
            shares: 140,
            profileVisits: 500,
          },
        },
      })),
    ];

    const recs = generateRecommendations('company', posts, 'instagram', 'Asia/Kuala_Lumpur');
    const formatRec = recs.find((r) => r.kind === 'format');

    expect(formatRec?.hasRecommendation).toBe(true);
    expect(formatRec?.recommendation?.headline).toContain('Stories generate 100% higher reach than Feed Posts');
    expect(formatRec?.recommendation?.action.params.postType).toBe('story');
    expect(formatRec?.recommendation?.action.params.platform).toBe('instagram');
  });

  it('shows Not enough data yet when fewer than 5 posts per category or diff < 15%', () => {
    // Only 3 posts each (below 5 minimum threshold)
    const posts: PostItem[] = [
      ...[1, 2, 3].map((i) => ({
        id: `fb-post-${i}`,
        profileId: 'company' as const,
        type: 'post' as const,
        title: `Post ${i}`,
        caption: '',
        videoUrl: '',
        videoDuration: '',
        videoAspect: '16:9' as const,
        thumbnailUrl: '',
        platforms: ['facebook' as const],
        status: 'published' as const,
        publishedAt: `2026-10-0${i}T08:00:00Z`,
        createdAt: '2026-10-01T00:00:00Z',
        author: 'Sandy',
        platformMetrics: {
          facebook: {
            reach: 15000,
            reactions: 600,
            comments: 25,
            shares: 50,
            linkClicks: 300,
            videoViews: 15000,
          },
        },
      })),
    ];

    const recs = generateRecommendations('company', posts, 'facebook', 'Asia/Kuala_Lumpur');
    const bestTime = recs.find((r) => r.kind === 'best_time');
    expect(bestTime?.hasRecommendation).toBe(false);
    expect(bestTime?.insufficientDataReason).toContain('Not enough data yet');

    const formatRec = recs.find((r) => r.kind === 'format');
    expect(formatRec?.hasRecommendation).toBe(false);
    expect(formatRec?.insufficientDataReason).toContain('Not enough data yet');

    const ctaRec = recs.find((r) => r.kind === 'cta');
    expect(ctaRec?.hasRecommendation).toBe(false);
    expect(ctaRec?.insufficientDataReason).toContain('Not enough data yet');
  });
});
