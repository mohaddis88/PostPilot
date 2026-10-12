import {
  ApiClient,
  AccountsApi,
  CalendarApi,
  CalendarDropFileParams,
  ClawedApi,
  MediaApi,
  PostsApi,
  ProfilesApi,
  RecommendationsApi,
  StatsApi,
} from '../types';
import { generateRecommendations, RecommendationResult } from '../../domain/recommendations';
import {
  AccountConnection,
  ChatMessage,
  ChatSession,
  MediaAsset,
  MediaCheckResult,
  MediaVariant,
  MockDriveFile,
  PlatformExecutionStatus,
  PlatformType,
  PostItem,
  PostType,
  PostStatus,
  ProfileId,
  ProfileMetadata,
  SocialAccount,
  StoryPart,
} from '../../domain/types';
import {
  INITIAL_ACCOUNTS,
  INITIAL_DRIVE_FILES,
  INITIAL_POSTS,
  INITIAL_PROFILES,
} from './fixtures';
import { validateMediaAsset } from '../../domain/validation';
import { planStoryParts } from '../../domain/story';
import { PLATFORM_SPECS } from '../../domain/specs';
import {
  aggregateChartData,
  computeCtaPerformance,
  computeDateWindow,
  computePlatformBreakdown,
  computePlatformSummaryCards,
  computePostMetricsSummary,
  filterPostsForStats,
  MetricsSummary,
  PlatformMetricBreakdown,
} from '../../domain/stats';
import { DetailedStatsResponse, StatsDetailQuery } from '../types';

// In-Memory Per-Profile State Store
class MockDataStore {
  private profiles: Record<ProfileId, ProfileMetadata>;
  private accounts: Record<ProfileId, AccountConnection[]>;
  private posts: Record<ProfileId, PostItem[]>;
  private driveFiles: MockDriveFile[];
  private variants: Map<string, MediaVariant> = new Map();
  private chatSessions: Map<string, ChatSession> = new Map();

  constructor() {
    // Initialize profiles from localStorage if available, otherwise fixtures
    let loadedProfiles = INITIAL_PROFILES;
    try {
      const saved = localStorage.getItem('postpilot_profiles_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        loadedProfiles = {
          company: { ...INITIAL_PROFILES.company, ...parsed.company },
          model: { ...INITIAL_PROFILES.model, ...parsed.model },
        };
      }
    } catch {
      // ignore
    }
    this.profiles = loadedProfiles;
    this.accounts = JSON.parse(JSON.stringify(INITIAL_ACCOUNTS));
    this.posts = JSON.parse(JSON.stringify(INITIAL_POSTS));
    this.driveFiles = [...INITIAL_DRIVE_FILES];
  }

  // Profiles
  getProfiles(): Record<ProfileId, ProfileMetadata> {
    return { ...this.profiles };
  }

  updateProfile(id: ProfileId, updates: Partial<ProfileMetadata>): ProfileMetadata {
    this.profiles[id] = { ...this.profiles[id], ...updates };
    try {
      localStorage.setItem('postpilot_profiles_v1', JSON.stringify(this.profiles));
    } catch {
      // ignore
    }
    return this.profiles[id];
  }

  // Posts
  getPosts(profileId: ProfileId): PostItem[] {
    return this.posts[profileId] || [];
  }

  getPost(postId: string): PostItem | null {
    for (const profileId of Object.keys(this.posts) as ProfileId[]) {
      const found = this.posts[profileId].find((p) => p.id === postId);
      if (found) return found;
    }
    return null;
  }

  createPost(newPostData: Omit<PostItem, 'id' | 'createdAt'>): PostItem {
    const profileId = newPostData.profileId;
    const newId = `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const createdPost: PostItem = {
      ...newPostData,
      id: newId,
      createdAt: new Date().toISOString(),
      type: newPostData.type || 'post',
    };

    if (!this.posts[profileId]) {
      this.posts[profileId] = [];
    }
    this.posts[profileId] = [createdPost, ...this.posts[profileId]];
    return createdPost;
  }

  updatePost(postId: string, updates: Partial<PostItem>): PostItem {
    for (const profileId of Object.keys(this.posts) as ProfileId[]) {
      const index = this.posts[profileId].findIndex((p) => p.id === postId);
      if (index !== -1) {
        const updated = { ...this.posts[profileId][index], ...updates };
        this.posts[profileId][index] = updated;
        return updated;
      }
    }
    throw new Error(`Post with id "${postId}" not found`);
  }

  deletePost(postId: string, permanent = false): { success: boolean } {
    for (const profileId of Object.keys(this.posts) as ProfileId[]) {
      const index = this.posts[profileId].findIndex((p) => p.id === postId);
      if (index !== -1) {
        if (permanent) {
          this.posts[profileId].splice(index, 1);
        } else {
          this.posts[profileId][index] = {
            ...this.posts[profileId][index],
            isDeleted: true,
            deletedAt: new Date().toISOString(),
          };
        }
        return { success: true };
      }
    }
    return { success: false };
  }

  restorePost(postId: string): PostItem {
    return this.updatePost(postId, { isDeleted: false, deletedAt: undefined });
  }

  retryExecution(postId: string, platform: PlatformType): PostItem {
    const post = this.getPost(postId);
    if (!post) throw new Error(`Post ${postId} not found`);

    const existingTarget = post.executionTargets?.[platform];
    const prevAttempts = existingTarget?.attempts || [];
    const newAttemptNumber = prevAttempts.length + 1;

    const newTarget = {
      platform,
      status: 'published' as PlatformExecutionStatus,
      platformPostId: `retry_${platform}_${Date.now()}`,
      platformUrl: `https://${platform}.com/recovered_${Date.now()}`,
      attempts: [
        ...prevAttempts,
        {
          attemptNumber: newAttemptNumber,
          startedAt: new Date().toISOString(),
          completedAt: new Date(Date.now() + 3000).toISOString(),
          status: 'published' as PlatformExecutionStatus,
          platformPostId: `retry_${platform}_${Date.now()}`,
          workerId: `worker-retry-${platform}-01`,
        },
      ],
    };

    const updatedTargets = {
      ...post.executionTargets,
      [platform]: newTarget,
    };

    const allSucceeded = post.platforms.every(
      (p) => p === platform || updatedTargets[p]?.status === 'published'
    );

    return this.updatePost(postId, {
      executionTargets: updatedTargets,
      status: allSucceeded ? 'published' : 'failed',
      failureReason: allSucceeded ? undefined : post.failureReason,
      publishedAt: allSucceeded ? 'Just now' : post.publishedAt,
    });
  }

  // Media
  getDriveFiles(): MockDriveFile[] {
    return [...this.driveFiles];
  }

  createVariant(variantData: Omit<MediaVariant, 'id'>): MediaVariant {
    const id = `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const variant: MediaVariant = { ...variantData, id };
    this.variants.set(id, variant);
    return variant;
  }

  // Accounts
  getAccounts(profileId: ProfileId): SocialAccount[] {
    return this.accounts[profileId] || [];
  }

  connectAccount(
    platform: PlatformType,
    handle: string,
    targetProfile: ProfileId
  ): { success: boolean; account?: SocialAccount; error?: string } {
    const existing = (this.accounts[targetProfile] || []).find(
      (a) => a.platform === platform && a.accountHandle.toLowerCase() === handle.toLowerCase()
    );
    if (existing) {
      return { success: false, error: 'Account handle is already connected to this profile.' };
    }

    const newAcc: SocialAccount = {
      platform,
      accountHandle: handle.startsWith('@') ? handle : `@${handle}`,
      displayName: handle.replace('@', ''),
      status: 'active',
      statusMessage: 'Connected & webhook live',
      tokenExpiresInDays: 60,
      lastSync: 'Just now',
      isSimulated: true,
      boundProfileId: targetProfile,
    };

    if (!this.accounts[targetProfile]) this.accounts[targetProfile] = [];
    this.accounts[targetProfile].push(newAcc);
    return { success: true, account: newAcc };
  }

  disconnectAccount(platform: PlatformType, profileId: ProfileId): { success: boolean } {
    if (!this.accounts[profileId]) return { success: false };
    this.accounts[profileId] = this.accounts[profileId].map((a) =>
      a.platform === platform
        ? { ...a, status: 'disconnected', statusMessage: 'Disconnected by administrator' }
        : a
    );
    return { success: true };
  }

  reconnectAccount(
    platform: PlatformType,
    profileId: ProfileId
  ): { success: boolean; account?: SocialAccount } {
    if (!this.accounts[profileId]) return { success: false };
    let updatedAcc: SocialAccount | undefined;
    this.accounts[profileId] = this.accounts[profileId].map((a) => {
      if (a.platform === platform) {
        updatedAcc = {
          ...a,
          status: 'active',
          tokenExpiresInDays: 60,
          statusMessage: 'OAuth 2.0 active (refreshed)',
          lastSync: 'Just now',
        };
        return updatedAcc;
      }
      return a;
    });
    return { success: !!updatedAcc, account: updatedAcc };
  }
}

// Singleton in-memory store instance
const store = new MockDataStore();

export const mockPostsApi: PostsApi = {
  async list(profileId: ProfileId): Promise<PostItem[]> {
    return store.getPosts(profileId);
  },
  async get(postId: string): Promise<PostItem | null> {
    return store.getPost(postId);
  },
  async create(newPostData: Omit<PostItem, 'id' | 'createdAt'>): Promise<PostItem> {
    return store.createPost(newPostData);
  },
  async update(postId: string, updates: Partial<PostItem>): Promise<PostItem> {
    return store.updatePost(postId, updates);
  },
  async delete(postId: string, permanent = false): Promise<{ success: boolean }> {
    return store.deletePost(postId, permanent);
  },
  async restore(postId: string): Promise<PostItem> {
    return store.restorePost(postId);
  },
  async retryExecution(postId: string, platform: PlatformType): Promise<PostItem> {
    return store.retryExecution(postId, platform);
  },
  async savePost(postData: Partial<PostItem>): Promise<PostItem> {
    if (postData.id) {
      return store.updatePost(postData.id, postData);
    }
    const profileId = postData.profileId || 'company';
    return store.createPost({
      profileId,
      title: postData.title || 'Untitled Post',
      caption: postData.caption || '',
      platformCaptions: postData.platformCaptions,
      videoUrl: postData.videoUrl || '',
      videoDuration: postData.videoDuration || '0:30',
      videoAspect: postData.videoAspect || '9:16',
      thumbnailUrl: postData.thumbnailUrl || '',
      platforms: postData.platforms || ['instagram'],
      status: (postData.status as PostStatus) || 'draft',
      author: postData.author || 'User',
      type: postData.type || 'post',
      variants: postData.variants,
      storyParts: postData.storyParts,
      mediaAsset: postData.mediaAsset,
      plannedDate: postData.plannedDate,
      scheduledFor: postData.scheduledFor,
      scheduledForUtc: postData.scheduledForUtc,
      ...postData,
    });
  },
  async schedulePost(postData: Partial<PostItem>): Promise<PostItem> {
    const toSchedule: Partial<PostItem> = {
      ...postData,
      status: 'scheduled' as const,
    };
    if (toSchedule.id) {
      return store.updatePost(toSchedule.id, toSchedule);
    }
    return this.savePost(toSchedule);
  },
};

export const mockMediaApi: MediaApi = {
  async listDriveFiles(): Promise<MockDriveFile[]> {
    return store.getDriveFiles();
  },
  async getAsset(id: string): Promise<MediaAsset | null> {
    const file = store.getDriveFiles().find((f) => f.id === id);
    if (!file) return null;
    return {
      id: file.id,
      kind: 'video',
      driveFileId: file.id,
      width: file.aspect === '9:16' ? 1080 : 1920,
      height: file.aspect === '9:16' ? 1920 : 1080,
      sizeBytes: 25 * 1024 * 1024,
      mime: 'video/mp4',
      name: file.name,
      url: file.videoUrl,
      thumbnailUrl: file.thumbnailUrl,
    };
  },
  async validate(
    asset: MediaAsset,
    platform: PlatformType,
    postType: PostType,
    variant?: MediaVariant,
    storyParts?: StoryPart[]
  ): Promise<MediaCheckResult> {
    return validateMediaAsset(asset, platform, postType, variant, storyParts);
  },
  async validateMedia(
    asset: MediaAsset,
    platform: PlatformType,
    postType: PostType,
    variant?: MediaVariant,
    storyParts?: StoryPart[]
  ): Promise<MediaCheckResult> {
    return validateMediaAsset(asset, platform, postType, variant, storyParts);
  },
  async createVariant(variant: Omit<MediaVariant, 'id'> | MediaVariant): Promise<MediaVariant> {
    if ('id' in variant && variant.id) {
      return variant as MediaVariant;
    }
    return store.createVariant(variant as Omit<MediaVariant, 'id'>);
  },
  async previewStoryPlan(
    durationMs: number,
    maxPartMs: number,
    preferredMs = 30000,
    minTailMs = 5000
  ): Promise<{ parts: StoryPart[]; blocked: boolean; blockReason?: string }> {
    const parts = planStoryParts(durationMs, maxPartMs, preferredMs, minTailMs);
    const maxPerDay = PLATFORM_SPECS.instagram.story.maxPartsPerDay || 100;
    if (parts.length > maxPerDay) {
      return {
        parts,
        blocked: true,
        blockReason: `Exceeds 24-hour limit of ${maxPerDay} story parts (${parts.length} parts planned).`,
      };
    }
    return { parts, blocked: false };
  },
};

export const mockCalendarApi: CalendarApi = {
  async getScheduled(
    profileId: ProfileId,
    _year: number,
    _month: number
  ): Promise<PostItem[]> {
    const posts = store.getPosts(profileId);
    return posts.filter((p) => p.status === 'scheduled' && !p.isDeleted);
  },
  async getRange(from: string, to: string, profileId: ProfileId): Promise<PostItem[]> {
    const posts = store.getPosts(profileId);
    return posts.filter((p) => {
      if (p.isDeleted) return false;
      // Compare plannedDate or scheduledForUtc (formatted as YYYY-MM-DD)
      const postDate = p.plannedDate || (p.scheduledForUtc ? p.scheduledForUtc.split('T')[0] : null);
      if (!postDate) return false;
      return postDate >= from && postDate <= to;
    });
  },
  async reschedule(
    postId: string,
    newDateUtc: string,
    formattedLabel: string
  ): Promise<PostItem> {
    const post = store.getPost(postId);
    if (!post) throw new Error(`Post ${postId} not found`);

    const newDateStr = newDateUtc.includes('T') ? newDateUtc.split('T')[0] : newDateUtc;

    // Drafts keep no time: if it was a draft (or planned without time), preserve plannedDate
    if (post.status === 'draft') {
      return store.updatePost(postId, {
        plannedDate: newDateStr,
        scheduledForUtc: undefined,
        scheduledFor: undefined,
      });
    }

    return store.updatePost(postId, {
      plannedDate: newDateStr,
      scheduledForUtc: newDateUtc,
      scheduledFor: formattedLabel,
      status: 'scheduled',
    });
  },
  async dropFile(params: CalendarDropFileParams): Promise<PostItem> {
    const { profileId, driveFileId, date } = params;

    // 1. Verify profile owns the file
    const file = store.getDriveFiles().find((f) => f.id === driveFileId);
    if (!file) {
      throw new Error(`Drive file ${driveFileId} not found`);
    }
    if (file.profileId && file.profileId !== profileId) {
      throw new Error(`Permission denied: Profile does not own this file's folder.`);
    }

    // 2. Validate type and size (image or video, size <= 100MB)
    const isImage = file.kind === 'image' || file.name.toLowerCase().endsWith('.png') || file.name.toLowerCase().endsWith('.jpg');
    const isVideo = file.kind === 'video' || file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.mov');
    if (!isImage && !isVideo) {
      throw new Error('Invalid file type: File must be an image (JPG, PNG) or video (MP4, MOV).');
    }
    const sizeBytes = file.sizeBytes || 25 * 1024 * 1024;
    if (sizeBytes > 100 * 1024 * 1024) {
      throw new Error('File too large: File exceeds the maximum allowed size of 100MB.');
    }

    // 3. Idempotent check: same file + date for this profile does not create duplicate
    const existing = store.getPosts(profileId).find(
      (p) => !p.isDeleted && p.driveFileId === driveFileId && p.plannedDate === date && p.status === 'draft'
    );
    if (existing) {
      return existing;
    }

    // 4. Create new draft post
    return store.createPost({
      profileId,
      status: 'draft',
      plannedDate: date,
      type: 'post',
      title: file.suggestedTitle || file.name.replace(/\.[^/.]+$/, ''),
      caption: file.suggestedCaption || '',
      platforms: [],
      driveFileId: file.id,
      fileName: file.name,
      videoUrl: file.videoUrl,
      thumbnailUrl: file.thumbnailUrl,
      videoAspect: file.aspect,
      videoDuration: file.duration,
      resolution: file.resolution,
      fileSizeFormatted: file.sizeFormatted,
      fileSizeBytes: file.sizeBytes,
      author: 'Sandy Mass',
    });
  },
};

export const mockStatsApi: StatsApi = {
  async getSummary(profileId: ProfileId): Promise<MetricsSummary> {
    const posts = store.getPosts(profileId);
    return computePostMetricsSummary(posts);
  },
  async getPlatformBreakdown(profileId: ProfileId): Promise<PlatformMetricBreakdown[]> {
    const posts = store.getPosts(profileId);
    return computePlatformBreakdown(posts);
  },
  async getDetailedStats(
    profileId: ProfileId,
    query: StatsDetailQuery
  ): Promise<DetailedStatsResponse> {
    const posts = store.getPosts(profileId);
    const accounts = store.getAccounts(profileId);

    // Determine trackedSince for selected platform or profile
    let trackedSince = '2026-08-12T00:00:00Z';
    if (query.platform !== 'all') {
      const acc = accounts.find((a) => a.platform === query.platform);
      if (acc?.trackedSince) {
        trackedSince = acc.trackedSince;
      }
    } else {
      const valid = accounts
        .map((a) => a.trackedSince)
        .filter((t): t is string => !!t)
        .sort();
      if (valid.length > 0) trackedSince = valid[0];
    }

    const refNow = query.referenceNow ? new Date(query.referenceNow) : undefined;
    const window = computeDateWindow(query.range, trackedSince, refNow);

    // Filter posts for current period
    const currentPosts = filterPostsForStats(posts, window, query.platform);

    // Filter posts for previous period of exact same duration
    const prevWindow = {
      windowStart: window.previousWindowStart,
      windowEnd: window.previousWindowEnd,
    };
    const previousPosts = filterPostsForStats(posts, prevWindow, query.platform);

    // Compute summary cards (max 4)
    const summaryCards = computePlatformSummaryCards(currentPosts, previousPosts, query.platform);

    // Compute chart buckets
    const metricKey = query.selectedMetric || (query.platform === 'all' ? 'views' : 'impressions');
    const chart = aggregateChartData(currentPosts, window, query.platform, metricKey);

    // Compute CTA performance across published posts for this profile
    const ctaPerformance = computeCtaPerformance(posts);

    return {
      window,
      summaryCards,
      chart,
      currentPosts,
      previousPosts,
      ctaPerformance,
      trackedSince,
    };
  },
};

export const mockAccountsApi: AccountsApi = {
  async list(profileId: ProfileId): Promise<SocialAccount[]> {
    return store.getAccounts(profileId);
  },
  async connect(
    platform: PlatformType,
    handle: string,
    targetProfile: ProfileId
  ): Promise<{ success: boolean; account?: SocialAccount; error?: string }> {
    return store.connectAccount(platform, handle, targetProfile);
  },
  async disconnect(platform: PlatformType, profileId: ProfileId): Promise<{ success: boolean }> {
    return store.disconnectAccount(platform, profileId);
  },
  async reconnect(
    platform: PlatformType,
    profileId: ProfileId
  ): Promise<{ success: boolean; account?: SocialAccount }> {
    return store.reconnectAccount(platform, profileId);
  },
};

export const mockClawedApi: ClawedApi = {
  async sendMessage(
    text: string,
    context: { profileId: ProfileId; chatId?: string }
  ): Promise<ChatMessage> {
    const botMsg: ChatMessage = {
      id: `msg-bot-${Date.now()}`,
      sender: 'clawed',
      text: `Processing request for profile ${context.profileId}: "${text}"`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      profileId: context.profileId,
    };
    return botMsg;
  },
  async listSessions(_profileId: ProfileId): Promise<ChatSession[]> {
    return [];
  },
  async resolveAction(
    _actionId: string,
    _resolution: 'approved' | 'cancelled'
  ): Promise<{ success: boolean }> {
    return { success: true };
  },
};

export const mockProfilesApi: ProfilesApi = {
  async list(): Promise<Record<ProfileId, ProfileMetadata>> {
    return store.getProfiles();
  },
  async update(id: ProfileId, updates: Partial<ProfileMetadata>): Promise<ProfileMetadata> {
    return store.updateProfile(id, updates);
  },
};

export const mockRecommendationsApi: RecommendationsApi = {
  async list(
    profileId: ProfileId,
    platform: PlatformType | 'all' = 'all'
  ): Promise<RecommendationResult[]> {
    const posts = store.getPosts(profileId);
    return generateRecommendations(profileId, posts, platform);
  },
};

export const mockApiClient: ApiClient = {
  posts: mockPostsApi,
  media: mockMediaApi,
  calendar: mockCalendarApi,
  stats: mockStatsApi,
  recommendations: mockRecommendationsApi,
  accounts: mockAccountsApi,
  clawed: mockClawedApi,
  profiles: mockProfilesApi,

  validateMedia: mockMediaApi.validateMedia,
  createVariant: mockMediaApi.createVariant,
  previewStoryPlan: mockMediaApi.previewStoryPlan,
  savePost: mockPostsApi.savePost,
  schedulePost: mockPostsApi.schedulePost,
};
