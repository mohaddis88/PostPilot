import React, { useState, useEffect, useRef } from 'react';
import {
  ListRestart,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  BarChart3,
  Edit3,
  Server,
  StopCircle,
  Key,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { StatusPill } from '../common/StatusPill';
import { PlatformType, PostItem } from '../../types';

export const PublishingLogsView: React.FC = () => {
  const {
    profileMeta,
    dispatchedPosts,
    selectedStatusLogPostId,
    setSelectedStatusLogPostId,
    retryPlatformExecution,
    cancelDispatchedPost,
    startEditPost,
    setActiveNav,
    showConfirmModal,
    logsFilterTab,
    setLogsFilterTab,
  } = useApp();

  // Filter tabs: 'all' | 'published' | 'publishing' | 'failed'
  const activeTab = logsFilterTab;
  const setActiveTab = setLogsFilterTab;
  const [showAllRows, setShowAllRows] = useState(false);

  // In-place expanded row (only one open at a time)
  const [expandedPostId, setExpandedPostId] = useState<string | null>(selectedStatusLogPostId);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Sync if opened externally (from Dashboard or Clawed), scroll to row and expand
  useEffect(() => {
    if (selectedStatusLogPostId) {
      setExpandedPostId(selectedStatusLogPostId);

      const targetIndex = dispatchedPosts.findIndex((p) => p.id === selectedStatusLogPostId);
      if (targetIndex >= 5) {
        setShowAllRows(true);
      }

      const timer = setTimeout(() => {
        const el = rowRefs.current[selectedStatusLogPostId];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [selectedStatusLogPostId, dispatchedPosts]);

  const toggleRow = (postId: string) => {
    setExpandedPostId((current) => {
      const next = current === postId ? null : postId;
      if (next === null && selectedStatusLogPostId === postId) {
        setSelectedStatusLogPostId(null);
      }
      return next;
    });
  };

  const filteredPosts = dispatchedPosts.filter((post) => {
    if (activeTab === 'published') return post.status === 'published';
    if (activeTab === 'publishing') return post.status === 'publishing';
    if (activeTab === 'failed') return post.status === 'failed';
    return true; // 'all'
  });

  const visiblePosts = showAllRows ? filteredPosts : filteredPosts.slice(0, 5);

  const renderPlatformPill = (platform: PlatformType) => {
    const names: Record<PlatformType, string> = {
      linkedin: 'LinkedIn',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      facebook: 'Facebook',
    };
    return (
      <span
        key={platform}
        className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: `var(--p-${platform})` }}
        />
        {names[platform] || platform}
      </span>
    );
  };

  const handleCancelDispatch = (post: PostItem) => {
    showConfirmModal({
      title: 'Cancel ongoing dispatch?',
      message: `The background worker transcode for "${post.title}" will be stopped immediately.`,
      confirmLabel: 'Cancel dispatch',
      isDestructive: true,
      onConfirm: () => {
        cancelDispatchedPost(post.id);
      },
    });
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* Sticky Header pinned directly to top bar with 0px gap */}
      <div
        className="sticky top-0 z-30 w-full bg-[var(--bg)] border-b border-[var(--border)] px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="max-w-[1440px] mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
              Status log
            </h1>
            <p className="text-xs text-[var(--muted)]">{profileMeta.name} live executions & background dispatches</p>
          </div>

          {/* 4 Tabs: All, Published, In progress, Failed */}
          <div className="flex items-center p-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs overflow-x-auto shrink-0 self-start sm:self-center">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                activeTab === 'all'
                  ? 'bg-[var(--bg)] text-[var(--text)] font-semibold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              All ({dispatchedPosts.length})
            </button>
            <button
              onClick={() => setActiveTab('published')}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                activeTab === 'published'
                  ? 'bg-[var(--bg)] text-[var(--status-success)] font-semibold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Published ({dispatchedPosts.filter((p) => p.status === 'published').length})
            </button>
            <button
              onClick={() => setActiveTab('publishing')}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                activeTab === 'publishing'
                  ? 'bg-[var(--bg)] text-[var(--accent-text)] font-semibold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              In progress ({dispatchedPosts.filter((p) => p.status === 'publishing').length})
            </button>
            <button
              onClick={() => setActiveTab('failed')}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                activeTab === 'failed'
                  ? 'bg-[var(--bg)] text-[var(--status-danger)] font-semibold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Failed ({dispatchedPosts.filter((p) => p.status === 'failed').length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Inner Wrapper: contains all page padding */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto w-full pb-16">
        {/* Main Table / Row List */}
        <GlassCard className="p-0 overflow-hidden">
          {filteredPosts.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ListRestart className="w-8 h-8 text-[var(--muted)] mx-auto opacity-50" />
              <p className="text-sm font-semibold text-[var(--text)]">No dispatched logs found</p>
              <p className="text-xs text-[var(--muted)]">
                {activeTab === 'all'
                  ? 'Dispatched, live, or failed posts will be recorded here.'
                  : `No posts with status "${activeTab}" found.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {visiblePosts.map((post) => {
                const isExpanded = expandedPostId === post.id;
                const hasFailure =
                  post.status === 'failed' ||
                  Object.values(post.executionTargets || {}).some((t) => t.status === 'failed');

                return (
                  <div
                    key={post.id}
                    ref={(el) => {
                      rowRefs.current[post.id] = el;
                    }}
                    className={`transition-colors duration-150 ${
                      isExpanded ? 'bg-[var(--surface)]/30' : ''
                    }`}
                  >
                    {/* Clickable Header Row: Enter/Space to toggle, aria-expanded */}
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`log-details-${post.id}`}
                      onClick={() => toggleRow(post.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleRow(post.id);
                        }
                      }}
                      className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-[var(--surface)]/60 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent-text)]"
                    >
                      {/* Left: Title + Platforms */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-[var(--text)] truncate">
                            {post.title}
                          </p>
                          {hasFailure && (
                            <span className="text-[10px] text-[var(--status-danger)] font-semibold flex items-center gap-1 shrink-0">
                              <AlertTriangle className="w-3 h-3" /> Error
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {post.platforms.map(renderPlatformPill)}
                        </div>
                      </div>

                      {/* Right: Status Pill + Time + Chevron */}
                      <div className="flex items-center gap-4 shrink-0 sm:self-center">
                        <StatusPill status={post.status} size="sm" />
                        <span className="text-xs text-[var(--muted)] font-mono whitespace-nowrap min-w-[110px] text-right">
                          {post.scheduledFor ||
                            (post.createdAt
                              ? new Date(post.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Recent')}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-[var(--muted)] transition-transform duration-200 motion-reduce:transition-none shrink-0 ${
                            isExpanded ? 'rotate-180 text-[var(--text)]' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                    </button>

                    {/* Inline Expanded Details (pushes rows down, no overlay) */}
                    {isExpanded && (
                      <div
                        id={`log-details-${post.id}`}
                        className="border-t border-[var(--border)] bg-[var(--surface)]/50 p-4 sm:p-6 transition-all duration-200 motion-reduce:transition-none"
                      >
                        {/* CASE 1: PUBLISHED */}
                        {post.status === 'published' && (
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[rgba(46,158,107,0.3)] bg-[rgba(46,158,107,0.06)]">
                              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--status-success)]">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>Published live • {post.scheduledFor || 'Sep 28, 2026, 2:00 PM UTC'}</span>
                              </div>
                              <a
                                href={post.videoUrl || 'https://linkedin.com'}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-text)] hover:underline"
                              >
                                <span>View live post on channel</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>

                            {/* Key Numbers */}
                            <div>
                              <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
                                Performance numbers
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
                                  <p className="text-[10px] text-[var(--muted)]">Total views</p>
                                  <p className="text-lg font-bold text-[var(--text)] mt-0.5">14.2K</p>
                                </div>
                                <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
                                  <p className="text-[10px] text-[var(--muted)]">Engagements</p>
                                  <p className="text-lg font-bold text-[var(--accent-text)] mt-0.5">1.4K</p>
                                </div>
                                <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
                                  <p className="text-[10px] text-[var(--muted)]">Watch time</p>
                                  <p className="text-lg font-bold text-[var(--text)] mt-0.5">38.4 hrs</p>
                                </div>
                                <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
                                  <p className="text-[10px] text-[var(--muted)]">Link CTR</p>
                                  <p className="text-lg font-bold text-[var(--status-success)] mt-0.5">4.8%</p>
                                </div>
                              </div>
                            </div>

                            <div className="pt-1 flex items-center justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveNav('statistics')}
                                leftIcon={<BarChart3 className="w-3.5 h-3.5 text-[var(--accent-text)]" />}
                                className="text-xs"
                              >
                                View statistics
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* CASE 2: IN PROGRESS */}
                        {post.status === 'publishing' && (
                          <div className="space-y-4">
                            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] space-y-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-[var(--text)] flex items-center gap-1.5">
                                  <Server className="w-4 h-4 text-[var(--accent-text)]" />
                                  <span>Worker streaming live...</span>
                                </span>
                                <span className="font-mono text-xs text-[var(--accent-text)] font-bold">78%</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
                                <div className="h-full bg-[var(--accent-fill)] transition-all duration-300 w-[78%]" />
                              </div>
                              <p className="text-xs text-[var(--muted)]">
                                Transcoding video chunks and streaming to {post.platforms.join(', ')}.
                              </p>
                            </div>

                            <div className="flex items-center justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelDispatch(post)}
                                leftIcon={<StopCircle className="w-3.5 h-3.5 text-[var(--status-danger)]" />}
                                className="text-xs text-[var(--status-danger)] hover:bg-[rgba(214,69,69,0.1)]"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* CASE 3: FAILED */}
                        {post.status === 'failed' && (
                          <div className="space-y-4">
                            {/* Plain-language cause + What to do next + Error Code */}
                            <div className="p-4 rounded-xl border border-[rgba(214,69,69,0.35)] bg-[rgba(214,69,69,0.08)] space-y-3 text-xs">
                              <div className="flex items-center gap-2 font-bold text-[var(--status-danger)]">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>Publishing failed</span>
                              </div>

                              <div className="space-y-1">
                                <p className="text-[11px] font-semibold text-[var(--muted)]">Cause:</p>
                                <p className="text-sm text-[var(--text)] leading-relaxed">
                                  {post.failureReason ||
                                    'The platform rejected this post because your account login expired or permissions changed.'}
                                </p>
                              </div>

                              <div className="space-y-1">
                                <p className="text-[11px] font-semibold text-[var(--muted)]">What to do next:</p>
                                <p className="text-sm text-[var(--text)] leading-relaxed">
                                  Reconnect the account in Accounts, or edit the video details in Create and try again.
                                </p>
                              </div>

                              <div className="pt-2 flex items-center justify-between text-xs font-mono text-[var(--muted)] border-t border-[rgba(214,69,69,0.2)]">
                                <span>Error Code:</span>
                                <span className="font-bold text-[var(--status-danger)]">ERR_CHANNEL_AUTH_REJECT_401</span>
                              </div>
                            </div>

                            {/* Attempt history */}
                            <div className="space-y-2">
                              <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                                Attempt history
                              </span>
                              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] space-y-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-[var(--text)]">Attempt #1</span>
                                  <StatusPill status="failed" size="sm" />
                                </div>
                                <p className="text-xs text-[var(--muted)]">Worker: worker-us-west-4a-98</p>
                                <p className="text-xs text-[var(--status-danger)] font-mono">
                                  HTTP 401: Unauthorized OAuth token
                                </p>
                              </div>
                            </div>

                            {/* Applicable buttons: Retry, Reconnect account, Edit post */}
                            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveNav('accounts')}
                                leftIcon={<Key className="w-3.5 h-3.5 text-[var(--accent-text)]" />}
                                className="text-xs"
                              >
                                Reconnect account
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditPost(post.id)}
                                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                                className="text-xs"
                              >
                                Edit post
                              </Button>
                              <Button
                                variant="accent"
                                size="sm"
                                onClick={() =>
                                  retryPlatformExecution(post.id, post.platforms[0] || 'linkedin')
                                }
                                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                                className="text-xs"
                              >
                                Retry
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {filteredPosts.length > 5 && (
            <div className="p-3 border-t border-[var(--border)] text-center bg-[var(--surface)]/40">
              <button
                type="button"
                onClick={() => setShowAllRows(!showAllRows)}
                className="text-xs font-semibold text-[var(--accent-text)] hover:underline cursor-pointer"
              >
                {showAllRows ? 'Show fewer' : `View all (${filteredPosts.length})`}
              </button>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
