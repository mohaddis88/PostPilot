import React, { useState, useEffect } from 'react';
import {
  Calendar,
  FileText,
  AlertTriangle,
  Share2,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { StatusPill } from '../common/StatusPill';
import { PlatformType } from '../../types';

export const DashboardView: React.FC = () => {
  const {
    profileMeta,
    upcomingPosts,
    draftsCount,
    failedPosts,
    activeAccounts,
    setActiveNav,
    openStatusLogDrawerForPost,
    isDashboardLoading,
    dashboardError,
    triggerDashboardReload,
    setDashboardError,
  } = useApp();

  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [profileMeta.image_url, profileMeta.id]);

  // Platform label renderer
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

  // Initials generator
  const initials = profileMeta.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Skeletons state renderer
  if (isDashboardLoading) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 animate-pulse">
        <div className="h-28 rounded-[20px] bg-[var(--surface)] border border-[var(--border)]" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-48 rounded-[20px] bg-[var(--surface)] border border-[var(--border)]"
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state renderer
  if (dashboardError) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8">
        <GlassCard className="p-8 text-center space-y-4 border-[rgba(214,69,69,0.3)]">
          <div className="w-12 h-12 rounded-full bg-[rgba(214,69,69,0.12)] text-[var(--status-danger)] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[var(--text)]">Dashboard data error</h2>
            <p className="text-xs text-[var(--muted)]">{dashboardError}</p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDashboardError(null)}
            >
              Dismiss
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={() => {
                setDashboardError(null);
                triggerDashboardReload();
              }}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Retry
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  const next5Posts = upcomingPosts.slice(0, 5);

  return (
    <div className="min-h-full flex flex-col">
      {/* Sticky Page Header */}
      <div
        className="sticky top-0 z-30 w-full bg-[var(--bg)] border-b border-[var(--border)] px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="max-w-[1440px] mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Dashboard</h1>
            <p className="text-xs text-[var(--muted)]">{profileMeta.name} overview & live channel activity</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              size="sm"
              onClick={() => setActiveNav('create')}
              leftIcon={<Share2 className="w-3.5 h-3.5" />}
            >
              Create post
            </Button>
          </div>
        </div>
      </div>

      {/* Page Content Inner Wrapper */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto w-full pb-16">
        {/* 1. Dashboard Profile Card */}
      <GlassCard className="p-5 sm:p-6 flex items-center gap-5">
        {/* 72px circle profile avatar with accent ring */}
        <div className="w-[72px] h-[72px] shrink-0 rounded-full ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--card)] overflow-hidden bg-black flex items-center justify-center p-0 m-0">
          {!imgError && (profileMeta.image_url || profileMeta.avatar) ? (
            <img
              src={profileMeta.image_url || profileMeta.avatar}
              alt={profileMeta.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover block"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-[var(--surface-hover)] flex items-center justify-center">
              <span className="text-xl font-bold text-[var(--accent-text)]">
                {initials}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-[var(--accent-text)] tracking-tight truncate">
            {profileMeta.name}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-0.5 truncate">
            {profileMeta.description}
          </p>
        </div>
      </GlassCard>

      {/* 2. Below: At Most 4 Cards (Upcoming, Approval queue, Failures, Accounts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Card 1: Upcoming */}
        <GlassCard className="p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--accent-text)]" />
              <h2 className="text-sm font-bold text-[var(--text)]">Upcoming</h2>
            </div>
            {upcomingPosts.length > 5 && (
              <button
                onClick={() => setActiveNav('schedule')}
                className="text-xs text-[var(--accent-text)] hover:underline font-semibold cursor-pointer"
              >
                View all ({upcomingPosts.length})
              </button>
            )}
          </div>

          {next5Posts.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-[var(--muted)]">No upcoming posts.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveNav('create')}
              >
                Create post
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {next5Posts.map((post) => (
                <div
                  key={post.id}
                  className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--text)] truncate">
                      {post.title}
                    </p>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">
                      {post.scheduledFor || 'Scheduled'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {post.platforms.map(renderPlatformBadge)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveNav('schedule')}
              className="w-full text-xs"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Open schedule
            </Button>
          </div>
        </GlassCard>

        {/* Card 2: Drafts */}
        <GlassCard className="p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--accent-text)]" />
              <h2 className="text-sm font-bold text-[var(--text)]">Drafts</h2>
            </div>
            <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]">
              {draftsCount} saved
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-3xl font-extrabold text-[var(--text)]">
              {draftsCount}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {draftsCount === 1 ? '1 draft post saved' : `${draftsCount} draft posts saved`}
            </p>
          </div>

          <div className="pt-1">
            <Button
              variant="accent"
              size="sm"
              onClick={() => setActiveNav('drafts')}
              className="w-full text-xs"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Open drafts
            </Button>
          </div>
        </GlassCard>

        {/* Card 3: Failures */}
        <GlassCard className="p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[var(--status-danger)]" />
              <h2 className="text-sm font-bold text-[var(--text)]">Failures</h2>
            </div>
            <StatusPill
              status={failedPosts.length > 0 ? 'failed' : 'published'}
              size="sm"
            />
          </div>

          {failedPosts.length === 0 ? (
            <div className="py-4 flex items-center gap-3 text-xs text-[var(--muted)]">
              <CheckCircle2 className="w-5 h-5 text-[var(--status-success)] shrink-0" />
              <span>No publishing failures.</span>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-[rgba(214,69,69,0.3)] bg-[rgba(214,69,69,0.06)] space-y-1 text-xs">
              <p className="font-semibold text-[var(--status-danger)]">
                {failedPosts.length === 1 ? '1 post failed to publish' : `${failedPosts.length} posts failed to publish`}
              </p>
              <p className="text-[11px] text-[var(--text)] line-clamp-2">
                {failedPosts[0].failureReason || 'A worker failure occurred during publishing.'}
              </p>
            </div>
          )}

          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveNav('logs')}
              className="w-full text-xs"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Inspect logs
            </Button>
          </div>
        </GlassCard>

        {/* Card 4: Accounts */}
        <GlassCard className="p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[var(--accent-text)]" />
              <h2 className="text-sm font-bold text-[var(--text)]">Accounts</h2>
            </div>
            <button
              onClick={() => setActiveNav('accounts')}
              className="text-xs text-[var(--accent-text)] hover:underline font-semibold cursor-pointer"
            >
              Manage
            </button>
          </div>

          <div className="space-y-2.5">
            {activeAccounts.slice(0, 3).map((acc) => (
              <div
                key={acc.platform}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold capitalize text-[var(--text)]">
                      {acc.platform}
                    </span>
                    {acc.isSimulated && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded border border-[var(--border)] text-[var(--muted)]">
                        Simulated
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--muted)] truncate">
                    {acc.accountHandle}
                  </p>
                </div>
                <StatusPill status={acc.status} size="sm" />
              </div>
            ))}
          </div>

          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveNav('accounts')}
              className="w-full text-xs"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View accounts
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  </div>
  );
};
