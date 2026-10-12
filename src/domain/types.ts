export type ProfileId = 'company' | 'model';

export type ThemeMode = 'light' | 'dark';

export type NavItemId =
  | 'dashboard'
  | 'create'
  | 'drafts'
  | 'schedule'
  | 'logs'
  | 'accounts'
  | 'statistics'
  | 'insights'
  | 'clawed'
  | 'system'
  | 'settings';

export type PlatformType = 'linkedin' | 'instagram' | 'tiktok' | 'facebook';

export type PostType = 'post' | 'story';

export type PostStatus =
  | 'draft'
  | 'needs_review'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'changes_requested'
  | 'rejected';

export type AccountConnectionStatus =
  | 'active'
  | 'expiring'
  | 'disconnected'
  | 'reauth_required';

export interface ProfileMetadata {
  id: ProfileId;
  name: string;
  badge: string;
  description: string;
  image_url: string;
  avatar?: string;
  accountTypeLabel: string;
  timezone?: string;
}

export type Profile = ProfileMetadata;

export interface SocialAccount {
  platform: PlatformType;
  accountHandle: string;
  displayName: string;
  status: AccountConnectionStatus;
  statusMessage?: string;
  tokenExpiresInDays?: number;
  lastSync: string;
  isSimulated?: boolean;
  isRealReady?: boolean;
  boundProfileId: ProfileId;
  scopes?: string[];
  trackedSince?: string; // ISO date string when social account was connected, e.g. '2026-08-12T00:00:00Z'
}

export type AccountConnection = SocialAccount;

export interface MediaAsset {
  id: string;
  kind: 'image' | 'video';
  driveFileId?: string;
  width: number;
  height: number;
  durationMs?: number;
  sizeBytes: number;
  mime: string;
  name?: string;
  url?: string;
  thumbnailUrl?: string;
}

export type MediaFit = 'crop' | 'blur_fill' | 'letterbox';

export interface CropCoordinates {
  cx: number;
  cy: number;
  zoom: number;
}

export interface MediaVariant {
  id: string;
  assetId: string;
  platform: PlatformType;
  aspect: string;
  fit: MediaFit;
  crop: CropCoordinates;
  trimStartMs?: number;
  trimEndMs?: number;
}

export interface StoryPart {
  index: number;
  startMs: number;
  endMs: number;
}

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MediaCheckStatus = 'pass' | 'warn' | 'fail';

export type MediaFixAction = 'crop' | 'trim' | 'replace' | 'split';

export interface MediaCheck {
  id: string;
  label: string;
  actual: string | number;
  limit: string | number;
  status: MediaCheckStatus;
  fixes: MediaFixAction[];
}

export interface MediaCheckResult {
  passed: boolean;
  checks: MediaCheck[];
}

export type PlatformExecutionStatus =
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'unknown_reconciliation'
  | 'reauth_required';

export interface ExecutionAttempt {
  attemptNumber: number;
  startedAt: string;
  completedAt?: string;
  status: PlatformExecutionStatus;
  safeErrorMessage?: string;
  rawErrorCode?: string;
  platformPostId?: string;
  workerId: string;
  platformUrl?: string;
}

export interface PlatformExecutionTarget {
  platform: PlatformType;
  status: PlatformExecutionStatus;
  progressPercent?: number;
  platformPostId?: string;
  platformUrl?: string;
  actionableError?: {
    message: string;
    canReconnect: boolean;
    canRetry: boolean;
  };
  attempts: ExecutionAttempt[];
}

export interface PostTarget {
  platform: PlatformType;
  variantId?: string;
  status?: PlatformExecutionStatus;
  scheduledAtUtc?: string;
  platformPostId?: string;
  platformUrl?: string;
}

export interface PostItem {
  id: string;
  profileId: ProfileId;
  type?: PostType;
  title: string;
  caption: string;
  platformCaptions?: Partial<Record<PlatformType, string>>;
  videoUrl: string;
  videoDuration: string;
  videoAspect: '9:16' | '16:9' | '1:1';
  thumbnailUrl: string;
  platforms: PlatformType[];
  status: PostStatus;
  plannedDate?: string;
  scheduledFor?: string;
  scheduledForUtc?: string;
  publishedAt?: string;
  createdAt: string;
  failureReason?: string;
  changeRequestComment?: string;
  author: string;
  driveFileId?: string;
  fileName?: string;
  fileSizeBytes?: number;
  fileSizeFormatted?: string;
  resolution?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  executionTargets?: Partial<Record<PlatformType, PlatformExecutionTarget>>;
  targets?: PostTarget[];
  mediaAsset?: MediaAsset;
  variants?: Partial<Record<PlatformType, MediaVariant>>;
  storyParts?: StoryPart[];
  cta?: CtaType;
  ctaClicks?: number;
  isImported?: boolean;
  platformMetrics?: Partial<Record<PlatformType, PlatformMetricData>>;
  storyPartMetrics?: StoryPartMetricData[];
  metrics?: {
    views: number;
    impressions: number;
    engagementRate: number;
    clicks: number;
    shares: number;
    comments: number;
  };
}

export type CtaType = 'none' | 'link' | 'book' | 'sign up' | 'other';

export interface PlatformMetricData {
  impressions?: number;
  reactions?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  clickRate?: number;
  reach?: number;
  views?: number;
  likes?: number;
  saves?: number;
  profileVisits?: number;
  linkClicks?: number;
  videoViews?: number;
  avgWatchTime?: number; // in seconds
  ctaClicks?: number;
}

export interface StoryPartMetricData {
  partIndex: number;
  title?: string;
  durationSeconds?: number;
  views?: number;
  reach?: number;
  impressions?: number;
  likes?: number;
  reactions?: number;
  comments?: number;
  shares?: number;
  ctaClicks?: number;
  saves?: number;
  avgWatchTime?: number;
}

export type Post = PostItem;

export interface UserSession {
  email: string;
  name: string;
  role: string;
}

export interface CreateDraftState {
  currentStep: 1 | 2 | 3 | 4;
  postType: PostType;
  selectedFile: {
    name: string;
    sizeFormatted: string;
    aspect: '9:16' | '16:9' | '1:1' | string;
    duration: string;
    videoUrl: string;
    thumbnailUrl: string;
    driveFileId?: string;
    resolution: string;
    kind?: 'image' | 'video';
    width?: number;
    height?: number;
    durationMs?: number;
    sizeBytes?: number;
    mime?: string;
  } | null;
  masterTitle: string;
  masterCaption: string;
  activeCaptionTab: 'master' | PlatformType;
  platformOverrides: Partial<Record<PlatformType, string>>;
  activePreviewPlatform: PlatformType;
  selectedPlatforms: PlatformType[];
  variants?: Partial<Record<PlatformType, MediaVariant>>;
  storyPlan?: {
    segmentLengthSeconds: number;
    parts: StoryPart[];
    isBlocked?: boolean;
    blockMessage?: string;
  };
  cta?: CtaType;
  scheduleMode?: 'publish_now' | 'schedule';
  scheduledDate?: string;
  scheduledTime?: string;
  editingPostId?: string | null;
  prefilledRecommendation?: {
    id: string;
    kind: 'best_time' | 'format' | 'cta';
    headline: string;
    description?: string;
  } | null;
}

export interface MockDriveFile {
  id: string;
  name: string;
  folder: 'Drafts' | 'Approved' | 'Archive';
  profileId?: ProfileId;
  videoUrl: string;
  thumbnailUrl: string;
  aspect: '9:16' | '16:9' | '1:1';
  duration: string;
  durationSeconds?: number;
  sizeFormatted: string;
  sizeBytes?: number;
  resolution: string;
  mime?: string;
  kind?: 'image' | 'video';
  suggestedTitle: string;
  suggestedCaption: string;
}

export interface ChatToolCall {
  toolName: string;
  inputs: Record<string, unknown>;
  result: unknown;
  isExpanded?: boolean;
}

export interface PendingConfirmationAction {
  profile: ProfileId;
  profileSourceNote?: string;
  platforms: PlatformType[];
  scheduledTime: string;
  postId: string;
  title: string;
  actionType: 'schedule' | 'publish_now' | 'cancel' | 'reschedule';
  resolved?: 'approved' | 'cancelled';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'clawed';
  text: string;
  timestamp: string;
  profileId: ProfileId;
  toolCall?: ChatToolCall;
  pendingConfirmation?: PendingConfirmationAction;
  isRefusal?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

export interface AuditLogEntry {
  id: string;
  who: string;
  what: string;
  when: string;
  profile: ProfileId;
  postTitle?: string;
  platform?: PlatformType | 'all';
  status: 'success' | 'warning' | 'danger';
}

export interface SystemFeatureFlag {
  id: string;
  name: string;
  description: string;
  platform: PlatformType | 'clawed' | 'transcoder';
  enabled: boolean;
}
