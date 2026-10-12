import React, { useState } from 'react';
import {
  FileText,
  PlusCircle,
  Edit3,
  Calendar,
  Trash2,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { StatusPill } from '../common/StatusPill';
import { PlatformType, PostItem } from '../../types';

export const DraftsView: React.FC = () => {
  const {
    profileMeta,
    draftPosts,
    recentlyDeletedPosts,
    startEditPost,
    softDeletePost,
    restorePost,
    permanentlyDeletePost,
    setActiveNav,
    showConfirmModal,
  } = useApp();

  const [recentlyDeletedOpen, setRecentlyDeletedOpen] = useState(false);

  const renderPlatformBadge = (platform: PlatformType) => {
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

  const handleDeleteDraft = (post: PostItem) => {
    showConfirmModal({
      title: 'Move draft to trash?',
      message: `"${post.title}" will be moved to Recently deleted. You can restore it anytime.`,
      confirmLabel: 'Move to trash',
      isDestructive: true,
      onConfirm: () => softDeletePost(post.id),
    });
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* Sticky Header at top of content area */}
      <div
        className="sticky top-0 z-30 w-full bg-[var(--bg)] border-b border-[var(--border)] px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="max-w-[1440px] mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
              Drafts
            </h1>
            <p className="text-xs text-[var(--muted)]">{profileMeta.name} unpublished video projects</p>
          </div>

          <div className="flex items-center gap-2.5">
            {recentlyDeletedPosts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecentlyDeletedOpen(true)}
                leftIcon={<Trash2 className="w-3.5 h-3.5 text-[var(--muted)]" />}
              >
                Trash ({recentlyDeletedPosts.length})
              </Button>
            )}

            <Button
              variant="accent"
              size="sm"
              onClick={() => setActiveNav('create')}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Create post
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Inner Wrapper */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto w-full pb-16">
        {/* Main Drafts List */}
      {draftPosts.length === 0 ? (
        <GlassCard className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[var(--text)]">No drafts saved</h2>
            <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
              Drafts for {profileMeta.name} will appear here. Create a post and save it anytime to continue editing later.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="accent"
              size="sm"
              onClick={() => setActiveNav('create')}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Create post
            </Button>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {draftPosts.map((post) => (
            <GlassCard
              key={post.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[var(--accent-border-tint)] transition-all"
            >
              {/* Left: Thumbnail & Details */}
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-black overflow-hidden relative shrink-0 border border-[var(--border)]">
                  {post.thumbnailUrl ? (
                    <img
                      src={post.thumbnailUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--surface)] text-[var(--muted)]">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  {post.videoDuration && (
                    <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-white">
                      {post.videoDuration}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[var(--text)] truncate">
                      {post.title}
                    </h2>
                    <StatusPill status="draft" size="sm" />
                  </div>

                  <p className="text-xs text-[var(--muted)] line-clamp-1">
                    {post.caption || 'No caption entered'}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[var(--muted)]">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-[var(--accent-text)]" />
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently'}
                    </span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      {post.platforms.map(renderPlatformBadge)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Row Actions (Edit, Schedule, Delete) */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEditPost(post.id, 1)}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEditPost(post.id, 4)}
                  leftIcon={<Calendar className="w-3.5 h-3.5 text-[var(--accent-text)]" />}
                  className="text-xs"
                >
                  Schedule
                </Button>
                <button
                  type="button"
                  onClick={() => handleDeleteDraft(post)}
                  className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--status-danger)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                  title="Move to trash"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Recently Deleted Drawer Modal */}
      {recentlyDeletedOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[var(--status-danger)]" />
                <h3 className="text-base font-bold text-[var(--text)]">
                  Recently deleted ({recentlyDeletedPosts.length})
                </h3>
              </div>
              <button
                onClick={() => setRecentlyDeletedOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {recentlyDeletedPosts.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-6 text-center">
                Trash is empty.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {recentlyDeletedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[var(--text)] truncate">
                        {post.title}
                      </p>
                      <p className="text-[11px] text-[var(--muted)]">
                        Deleted {post.deletedAt ? new Date(post.deletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restorePost(post.id)}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        className="text-xs py-1"
                      >
                        Restore
                      </Button>
                      <button
                        onClick={() =>
                          showConfirmModal({
                            title: 'Permanently delete?',
                            message: `"${post.title}" will be permanently erased. This cannot be undone.`,
                            confirmLabel: 'Delete forever',
                            isDestructive: true,
                            onConfirm: () => permanentlyDeletePost(post.id),
                          })
                        }
                        className="p-1.5 text-[var(--muted)] hover:text-[var(--status-danger)] cursor-pointer"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecentlyDeletedOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
