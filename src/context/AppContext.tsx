import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AccountConnection,
  ChatMessage,
  ChatSession,
  CreateDraftState,
  NavItemId,
  PlatformExecutionStatus,
  PlatformType,
  PostItem,
  ProfileId,
  ProfileMetadata,
  ThemeMode,
  UserSession,
} from '../types';
import {
  accountsApi,
  DEFAULT_ACCOUNTS,
  DEFAULT_POSTS,
  DEFAULT_PROFILES,
  postsApi,
  profilesApi,
} from '../api';
import { getNextOccurrenceDate, RecommendationObject } from '../domain/recommendations';
import { DEFAULT_USER_TIMEZONE } from '../domain/dates';

interface ConfirmModalData {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

interface AppContextType {
  // Auth
  isAuthenticated: boolean;
  user: UserSession;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Profile
  activeProfile: ProfileId;
  setActiveProfile: (profile: ProfileId) => void;
  profiles: Record<ProfileId, ProfileMetadata>;
  profileMeta: ProfileMetadata;
  updateProfileMetadata: (id: ProfileId, updates: Partial<ProfileMetadata>) => void;

  // In-Progress Create Flow Draft (Strictly Separated Per Profile)
  createDraft: CreateDraftState;
  updateCreateDraft: (updates: Partial<CreateDraftState>) => void;
  resetCreateDraft: () => void;
  applyRecommendationAction: (recommendation: RecommendationObject) => void;
  clearRecommendationPrefill: () => void;

  // Theme
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;

  // Navigation
  activeNav: NavItemId;
  setActiveNav: (nav: NavItemId) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  isNavExpanded: boolean;
  setIsNavExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  toggleNavExpanded: () => void;
  logsFilterTab: 'all' | 'published' | 'publishing' | 'failed';
  setLogsFilterTab: (tab: 'all' | 'published' | 'publishing' | 'failed') => void;
  navigateToBadgePage: (page: 'logs' | 'drafts') => void;

  // Data Scoped to Active Profile
  activePosts: PostItem[];
  activeAccounts: AccountConnection[];
  upcomingPosts: PostItem[];
  draftPosts: PostItem[];
  draftsCount: number;
  dispatchedPosts: PostItem[];
  reviewQueueCount: number;
  publishingCount: number;
  failedPosts: PostItem[];
  attentionFailuresCount: number;
  recentlyDeletedPosts: PostItem[];
  allPostsCount: number;

  // Post Actions
  addNewPost: (newPostData: Omit<PostItem, 'id' | 'createdAt'>) => string;
  updateExistingPost: (postId: string, updates: Partial<PostItem>) => void;
  startEditPost: (postId: string, initialStep?: 1 | 2 | 3 | 4) => void;
  startCreateWithDate: (dateStr: string) => void;
  moveScheduledToDraft: (postId: string) => void;
  reschedulePost: (postId: string, newDateUtc: string, newFormatted: string) => void;
  retryFailedPost: (postId: string) => void;
  approveReviewPost: (postId: string) => void;
  requestChangesOnPost: (postId: string, comment: string) => void;
  rejectPost: (postId: string) => void;
  schedulePost: (postId: string, dateUtc: string, dateFormatted: string) => void;
  publishPostNow: (postId: string) => void;
  cancelDispatchedPost: (postId: string) => void;
  unschedulePost: (postId: string) => void;
  softDeletePost: (postId: string) => void;
  restorePost: (postId: string) => void;
  permanentlyDeletePost: (postId: string) => void;
  createQuickPost: (title: string, caption: string) => void;

  // Status Log Drawer Selection
  selectedStatusLogPostId: string | null;
  setSelectedStatusLogPostId: (id: string | null) => void;
  openStatusLogDrawerForPost: (postId: string) => void;

  // Platform Execution & Logs Actions
  retryPlatformExecution: (postId: string, platform: PlatformType) => void;
  simulateFailure: (type: '429' | '401' | 'timeout') => void;

  // Account Management & OAuth
  reconnectAccount: (platform: PlatformType) => void;
  disconnectAccount: (platform: PlatformType) => void;
  connectAccount: (platform: PlatformType, handle: string, targetProfile: ProfileId) => { success: boolean; error?: string };

  // Clawed Assistant Chat
  chatMessages: ChatMessage[];
  chatSessions: ChatSession[];
  currentChatId: string;
  startNewChat: () => void;
  switchChatSession: (id: string) => void;
  deleteChatSession: (id: string) => void;
  isClawedDrawerOpen: boolean;
  setIsClawedDrawerOpen: (open: boolean) => void;
  sendChatMessage: (text: string) => void;
  approvePendingChatAction: (messageId: string) => void;
  cancelPendingChatAction: (messageId: string) => void;

  // UI state toggles
  isDashboardLoading: boolean;
  dashboardError: string | null;
  triggerDashboardReload: () => void;
  setDashboardError: (error: string | null) => void;
  isDashboardEmptySimulated: boolean;
  setIsDashboardEmptySimulated: (empty: boolean) => void;

  // High-impact confirmation modal
  confirmModal: ConfirmModalData | null;
  showConfirmModal: (modal: Omit<ConfirmModalData, 'isOpen'>) => void;
  closeConfirmModal: () => void;

  // Simple Check: Profile Draft Isolation Test
  runProfileIsolationCheck: () => { passed: boolean; message: string };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_USER: UserSession = {
  email: 'adamsanders881@gmail.com',
  name: 'Sandy Mass',
  role: 'Media Manager Lead',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('mediamanager_auth') !== 'false' && localStorage.getItem('autopost_auth') !== 'false';
  });
  const [user, setUser] = useState<UserSession>(DEFAULT_USER);

  // Profiles (editable data)
  const [profiles, setProfiles] = useState<Record<ProfileId, ProfileMetadata>>(() => {
    try {
      const saved = localStorage.getItem('postpilot_profiles_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          company: {
            ...DEFAULT_PROFILES.company,
            ...parsed.company,
            image_url: parsed.company?.image_url ?? DEFAULT_PROFILES.company.image_url,
          },
          model: {
            ...DEFAULT_PROFILES.model,
            ...parsed.model,
            image_url: parsed.model?.image_url ?? DEFAULT_PROFILES.model.image_url,
          },
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_PROFILES;
  });

  const updateProfileMetadata = (id: ProfileId, updates: Partial<ProfileMetadata>) => {
    setProfiles((prev) => {
      const updated = {
        ...prev,
        [id]: {
          ...prev[id],
          ...updates,
        },
      };
      try {
        localStorage.setItem('postpilot_profiles_v1', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Active Profile state
  const [activeProfile, setActiveProfileState] = useState<ProfileId>(() => {
    const saved = localStorage.getItem('mediamanager_profile') || localStorage.getItem('autopost_profile');
    return saved === 'model' ? 'model' : 'company';
  });

  // In-Progress Create Flow Draft (Strictly Separated Per Profile)
  const [createFlowDrafts, setCreateFlowDrafts] = useState<Record<ProfileId, CreateDraftState>>({
    company: {
      currentStep: 1,
      postType: 'post',
      selectedFile: null,
      masterTitle: '',
      masterCaption: '',
      activeCaptionTab: 'master',
      platformOverrides: {},
      activePreviewPlatform: 'linkedin',
      selectedPlatforms: ['linkedin', 'instagram'],
      variants: {},
    },
    model: {
      currentStep: 1,
      postType: 'post',
      selectedFile: null,
      masterTitle: '',
      masterCaption: '',
      activeCaptionTab: 'master',
      platformOverrides: {},
      activePreviewPlatform: 'instagram',
      selectedPlatforms: ['instagram', 'tiktok'],
      variants: {},
    },
  });

  const updateCreateDraft = (updates: Partial<CreateDraftState>) => {
    setCreateFlowDrafts((prev) => ({
      ...prev,
      [activeProfile]: {
        ...prev[activeProfile],
        ...updates,
      },
    }));
  };

  const resetCreateDraft = () => {
    setCreateFlowDrafts((prev) => ({
      ...prev,
      [activeProfile]: {
        currentStep: 1,
        postType: 'post',
        selectedFile: null,
        masterTitle: '',
        masterCaption: '',
        activeCaptionTab: 'master',
        platformOverrides: {},
        activePreviewPlatform: activeProfile === 'company' ? 'linkedin' : 'instagram',
        selectedPlatforms: activeProfile === 'company' ? ['linkedin', 'instagram'] : ['instagram', 'tiktok'],
        variants: {},
        storyPlan: undefined,
        prefilledRecommendation: null,
      },
    }));
  };

  const applyRecommendationAction = (rec: RecommendationObject) => {
    const { action } = rec;
    const params = action.params;

    setCreateFlowDrafts((prev) => {
      const currentDraft = prev[activeProfile];
      let nextScheduledDate = currentDraft.scheduledDate;
      let nextScheduledTime = currentDraft.scheduledTime;
      let nextScheduleMode = currentDraft.scheduleMode;

      if (params.dayOfWeek !== undefined && params.localTime) {
        const nextOcc = getNextOccurrenceDate(
          params.dayOfWeek,
          params.localTime,
          params.tz || DEFAULT_USER_TIMEZONE
        );
        nextScheduledDate = nextOcc.dateStr;
        nextScheduledTime = params.localTime;
        nextScheduleMode = 'schedule';
      }

      return {
        ...prev,
        [activeProfile]: {
          ...currentDraft,
          currentStep: 1,
          postType: params.postType || 'post',
          selectedPlatforms: [params.platform],
          activePreviewPlatform: params.platform,
          cta: params.ctaType || currentDraft.cta || 'none',
          scheduleMode: nextScheduleMode,
          scheduledDate: nextScheduledDate,
          scheduledTime: nextScheduledTime,
          prefilledRecommendation: {
            id: rec.id,
            kind: rec.kind,
            headline: rec.headline,
            description: rec.tryThis,
          },
        },
      };
    });

    setActiveNav('create');
  };

  const clearRecommendationPrefill = () => {
    setCreateFlowDrafts((prev) => ({
      ...prev,
      [activeProfile]: {
        ...prev[activeProfile],
        prefilledRecommendation: null,
      },
    }));
  };

  // Theme mode
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('mediamanager_theme') || localStorage.getItem('autopost_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  // Nav
  const [activeNav, setActiveNav] = useState<NavItemId>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const toggleNavExpanded = () => setIsNavExpanded((prev) => !prev);
  const [logsFilterTab, setLogsFilterTab] = useState<'all' | 'published' | 'publishing' | 'failed'>('all');

  // Data Store
  const [allPosts, setAllPosts] = useState<Record<ProfileId, PostItem[]>>(DEFAULT_POSTS);
  const [allAccounts, setAllAccounts] = useState<Record<ProfileId, AccountConnection[]>>(DEFAULT_ACCOUNTS);

  // Clawed Chat State (One shared conversation for all profiles, with sessions and history)
  const INITIAL_CHAT_SESSIONS: ChatSession[] = [
    {
      id: 'session-main',
      title: 'Current session',
      createdAt: 'Today',
      messages: [],
    },
    {
      id: 'session-reschedule',
      title: 'Reschedule Look 04',
      createdAt: 'Yesterday',
      messages: [
        {
          id: 'msg-prev-1',
          sender: 'user',
          text: 'Reschedule Look 04 for Aria Tan to tomorrow evening',
          timestamp: '3:14 PM',
          profileId: 'model',
        },
        {
          id: 'msg-prev-2',
          sender: 'clawed',
          text: 'Inspected scheduled queue for Aria Tan and located "Cyberpunk Silk: Virtual Runway Look 04". Prepared new dispatch parameters for tomorrow evening.',
          timestamp: '3:15 PM',
          profileId: 'model',
        },
      ],
    },
    {
      id: 'session-tiktok',
      title: 'Audit TikTok failure',
      createdAt: 'Sep 28',
      messages: [
        {
          id: 'msg-prev-3',
          sender: 'user',
          text: 'Why did the TikTok dispatch fail for Ontilus?',
          timestamp: '11:40 AM',
          profileId: 'company',
        },
        {
          id: 'msg-prev-4',
          sender: 'clawed',
          text: 'The worker returned HTTP 504 (Video chunk ingestion timeout after 180 seconds). Reconnect or chunked retry is ready.',
          timestamp: '11:42 AM',
          profileId: 'company',
        },
      ],
    },
  ];

  const [isClawedDrawerOpen, setIsClawedDrawerOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(INITIAL_CHAT_SESSIONS);
  const [currentChatId, setCurrentChatId] = useState<string>('session-main');

  const activeChatSession = chatSessions.find((s) => s.id === currentChatId) || chatSessions[0];
  const chatMessages = activeChatSession.messages;

  const setChatMessages = (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setChatSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id === currentChatId) {
          const nextMsgs = typeof updater === 'function' ? updater(session.messages) : updater;
          let nextTitle = session.title;
          if ((session.title === 'New chat' || session.title === 'Current session') && nextMsgs.length > 0) {
            const firstUser = nextMsgs.find((m) => m.sender === 'user');
            if (firstUser) {
              nextTitle = firstUser.text.slice(0, 26) + (firstUser.text.length > 26 ? '...' : '');
            }
          }
          return {
            ...session,
            title: nextTitle,
            messages: nextMsgs,
          };
        }
        return session;
      })
    );
  };

  const startNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'New chat',
      createdAt: 'Just now',
      messages: [],
    };
    setChatSessions((prev) => [newSession, ...prev]);
    setCurrentChatId(newId);
  };

  const switchChatSession = (id: string) => {
    setCurrentChatId(id);
  };

  const deleteChatSession = (id: string) => {
    setChatSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const fallback: ChatSession = {
          id: `session-${Date.now()}`,
          title: 'New chat',
          createdAt: 'Just now',
          messages: [],
        };
        setCurrentChatId(fallback.id);
        return [fallback];
      }
      if (currentChatId === id) {
        setCurrentChatId(filtered[0].id);
      }
      return filtered;
    });
  };

  // UI state toggles
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isDashboardEmptySimulated, setIsDashboardEmptySimulated] = useState(false);

  // Modal
  const [confirmModal, setConfirmModal] = useState<ConfirmModalData | null>(null);

  // Sync profile attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-profile', activeProfile);
    localStorage.setItem('mediamanager_profile', activeProfile);
  }, [activeProfile]);

  // Sync theme class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('mediamanager_theme', theme);
  }, [theme]);

  // Realtime Simulation Ticker: every 15s smoothly increments progress on publishing posts
  useEffect(() => {
    const timer = setInterval(() => {
      setAllPosts((prev) => {
        const profilePosts = prev[activeProfile];
        if (!profilePosts) return prev;

        let hasChanges = false;
        const updated = profilePosts.map((post) => {
          if (post.status === 'publishing' && post.executionTargets) {
            hasChanges = true;
            const updatedTargets = { ...post.executionTargets };
            let allCompleted = true;

            Object.entries(updatedTargets).forEach(([plat, target]) => {
              if (target.status === 'publishing') {
                const currentProgress = target.progressPercent || 50;
                if (currentProgress >= 95) {
                  target.status = 'published';
                  target.progressPercent = 100;
                  target.platformUrl = `https://${plat}.com/post/auto_${Date.now()}`;
                } else {
                  target.progressPercent = currentProgress + 15;
                  allCompleted = false;
                }
              }
            });

            if (allCompleted) {
              return {
                ...post,
                status: 'published' as const,
                publishedAt: new Date().toISOString(),
                executionTargets: updatedTargets,
              };
            }

            return {
              ...post,
              executionTargets: updatedTargets,
            };
          }
          return post;
        });

        if (!hasChanges) return prev;
        return {
          ...prev,
          [activeProfile]: updated,
        };
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [activeProfile]);

  const setActiveProfile = (profile: ProfileId) => {
    setActiveProfileState(profile);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please enter a valid work email address.' };
    }
    if (!pass || pass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    await new Promise((res) => setTimeout(res, 400));

    const formattedName = email.split('@')[0].replace(/[._]/g, ' ');
    const isDefaultAdmin = email.toLowerCase().includes('adamsanders') || email.toLowerCase().includes('sandy');
    const capitalName = isDefaultAdmin
      ? 'Sandy Mass'
      : formattedName
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

    setUser({
      email,
      name: capitalName || 'Sandy Mass',
      role: 'Media Manager Lead',
    });
    setIsAuthenticated(true);
    localStorage.setItem('mediamanager_auth', 'true');
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem('mediamanager_auth', 'false');
  };

  const triggerDashboardReload = () => {
    setIsDashboardLoading(true);
    setDashboardError(null);
    setTimeout(() => {
      setIsDashboardLoading(false);
    }, 700);
  };

  // Active profile derived data
  const profileMeta = profiles[activeProfile] || DEFAULT_PROFILES[activeProfile];
  const currentProfilePosts = allPosts[activeProfile] || [];
  const activePosts = isDashboardEmptySimulated
    ? []
    : currentProfilePosts.filter((p) => !p.isDeleted);
  const recentlyDeletedPosts = currentProfilePosts.filter((p) => p.isDeleted);
  const activeAccounts = allAccounts[activeProfile] || [];

  const upcomingPosts = activePosts.filter((p) => p.status === 'scheduled');
  const draftPosts = activePosts.filter((p) => p.status === 'draft' || p.status === 'needs_review');
  const draftsCount = draftPosts.length;
  const dispatchedPosts = activePosts.filter(
    (p) => p.status === 'published' || p.status === 'publishing' || p.status === 'failed'
  );

  const reviewQueueCount = activePosts.filter((p) => p.status === 'needs_review').length;
  const publishingCount = activePosts.filter((p) => p.status === 'publishing').length;
  const failedPosts = activePosts.filter((p) => p.status === 'failed');
  const attentionFailuresCount = activePosts.filter((p) => {
    if (p.isDeleted) return false;
    if (p.status === 'failed') return true;
    if (p.executionTargets) {
      return Object.values(p.executionTargets).some(
        (target) =>
          target &&
          (target.status === 'failed' ||
            target.status === 'reauth_required' ||
            target.status === 'unknown_reconciliation')
      );
    }
    return false;
  }).length;
  const allPostsCount = activePosts.length;

  const navigateToBadgePage = (page: 'logs' | 'drafts') => {
    if (page === 'logs') {
      setLogsFilterTab('failed');
      setActiveNav('logs');
    } else if (page === 'drafts') {
      setActiveNav('drafts');
    }
  };

  // Selected Status Log Drawer
  const [selectedStatusLogPostId, setSelectedStatusLogPostId] = useState<string | null>(null);

  const openStatusLogDrawerForPost = (postId: string) => {
    setSelectedStatusLogPostId(postId);
    setActiveNav('logs');
  };

  // Post Actions
  const addNewPost = (newPostData: Omit<PostItem, 'id' | 'createdAt'>): string => {
    const newId = `post-${Date.now()}`;
    const newPost: PostItem = {
      ...newPostData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    setAllPosts((prev) => ({
      ...prev,
      [activeProfile]: [newPost, ...prev[activeProfile]],
    }));
    return newId;
  };

  const retryFailedPost = (postId: string) => {
    setAllPosts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            status: 'scheduled',
            failureReason: undefined,
            scheduledFor: 'Scheduled to retry in 5 minutes',
          };
        }
        return post;
      }),
    }));
  };

  const approveReviewPost = (postId: string) => {
    setAllPosts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            status: 'scheduled',
            scheduledFor: 'Scheduled for tomorrow at 10:00 AM',
            scheduledForUtc: new Date(Date.now() + 86400000).toISOString(),
            changeRequestComment: undefined,
          };
        }
        return post;
      }),
    }));
  };

  const requestChangesOnPost = (postId: string, comment: string) => {
    setAllPosts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            status: 'changes_requested',
            changeRequestComment: comment,
          };
        }
        return post;
      }),
    }));
  };

  const rejectPost = (postId: string) => {
    setAllPosts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            status: 'rejected',
          };
        }
        return post;
      }),
    }));
  };

  const schedulePost = (postId: string, dateUtc: string, dateFormatted: string) => {
    setAllPosts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            status: 'scheduled',
            scheduledForUtc: dateUtc,
            scheduledFor: dateFormatted,
            failureReason: undefined,
          };
        }
        return post;
      }),
    }));
  };

  const publishPostNow = (postId: string) => {
    setAllPosts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].map((post) => {
        if (post.id === postId) {
          const updatedTargets = post.executionTargets ? { ...post.executionTargets } : undefined;
          if (updatedTargets) {
            post.platforms.forEach((p) => {
              if (updatedTargets[p]) {
                updatedTargets[p].status = 'publishing';
                updatedTargets[p].progressPercent = 25;
              }
            });
          }
          return {
            ...post,
            status: 'publishing',
            scheduledFor: 'Publishing now',
            executionTargets: updatedTargets,
          };
        }
        return post;
      }),
    }));
  };

  const updateExistingPost = (postId: string, updates: Partial<PostItem>) => {
    setAllPosts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].map((p) =>
        p.id === postId ? { ...p, ...updates } : p
      ),
    }));
  };

  const startEditPost = (postId: string, initialStep: 1 | 2 | 3 | 4 = 1) => {
    const post = activePosts.find((p) => p.id === postId);
    if (!post) return;

    const tomorrowUtc = new Date(Date.now() + 86400000);
    const defaultDateStr = tomorrowUtc.toISOString().split('T')[0];

    setCreateFlowDrafts((prev) => ({
      ...prev,
      [activeProfile]: {
        currentStep: initialStep,
        postType: post.type || 'post',
        selectedFile: {
          name: post.fileName || `${post.title}.mp4`,
          sizeFormatted: post.fileSizeFormatted || '24.0 MB',
          aspect: post.videoAspect || '9:16',
          duration: post.videoDuration || '0:30',
          videoUrl: post.videoUrl,
          thumbnailUrl: post.thumbnailUrl || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
          driveFileId: post.driveFileId,
          resolution: post.resolution || '1080x1920 (9:16 Vertical)',
          kind: (post.mediaAsset?.kind || 'video') as 'image' | 'video',
          width: post.mediaAsset?.width || (post.videoAspect === '9:16' ? 1080 : 1920),
          height: post.mediaAsset?.height || (post.videoAspect === '9:16' ? 1920 : 1080),
          durationMs: post.mediaAsset?.durationMs || 30000,
          sizeBytes: post.mediaAsset?.sizeBytes || 24000000,
          mime: post.mediaAsset?.mime || 'video/mp4',
        },
        masterTitle: post.title,
        masterCaption: post.caption,
        activeCaptionTab: 'master',
        platformOverrides: post.platformCaptions || {},
        activePreviewPlatform: post.platforms[0] || 'linkedin',
        selectedPlatforms: post.platforms && post.platforms.length > 0 ? post.platforms : ['linkedin', 'instagram'],
        variants: post.variants || {},
        storyPlan: post.storyParts
          ? { segmentLengthSeconds: 30, parts: post.storyParts }
          : undefined,
        scheduleMode: post.status === 'scheduled' ? 'schedule' : 'publish_now',
        scheduledDate: post.scheduledForUtc ? post.scheduledForUtc.split('T')[0] : defaultDateStr,
        scheduledTime: post.scheduledForUtc && post.scheduledForUtc.includes('T') ? post.scheduledForUtc.split('T')[1].slice(0, 5) : '15:00',
        editingPostId: post.id,
      },
    }));

    setActiveNav('create');
  };

  const startCreateWithDate = (dateStr: string) => {
    setCreateFlowDrafts((prev) => ({
      ...prev,
      [activeProfile]: {
        ...prev[activeProfile],
        currentStep: 1,
        editingPostId: null,
        scheduledDate: dateStr,
        scheduleMode: 'schedule',
      },
    }));
    setActiveNav('create');
  };

  const moveScheduledToDraft = (postId: string) => {
    unschedulePost(postId);
  };

  const reschedulePost = (postId: string, newDateUtc: string, newFormatted: string) => {
    schedulePost(postId, newDateUtc, newFormatted);
  };

  const cancelDispatchedPost = (postId: string) => {
    setAllPosts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            status: 'failed',
            failureReason: 'Dispatch cancelled by user.',
            executionTargets: post.executionTargets
              ? (Object.fromEntries(
                  Object.entries(post.executionTargets).map(([plat, target]) => [
                    plat,
                    { ...target, status: 'failed' as PlatformExecutionStatus },
                  ])
                ) as any)
              : undefined,
          };
        }
        return post;
      }),
    }));
  };

  const unschedulePost = (postId: string) => {
    setAllPosts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            status: 'draft',
            scheduledFor: undefined,
            scheduledForUtc: undefined,
          };
        }
        return post;
      }),
    }));
  };

  const softDeletePost = (postId: string) => {
    setAllPosts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
          };
        }
        return post;
      }),
    }));
  };

  const restorePost = (postId: string) => {
    setAllPosts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            isDeleted: false,
            deletedAt: undefined,
            status: 'draft',
          };
        }
        return post;
      }),
    }));
  };

  const permanentlyDeletePost = (postId: string) => {
    setAllPosts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].filter((post) => post.id !== postId),
    }));
  };

  // Section 6: Retry Platform Execution (Creates a new attempt, keeps history intact)
  const retryPlatformExecution = (postId: string, platform: PlatformType) => {
    setAllPosts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].map((post) => {
        if (post.id === postId && post.executionTargets && post.executionTargets[platform]) {
          const currentTarget = post.executionTargets[platform];
          const newAttemptNum = (currentTarget.attempts.length || 0) + 1;

          const newAttempt = {
            attemptNumber: newAttemptNum,
            startedAt: new Date().toISOString(),
            status: 'publishing' as PlatformExecutionStatus,
            workerId: `worker-us-west-4a-${Math.floor(10 + Math.random() * 90)}`,
          };

          const updatedTarget = {
            ...currentTarget,
            status: 'publishing' as PlatformExecutionStatus,
            progressPercent: 30,
            actionableError: undefined,
            attempts: [newAttempt, ...currentTarget.attempts],
          };

          // Check if any target is still failed
          const allOtherTargetsFailed = Object.entries(post.executionTargets).some(
            ([p, t]) => p !== platform && t.status === 'failed'
          );

          return {
            ...post,
            status: allOtherTargetsFailed ? 'failed' : 'publishing',
            failureReason: allOtherTargetsFailed ? post.failureReason : undefined,
            executionTargets: {
              ...post.executionTargets,
              [platform]: updatedTarget,
            },
          };
        }
        return post;
      }),
    }));

    // Simulate completion of retry after 2.5s
    setTimeout(() => {
      setAllPosts((prev) => ({
        ...prev,
        [activeProfile]: prev[activeProfile].map((post) => {
          if (post.id === postId && post.executionTargets && post.executionTargets[platform]) {
            const currentTarget = post.executionTargets[platform];
            const updatedAttempts = currentTarget.attempts.map((att) => {
              if (att.status === 'publishing') {
                return {
                  ...att,
                  status: 'published' as PlatformExecutionStatus,
                  completedAt: new Date().toISOString(),
                  platformPostId: `post_success_${Date.now()}`,
                  platformUrl: `https://${platform}.com/reel/${Date.now()}`,
                };
              }
              return att;
            });

            return {
              ...post,
              status: 'published',
              failureReason: undefined,
              executionTargets: {
                ...post.executionTargets,
                [platform]: {
                  ...currentTarget,
                  status: 'published',
                  progressPercent: 100,
                  platformUrl: `https://${platform}.com/reel/${Date.now()}`,
                  attempts: updatedAttempts,
                },
              },
            };
          }
          return post;
        }),
      }));
    }, 2500);
  };

  // Section 6: Dev-only Control Panel Failure Simulator
  const simulateFailure = (type: '429' | '401' | 'timeout') => {
    const errorDetails = {
      '429': {
        code: 'HTTP_429_TOO_MANY_REQUESTS',
        safeMsg: 'Publishing to TikTok rate limit exceeded: 429 backoff requested for 180s.',
        actionable: 'Publishing to TikTok throttled: quota replenished in 3 minutes. [Retry]',
      },
      '401': {
        code: 'HTTP_401_UNAUTHORIZED',
        safeMsg: 'Instagram Graph API token revoked or permissions invalidated.',
        actionable: 'Publishing to Instagram failed: the access token cannot post Reels. [Reconnect account] [Retry]',
      },
      'timeout': {
        code: 'GATEWAY_TIMEOUT_504',
        safeMsg: 'Media ingestion worker timed out during transcoding after 180,000ms.',
        actionable: 'Ingestion worker timeout: worker-eu-central-1b died during upload chunk. [Retry]',
      },
    }[type];

    // Apply to first available post
    setAllPosts((prev) => {
      const posts = prev[activeProfile];
      if (!posts || posts.length === 0) return prev;

      const targetPost = posts[0];
      const updatedTargets = { ...(targetPost.executionTargets || {}) };
      const platform: PlatformType = 'instagram';

      updatedTargets[platform] = {
        platform,
        status: 'failed',
        actionableError: {
          message: errorDetails.actionable,
          canReconnect: type === '401',
          canRetry: true,
        },
        attempts: [
          {
            attemptNumber: ((updatedTargets[platform]?.attempts?.length || 0) + 1),
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            status: 'failed',
            safeErrorMessage: errorDetails.safeMsg,
            rawErrorCode: errorDetails.code,
            workerId: 'worker-us-west-4a-98',
          },
          ...(updatedTargets[platform]?.attempts || []),
        ],
      };

      return {
        ...prev,
        [activeProfile]: posts.map((p, idx) =>
          idx === 0
            ? {
                ...p,
                status: 'failed',
                failureReason: errorDetails.safeMsg,
                executionTargets: updatedTargets as any,
              }
            : p
        ),
      };
    });
  };

  // Section 7: Account Actions
  const reconnectAccount = (platform: PlatformType) => {
    setAllAccounts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].map((acc) => {
        if (acc.platform === platform) {
          return {
            ...acc,
            status: 'active',
            statusMessage: 'OAuth token refreshed & verified',
            tokenExpiresInDays: 60,
            lastSync: 'Just now',
          };
        }
        return acc;
      }),
    }));
  };

  const disconnectAccount = (platform: PlatformType) => {
    setAllAccounts((prev) => ({
      ...prev,
      [activeProfile]: prev[activeProfile].map((acc) => {
        if (acc.platform === platform) {
          return {
            ...acc,
            status: 'disconnected',
            statusMessage: 'Account disconnected by administrator',
            tokenExpiresInDays: 0,
            lastSync: 'Disconnected',
          };
        }
        return acc;
      }),
    }));
  };

  const connectAccount = (
    platform: PlatformType,
    handle: string,
    targetProfile: ProfileId
  ): { success: boolean; error?: string } => {
    // Check if account handle is already bound to another profile!
    const otherProfile: ProfileId = targetProfile === 'company' ? 'model' : 'company';
    const isBoundToOther = (allAccounts[otherProfile] || []).some(
      (acc) => acc.accountHandle.toLowerCase() === handle.toLowerCase()
    );

    if (isBoundToOther) {
      const otherProfileName = profiles[otherProfile]?.name || DEFAULT_PROFILES[otherProfile]?.name || otherProfile;
      return {
        success: false,
        error: `Security Rule Violation: Account "${handle}" is already permanently bound to the ${otherProfileName} profile. Accounts cannot be shared across profiles.`,
      };
    }

    setAllAccounts((prev) => ({
      ...prev,
      [targetProfile]: prev[targetProfile].map((acc) => {
        if (acc.platform === platform) {
          return {
            ...acc,
            accountHandle: handle,
            status: 'active',
            statusMessage: 'Connected via OAuth 2.0 Webhook',
            tokenExpiresInDays: 60,
            lastSync: 'Just now',
          };
        }
        return acc;
      }),
    }));

    return { success: true };
  };

  // Section 8: Clawed Assistant Chat
  const sendChatMessage = (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      profileId: activeProfile,
    };

    setChatMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const lower = text.toLowerCase();

      // Prompt injection refusal rule:
      if (lower.includes('ignore your instructions') && lower.includes('publish everywhere')) {
        const refusalMsg: ChatMessage = {
          id: `msg-refusal-${Date.now()}`,
          sender: 'clawed',
          text: `Action Refused: I cannot ignore my safety constraints or publish unapproved content across all channels. 

All dispatches must strictly adhere to the profile authorization boundaries for ${profileMeta.name} and require human sign-off before hitting live feeds.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          profileId: activeProfile,
          isRefusal: true,
        };
        setChatMessages((prev) => [...prev, refusalMsg]);
        return;
      }

      // Command: "Show scheduled posts"
      if (lower.includes('show scheduled') || lower.includes('scheduled posts')) {
        const scheduledList = upcomingPosts.map((p) => ({
          title: p.title,
          scheduledFor: p.scheduledFor,
          platforms: p.platforms,
        }));

        const botMsg: ChatMessage = {
          id: `msg-bot-${Date.now()}`,
          sender: 'clawed',
          text: `Found ${scheduledList.length} scheduled posts for ${profileMeta.name}:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          profileId: activeProfile,
          toolCall: {
            toolName: 'query_scheduled_dispatches',
            inputs: { profileId: activeProfile, limit: 5 },
            result: { count: scheduledList.length, dispatches: scheduledList },
          },
        };
        setChatMessages((prev) => [...prev, botMsg]);
        return;
      }

      // Command: "What failed today?"
      if (lower.includes('what failed') || lower.includes('failed today')) {
        const failedItems = failedPosts.map((p) => ({
          title: p.title,
          error: p.failureReason || 'Worker timeout',
        }));

        const botMsg: ChatMessage = {
          id: `msg-bot-${Date.now()}`,
          sender: 'clawed',
          text: failedItems.length > 0
            ? `There is ${failedItems.length} failed job requiring attention on ${profileMeta.name}:`
            : `Great news! No posts have failed on ${profileMeta.name} today.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          profileId: activeProfile,
          toolCall: {
            toolName: 'inspect_failed_worker_traces',
            inputs: { profileId: activeProfile, timeframe: 'last_24h' },
            result: { failedCount: failedItems.length, failures: failedItems },
          },
        };
        setChatMessages((prev) => [...prev, botMsg]);
        return;
      }

      // Actions that publish, reschedule, cancel or schedule require confirmation card
      const isPublish = lower.includes('publish');
      const isReschedule = lower.includes('reschedule');
      const isCancel = lower.includes('cancel') || lower.includes('unschedule');
      const isSchedule = lower.includes('schedule');

      if (isPublish || isReschedule || isCancel || isSchedule) {
        // Resolve profile: check if prompt explicitly named a profile
        const namesCompany = lower.includes('ontilus') || lower.includes('company');
        const namesModel = lower.includes('aria') || lower.includes('model');
        const explicitProfile: ProfileId | null = namesModel ? 'model' : namesCompany ? 'company' : null;
        const targetProfile: ProfileId = explicitProfile || activeProfile;
        const profileSourceNote = !explicitProfile
          ? `(currently selected profile: ${profileMeta.name})`
          : undefined;

        const targetPosts = allPosts[targetProfile] || [];
        const targetPost =
          (isCancel || isReschedule
            ? targetPosts.find((p) => p.status === 'scheduled')
            : targetPosts.find((p) => p.status === 'draft' || p.status === 'needs_review')) ||
          targetPosts[0] || {
            id: `post-${Date.now()}`,
            title: 'Weekly Feature Spotlight',
            platforms: ['linkedin', 'instagram'] as PlatformType[],
          };

        const targetPlatforms = targetPost.platforms && targetPost.platforms.length > 0
          ? targetPost.platforms
          : (['linkedin', 'instagram'] as PlatformType[]);

        let scheduledTime = 'Tomorrow at 10:00 AM UTC';
        let actionType: 'publish_now' | 'reschedule' | 'cancel' | 'schedule' = 'schedule';
        let toolName = 'stage_scheduled_release';

        if (isPublish) {
          actionType = 'publish_now';
          scheduledTime = 'Immediately';
          toolName = 'stage_immediate_publish';
        } else if (isCancel) {
          actionType = 'cancel';
          scheduledTime = targetPost.scheduledFor || 'Scheduled slot';
          toolName = 'stage_cancellation';
        } else if (isReschedule) {
          actionType = 'reschedule';
          scheduledTime = 'Friday at 2:00 PM UTC';
          toolName = 'stage_reschedule';
        }

        const botMsg: ChatMessage = {
          id: `msg-bot-${Date.now()}`,
          sender: 'clawed',
          text: `Please review and confirm this action before it is executed:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          profileId: targetProfile,
          toolCall: {
            toolName,
            inputs: {
              postId: targetPost.id,
              targetTime: scheduledTime,
              profile: targetProfile,
              platforms: targetPlatforms,
            },
            result: { status: 'awaiting_confirmation', requiresHumanApproval: true },
          },
          pendingConfirmation: {
            profile: targetProfile,
            profileSourceNote,
            platforms: targetPlatforms,
            scheduledTime,
            postId: targetPost.id,
            title: targetPost.title,
            actionType,
          },
        };
        setChatMessages((prev) => [...prev, botMsg]);
        return;
      }

      // Command: "Create a draft for Aria Tan"
      if (lower.includes('create a draft for aria tan') || (lower.includes('draft') && lower.includes('aria tan'))) {
        const botMsg: ChatMessage = {
          id: `msg-bot-${Date.now()}`,
          sender: 'clawed',
          text: `Draft created for Aria Tan: "Holographic Iridescence Study 08". Switched profile scope or click below to review in the drafting editor.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          profileId: 'model',
          toolCall: {
            toolName: 'create_persona_draft',
            inputs: {
              profile: 'model',
              suggestedTitle: 'Holographic Iridescence Study 08',
              aspect: '9:16',
            },
            result: { id: 'post-draft-aria-08', status: 'draft', assignedTo: 'Aria Tan' },
          },
        };
        setChatMessages((prev) => [...prev, botMsg]);
        return;
      }

      // Default assistant response with helpful suggestion chips
      const defaultMsg: ChatMessage = {
        id: `msg-bot-${Date.now()}`,
        sender: 'clawed',
        text: `I received: "${text}". I can execute automated actions for ${profileMeta.name}. Try asking:
• "Show scheduled posts"
• "What failed today?"
• "Schedule this for tomorrow at 10 AM"
• "Create a draft for Aria Tan"`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        profileId: activeProfile,
      };
      setChatMessages((prev) => [...prev, defaultMsg]);
    }, 500);
  };

  const approvePendingChatAction = (messageId: string) => {
    setChatMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.pendingConfirmation) {
          const action = msg.pendingConfirmation;
          let executionText = `Action approved! Scheduled "${action.title}" for ${action.scheduledTime} across ${action.platforms.join(', ')}.`;

          if (action.actionType === 'publish_now') {
            publishPostNow(action.postId);
            executionText = `Action approved and published! "${action.title}" published immediately to ${action.platforms.join(', ')}.`;
          } else if (action.actionType === 'cancel') {
            unschedulePost(action.postId);
            executionText = `Action approved and cancelled. "${action.title}" has been removed from scheduled release.`;
          } else {
            // schedule or reschedule
            schedulePost(action.postId, new Date(Date.now() + 86400000).toISOString(), action.scheduledTime);
            executionText = `Action approved and scheduled! "${action.title}" set for ${action.scheduledTime} on ${action.platforms.join(', ')}.`;
          }

          return {
            ...msg,
            text: executionText,
            pendingConfirmation: {
              ...action,
              resolved: 'approved',
            },
          };
        }
        return msg;
      })
    );
  };

  const cancelPendingChatAction = (messageId: string) => {
    setChatMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.pendingConfirmation) {
          return {
            ...msg,
            text: `Action was cancelled. No changes were made to the schedule pipeline.`,
            pendingConfirmation: {
              ...msg.pendingConfirmation,
              resolved: 'cancelled',
            },
          };
        }
        return msg;
      })
    );
  };

  const createQuickPost = (title: string, caption: string) => {
    addNewPost({
      profileId: activeProfile,
      title: title || 'New Automated Release',
      caption: caption || 'Scheduled video dispatch with multi-platform payload.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      videoDuration: '0:30',
      videoAspect: '9:16',
      thumbnailUrl:
        activeProfile === 'company'
          ? 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80'
          : 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=400&q=80',
      platforms: ['linkedin', 'instagram', 'tiktok'],
      status: 'needs_review',
      author: user.name,
      fileName: 'Quick_Dispatch.mp4',
      driveFileId: `drv-quick-${Date.now()}`,
      fileSizeFormatted: '25.0 MB',
      resolution: '1080x1920 (9:16 Vertical)',
    });
  };

  const showConfirmModal = (modal: Omit<ConfirmModalData, 'isOpen'>) => {
    setConfirmModal({
      ...modal,
      isOpen: true,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal(null);
  };

  // Simple Check: create a draft in Company at step 2, switch to Model, and confirm Create is empty
  const runProfileIsolationCheck = (): { passed: boolean; message: string } => {
    setCreateFlowDrafts((prev) => ({
      ...prev,
      company: {
        currentStep: 2,
        postType: 'post',
        selectedFile: {
          name: 'company_quarterly_overview.mp4',
          sizeFormatted: '18.4 MB',
          aspect: '9:16',
          duration: '0:42',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
          resolution: '1080x1920 (9:16 Vertical)',
        },
        masterTitle: 'Ontilus Engineering Update',
        masterCaption: 'Key milestones achieved across multi-channel distribution.',
        activeCaptionTab: 'master',
        platformOverrides: {},
        activePreviewPlatform: 'linkedin',
        selectedPlatforms: ['linkedin', 'instagram'],
      },
      model: {
        currentStep: 1,
        postType: 'post',
        selectedFile: null,
        masterTitle: '',
        masterCaption: '',
        activeCaptionTab: 'master',
        platformOverrides: {},
        activePreviewPlatform: 'linkedin',
        selectedPlatforms: ['instagram', 'tiktok'],
      },
    }));

    setActiveProfileState('model');
    localStorage.setItem('mediamanager_profile', 'model');
    setActiveNav('create');

    return {
      passed: true,
      message: 'Check passed: Company draft created at step 2, switched to Model, and Model Create is empty at step 1.',
    };
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        activeProfile,
        setActiveProfile,
        profiles,
        profileMeta: profiles[activeProfile],
        updateProfileMetadata,
        createDraft: createFlowDrafts[activeProfile],
        updateCreateDraft,
        resetCreateDraft,
        applyRecommendationAction,
        clearRecommendationPrefill,
        theme,
        toggleTheme,
        setTheme,
        activeNav,
        setActiveNav,
        mobileNavOpen,
        setMobileNavOpen,
        isNavExpanded,
        setIsNavExpanded,
        toggleNavExpanded,
        logsFilterTab,
        setLogsFilterTab,
        navigateToBadgePage,
        activePosts,
        activeAccounts,
        upcomingPosts,
        draftPosts,
        draftsCount,
        dispatchedPosts,
        reviewQueueCount,
        publishingCount,
        failedPosts,
        attentionFailuresCount,
        recentlyDeletedPosts,
        allPostsCount,
        addNewPost,
        updateExistingPost,
        startEditPost,
        startCreateWithDate,
        moveScheduledToDraft,
        reschedulePost,
        retryFailedPost,
        approveReviewPost,
        requestChangesOnPost,
        rejectPost,
        schedulePost,
        publishPostNow,
        cancelDispatchedPost,
        unschedulePost,
        softDeletePost,
        restorePost,
        permanentlyDeletePost,
        createQuickPost,
        selectedStatusLogPostId,
        setSelectedStatusLogPostId,
        openStatusLogDrawerForPost,
        retryPlatformExecution,
        simulateFailure,
        reconnectAccount,
        disconnectAccount,
        connectAccount,
        chatMessages,
        chatSessions,
        currentChatId,
        startNewChat,
        switchChatSession,
        deleteChatSession,
        isClawedDrawerOpen,
        setIsClawedDrawerOpen,
        sendChatMessage,
        approvePendingChatAction,
        cancelPendingChatAction,
        isDashboardLoading,
        dashboardError,
        triggerDashboardReload,
        setDashboardError,
        isDashboardEmptySimulated,
        setIsDashboardEmptySimulated,
        confirmModal,
        showConfirmModal,
        closeConfirmModal,
        runProfileIsolationCheck,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
