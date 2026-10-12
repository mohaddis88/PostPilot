import {
  ChatMessage,
  ChatSession,
  MediaAsset,
  MediaCheckResult,
  MediaVariant,
  MockDriveFile,
  PlatformType,
  PostItem,
  PostType,
  ProfileId,
  ProfileMetadata,
  SocialAccount,
  StoryPart,
} from '../domain/types';
import {
  ChartAggregationResult,
  CtaPerformanceResult,
  DateWindowResult,
  MetricsSummary,
  PlatformMetricBreakdown,
  StatsRange,
  SummaryCardData,
} from '../domain/stats';
import { RecommendationResult } from '../domain/recommendations';

export interface PostsApi {
  list(profileId: ProfileId): Promise<PostItem[]>;
  get(id: string): Promise<PostItem | null>;
  create(post: Omit<PostItem, 'id' | 'createdAt'>): Promise<PostItem>;
  update(id: string, updates: Partial<PostItem>): Promise<PostItem>;
  delete(id: string, permanent?: boolean): Promise<{ success: boolean }>;
  restore(id: string): Promise<PostItem>;
  retryExecution(postId: string, platform: PlatformType): Promise<PostItem>;
  savePost(postData: Partial<PostItem>): Promise<PostItem>;
  schedulePost(postData: Partial<PostItem>): Promise<PostItem>;
}

export interface MediaApi {
  listDriveFiles(): Promise<MockDriveFile[]>;
  getAsset(id: string): Promise<MediaAsset | null>;
  validate(
    asset: MediaAsset,
    platform: PlatformType,
    postType: PostType,
    variant?: MediaVariant,
    storyParts?: StoryPart[]
  ): Promise<MediaCheckResult>;
  validateMedia(
    asset: MediaAsset,
    platform: PlatformType,
    postType: PostType,
    variant?: MediaVariant,
    storyParts?: StoryPart[]
  ): Promise<MediaCheckResult>;
  createVariant(variant: Omit<MediaVariant, 'id'> | MediaVariant): Promise<MediaVariant>;
  previewStoryPlan(
    durationMs: number,
    maxPartMs: number,
    preferredMs?: number,
    minTailMs?: number
  ): Promise<{ parts: StoryPart[]; blocked: boolean; blockReason?: string }>;
}

export interface CalendarDropFileParams {
  profileId: ProfileId;
  driveFileId: string;
  date: string; // YYYY-MM-DD
}

export interface CalendarApi {
  getScheduled(profileId: ProfileId, year: number, month: number, timeZone?: string): Promise<PostItem[]>;
  getRange(from: string, to: string, profileId: ProfileId): Promise<PostItem[]>;
  reschedule(postId: string, newDateUtc: string, formattedLabel: string): Promise<PostItem>;
  dropFile(params: CalendarDropFileParams): Promise<PostItem>;
}

export interface StatsDetailQuery {
  range: StatsRange;
  platform: PlatformType | 'all';
  selectedMetric?: string;
  referenceNow?: string;
}

export interface DetailedStatsResponse {
  window: DateWindowResult;
  summaryCards: SummaryCardData[];
  chart: ChartAggregationResult;
  currentPosts: PostItem[];
  previousPosts: PostItem[];
  ctaPerformance: CtaPerformanceResult;
  trackedSince: string;
}

export interface StatsApi {
  getSummary(profileId: ProfileId): Promise<MetricsSummary>;
  getPlatformBreakdown(profileId: ProfileId): Promise<PlatformMetricBreakdown[]>;
  getDetailedStats(profileId: ProfileId, query: StatsDetailQuery): Promise<DetailedStatsResponse>;
}

export interface AccountsApi {
  list(profileId: ProfileId): Promise<SocialAccount[]>;
  connect(platform: PlatformType, handle: string, targetProfile: ProfileId): Promise<{ success: boolean; account?: SocialAccount; error?: string }>;
  disconnect(platform: PlatformType, profileId: ProfileId): Promise<{ success: boolean }>;
  reconnect(platform: PlatformType, profileId: ProfileId): Promise<{ success: boolean; account?: SocialAccount }>;
}

export interface ClawedApi {
  sendMessage(text: string, context: { profileId: ProfileId; chatId?: string }): Promise<ChatMessage>;
  listSessions(profileId: ProfileId): Promise<ChatSession[]>;
  resolveAction(actionId: string, resolution: 'approved' | 'cancelled'): Promise<{ success: boolean }>;
}

export interface RecommendationsApi {
  list(profileId: ProfileId, platform?: PlatformType | 'all'): Promise<RecommendationResult[]>;
}

export interface ProfilesApi {
  list(): Promise<Record<ProfileId, ProfileMetadata>>;
  update(id: ProfileId, updates: Partial<ProfileMetadata>): Promise<ProfileMetadata>;
}

export interface ApiClient {
  posts: PostsApi;
  media: MediaApi;
  calendar: CalendarApi;
  stats: StatsApi;
  recommendations: RecommendationsApi;
  accounts: AccountsApi;
  clawed: ClawedApi;
  profiles: ProfilesApi;

  // Direct top-level API methods:
  validateMedia(
    asset: MediaAsset,
    platform: PlatformType,
    postType: PostType,
    variant?: MediaVariant,
    storyParts?: StoryPart[]
  ): Promise<MediaCheckResult>;
  createVariant(variant: Omit<MediaVariant, 'id'> | MediaVariant): Promise<MediaVariant>;
  previewStoryPlan(
    durationMs: number,
    maxPartMs: number,
    preferredMs?: number,
    minTailMs?: number
  ): Promise<{ parts: StoryPart[]; blocked: boolean; blockReason?: string }>;
  savePost(postData: Partial<PostItem>): Promise<PostItem>;
  schedulePost(postData: Partial<PostItem>): Promise<PostItem>;
}
