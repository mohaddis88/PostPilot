import {
  ApiClient,
  AccountsApi,
  CalendarApi,
  CalendarDropFileParams,
  ClawedApi,
  DetailedStatsResponse,
  MediaApi,
  PostsApi,
  ProfilesApi,
  RecommendationsApi,
  StatsApi,
  StatsDetailQuery,
} from '../types';
import { RecommendationResult } from '../../domain/recommendations';
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
} from '../../domain/types';
import { MetricsSummary, PlatformMetricBreakdown } from '../../domain/stats';
import { mockApiClient } from '../mock';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `HTTP error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const httpPostsApi: PostsApi = {
  async list(profileId: ProfileId): Promise<PostItem[]> {
    return request<PostItem[]>(`/profiles/${profileId}/posts`).catch(() =>
      mockApiClient.posts.list(profileId)
    );
  },
  async get(postId: string): Promise<PostItem | null> {
    return request<PostItem>(`/posts/${postId}`).catch(() => mockApiClient.posts.get(postId));
  },
  async create(newPostData: Omit<PostItem, 'id' | 'createdAt'>): Promise<PostItem> {
    return request<PostItem>('/posts', {
      method: 'POST',
      body: JSON.stringify(newPostData),
    }).catch(() => mockApiClient.posts.create(newPostData));
  },
  async update(postId: string, updates: Partial<PostItem>): Promise<PostItem> {
    return request<PostItem>(`/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }).catch(() => mockApiClient.posts.update(postId, updates));
  },
  async delete(postId: string, permanent = false): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/posts/${postId}?permanent=${permanent}`, {
      method: 'DELETE',
    }).catch(() => mockApiClient.posts.delete(postId, permanent));
  },
  async restore(postId: string): Promise<PostItem> {
    return request<PostItem>(`/posts/${postId}/restore`, {
      method: 'POST',
    }).catch(() => mockApiClient.posts.restore(postId));
  },
  async retryExecution(postId: string, platform: PlatformType): Promise<PostItem> {
    return request<PostItem>(`/posts/${postId}/retry`, {
      method: 'POST',
      body: JSON.stringify({ platform }),
    }).catch(() => mockApiClient.posts.retryExecution(postId, platform));
  },
  async savePost(postData: Partial<PostItem>): Promise<PostItem> {
    return request<PostItem>('/posts/save', {
      method: 'POST',
      body: JSON.stringify(postData),
    }).catch(() => mockApiClient.posts.savePost(postData));
  },
  async schedulePost(postData: Partial<PostItem>): Promise<PostItem> {
    return request<PostItem>('/posts/schedule', {
      method: 'POST',
      body: JSON.stringify(postData),
    }).catch(() => mockApiClient.posts.schedulePost(postData));
  },
};

export const httpMediaApi: MediaApi = {
  async listDriveFiles(): Promise<MockDriveFile[]> {
    return request<MockDriveFile[]>('/media/drive-files').catch(() =>
      mockApiClient.media.listDriveFiles()
    );
  },
  async getAsset(id: string): Promise<MediaAsset | null> {
    return request<MediaAsset>(`/media/assets/${id}`).catch(() =>
      mockApiClient.media.getAsset(id)
    );
  },
  async validate(
    asset: MediaAsset,
    platform: PlatformType,
    postType: PostType,
    variant?: MediaVariant,
    storyParts?: StoryPart[]
  ): Promise<MediaCheckResult> {
    return request<MediaCheckResult>('/media/validate', {
      method: 'POST',
      body: JSON.stringify({ asset, platform, postType, variant, storyParts }),
    }).catch(() => mockApiClient.media.validate(asset, platform, postType, variant, storyParts));
  },
  async validateMedia(
    asset: MediaAsset,
    platform: PlatformType,
    postType: PostType,
    variant?: MediaVariant,
    storyParts?: StoryPart[]
  ): Promise<MediaCheckResult> {
    return this.validate(asset, platform, postType, variant, storyParts);
  },
  async createVariant(variant: Omit<MediaVariant, 'id'> | MediaVariant): Promise<MediaVariant> {
    return request<MediaVariant>('/media/variants', {
      method: 'POST',
      body: JSON.stringify(variant),
    }).catch(() => mockApiClient.media.createVariant(variant));
  },
  async previewStoryPlan(
    durationMs: number,
    maxPartMs: number,
    preferredMs = 30000,
    minTailMs = 5000
  ): Promise<{ parts: StoryPart[]; blocked: boolean; blockReason?: string }> {
    return request<{ parts: StoryPart[]; blocked: boolean; blockReason?: string }>(
      '/media/story-plan',
      {
        method: 'POST',
        body: JSON.stringify({ durationMs, maxPartMs, preferredMs, minTailMs }),
      }
    ).catch(() =>
      mockApiClient.media.previewStoryPlan(durationMs, maxPartMs, preferredMs, minTailMs)
    );
  },
};

export const httpCalendarApi: CalendarApi = {
  async getScheduled(
    profileId: ProfileId,
    year: number,
    month: number,
    timeZone?: string
  ): Promise<PostItem[]> {
    return request<PostItem[]>(
      `/profiles/${profileId}/calendar?year=${year}&month=${month}&tz=${timeZone || ''}`
    ).catch(() => mockApiClient.calendar.getScheduled(profileId, year, month, timeZone));
  },
  async getRange(from: string, to: string, profileId: ProfileId): Promise<PostItem[]> {
    return request<PostItem[]>(
      `/profiles/${profileId}/calendar/range?from=${from}&to=${to}`
    ).catch(() => mockApiClient.calendar.getRange(from, to, profileId));
  },
  async reschedule(
    postId: string,
    newDateUtc: string,
    formattedLabel: string
  ): Promise<PostItem> {
    return request<PostItem>(`/posts/${postId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduledForUtc: newDateUtc, scheduledFor: formattedLabel }),
    }).catch(() => mockApiClient.calendar.reschedule(postId, newDateUtc, formattedLabel));
  },
  async dropFile(params: CalendarDropFileParams): Promise<PostItem> {
    return request<PostItem>('/calendar/drop-file', {
      method: 'POST',
      body: JSON.stringify(params),
    }).catch(() => mockApiClient.calendar.dropFile(params));
  },
};

export const httpStatsApi: StatsApi = {
  async getSummary(profileId: ProfileId): Promise<MetricsSummary> {
    return request<MetricsSummary>(`/profiles/${profileId}/stats/summary`).catch(() =>
      mockApiClient.stats.getSummary(profileId)
    );
  },
  async getPlatformBreakdown(profileId: ProfileId): Promise<PlatformMetricBreakdown[]> {
    return request<PlatformMetricBreakdown[]>(`/profiles/${profileId}/stats/breakdown`).catch(() =>
      mockApiClient.stats.getPlatformBreakdown(profileId)
    );
  },
  async getDetailedStats(
    profileId: ProfileId,
    query: StatsDetailQuery
  ): Promise<DetailedStatsResponse> {
    return request<DetailedStatsResponse>(`/profiles/${profileId}/stats/detailed`, {
      method: 'POST',
      body: JSON.stringify(query),
    }).catch(() => mockApiClient.stats.getDetailedStats(profileId, query));
  },
};

export const httpAccountsApi: AccountsApi = {
  async list(profileId: ProfileId): Promise<SocialAccount[]> {
    return request<SocialAccount[]>(`/profiles/${profileId}/accounts`).catch(() =>
      mockApiClient.accounts.list(profileId)
    );
  },
  async connect(
    platform: PlatformType,
    handle: string,
    targetProfile: ProfileId
  ): Promise<{ success: boolean; account?: SocialAccount; error?: string }> {
    return request<{ success: boolean; account?: SocialAccount; error?: string }>(
      `/profiles/${targetProfile}/accounts/connect`,
      {
        method: 'POST',
        body: JSON.stringify({ platform, handle }),
      }
    ).catch(() => mockApiClient.accounts.connect(platform, handle, targetProfile));
  },
  async disconnect(platform: PlatformType, profileId: ProfileId): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/profiles/${profileId}/accounts/${platform}`, {
      method: 'DELETE',
    }).catch(() => mockApiClient.accounts.disconnect(platform, profileId));
  },
  async reconnect(
    platform: PlatformType,
    profileId: ProfileId
  ): Promise<{ success: boolean; account?: SocialAccount }> {
    return request<{ success: boolean; account?: SocialAccount }>(
      `/profiles/${profileId}/accounts/${platform}/reconnect`,
      {
        method: 'POST',
      }
    ).catch(() => mockApiClient.accounts.reconnect(platform, profileId));
  },
};

export const httpClawedApi: ClawedApi = {
  async sendMessage(
    text: string,
    context: { profileId: ProfileId; chatId?: string }
  ): Promise<ChatMessage> {
    return request<ChatMessage>('/clawed/chat', {
      method: 'POST',
      body: JSON.stringify({ text, context }),
    }).catch(() => mockApiClient.clawed.sendMessage(text, context));
  },
  async listSessions(profileId: ProfileId): Promise<ChatSession[]> {
    return request<ChatSession[]>(`/clawed/sessions?profileId=${profileId}`).catch(() =>
      mockApiClient.clawed.listSessions(profileId)
    );
  },
  async resolveAction(
    actionId: string,
    resolution: 'approved' | 'cancelled'
  ): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/clawed/actions/${actionId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    }).catch(() => mockApiClient.clawed.resolveAction(actionId, resolution));
  },
};

export const httpProfilesApi: ProfilesApi = {
  async list(): Promise<Record<ProfileId, ProfileMetadata>> {
    return request<Record<ProfileId, ProfileMetadata>>('/profiles').catch(() =>
      mockApiClient.profiles.list()
    );
  },
  async update(id: ProfileId, updates: Partial<ProfileMetadata>): Promise<ProfileMetadata> {
    return request<ProfileMetadata>(`/profiles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }).catch(() => mockApiClient.profiles.update(id, updates));
  },
};

export const httpRecommendationsApi: RecommendationsApi = {
  async list(
    profileId: ProfileId,
    platform: PlatformType | 'all' = 'all'
  ): Promise<RecommendationResult[]> {
    return request<RecommendationResult[]>(
      `/profiles/${profileId}/recommendations?platform=${platform}`
    ).catch(() => mockApiClient.recommendations.list(profileId, platform));
  },
};

export const httpApiClient: ApiClient = {
  posts: httpPostsApi,
  media: httpMediaApi,
  calendar: httpCalendarApi,
  stats: httpStatsApi,
  recommendations: httpRecommendationsApi,
  accounts: httpAccountsApi,
  clawed: httpClawedApi,
  profiles: httpProfilesApi,

  validateMedia: (asset, platform, postType, variant, storyParts) =>
    httpMediaApi.validateMedia(asset, platform, postType, variant, storyParts),
  createVariant: (variant) => httpMediaApi.createVariant(variant),
  previewStoryPlan: (durationMs, maxPartMs, preferredMs, minTailMs) =>
    httpMediaApi.previewStoryPlan(durationMs, maxPartMs, preferredMs, minTailMs),
  savePost: (postData) => httpPostsApi.savePost(postData),
  schedulePost: (postData) => httpPostsApi.schedulePost(postData),
};
