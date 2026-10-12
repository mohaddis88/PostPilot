import { ApiClient } from './types';
import { mockApiClient } from './mock';
import { httpApiClient } from './http';

export * from './types';

// Environment variable selects the API implementation mode (defaults to 'mock')
const apiMode = (import.meta.env.VITE_API_MODE || 'mock').toLowerCase();

export const api: ApiClient = apiMode === 'http' ? httpApiClient : mockApiClient;

export const postsApi = api.posts;
export const mediaApi = api.media;
export const calendarApi = api.calendar;
export const statsApi = api.stats;
export const recommendationsApi = api.recommendations;
export const accountsApi = api.accounts;
export const clawedApi = api.clawed;
export const profilesApi = api.profiles;

// Top-level API helper exports
export const validateMedia = (
  asset: Parameters<ApiClient['validateMedia']>[0],
  platform: Parameters<ApiClient['validateMedia']>[1],
  postType: Parameters<ApiClient['validateMedia']>[2],
  variant?: Parameters<ApiClient['validateMedia']>[3],
  storyParts?: Parameters<ApiClient['validateMedia']>[4]
) => api.validateMedia(asset, platform, postType, variant, storyParts);

export const createVariant = (variant: Parameters<ApiClient['createVariant']>[0]) =>
  api.createVariant(variant);

export const previewStoryPlan = (
  durationMs: number,
  maxPartMs: number,
  preferredMs?: number,
  minTailMs?: number
) => api.previewStoryPlan(durationMs, maxPartMs, preferredMs, minTailMs);

export const savePost = (postData: Parameters<ApiClient['savePost']>[0]) =>
  api.savePost(postData);

export const schedulePost = (postData: Parameters<ApiClient['schedulePost']>[0]) =>
  api.schedulePost(postData);

export const DEFAULT_PROFILES: Record<'company' | 'model', {
  id: 'company' | 'model';
  name: string;
  badge: string;
  description: string;
  image_url: string;
  avatar?: string;
  accountTypeLabel: string;
}> = {
  company: {
    id: 'company',
    name: 'Ontilus',
    badge: 'Company',
    description: 'Company channel',
    image_url: '/ontilus-profile.png',
    avatar: '/ontilus-profile.png',
    accountTypeLabel: 'Company Account',
  },
  model: {
    id: 'model',
    name: 'Aria Tan',
    badge: 'Model',
    description: 'AI presenter',
    image_url: '',
    avatar: '',
    accountTypeLabel: 'Model Account',
  },
};

export {
  INITIAL_POSTS as DEFAULT_POSTS,
  INITIAL_ACCOUNTS as DEFAULT_ACCOUNTS,
} from './mock/fixtures';


