import React, { useMemo } from 'react';
import {
  Calendar,
  Clock,
  Globe,
  CheckCircle2,
  AlertOctagon,
  ArrowLeft,
  FileText,
  Send,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '../common/Button';
import {
  MediaAsset,
  MediaVariant,
  PlatformType,
  PostType,
  ProfileMetadata,
  StoryPart,
} from '../../domain/types';
import { PLATFORM_SPECS } from '../../domain/specs';
import { combineDateTimeToUtc, formatInTimezone } from '../../domain/dates';
import { validateMediaAsset } from '../../domain/validation';

interface ScheduleStepProps {
  profileMeta: ProfileMetadata;
  postType: PostType;
  selectedPlatforms: PlatformType[];
  mediaAsset: MediaAsset;
  variants: Partial<Record<PlatformType, MediaVariant>>;
  storyParts?: StoryPart[];
  masterTitle: string;
  masterCaption: string;
  scheduleMode: 'publish_now' | 'schedule';
  setScheduleMode: (mode: 'publish_now' | 'schedule') => void;
  scheduledDate: string;
  setScheduledDate: (date: string) => void;
  scheduledTime: string;
  setScheduledTime: (time: string) => void;
  onNavigateBack: () => void;
  onGoToFixPlatform: (plat: PlatformType) => void;
  onSaveAsDraft: () => Promise<void>;
  onSchedulePost: () => Promise<void>;
  isSubmitting: boolean;
}

export const ScheduleStep: React.FC<ScheduleStepProps> = ({
  profileMeta,
  postType,
  selectedPlatforms,
  mediaAsset,
  variants,
  storyParts,
  masterTitle,
  masterCaption,
  scheduleMode,
  setScheduleMode,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
  onNavigateBack,
  onGoToFixPlatform,
  onSaveAsDraft,
  onSchedulePost,
  isSubmitting,
}) => {
  const targetTimeZone = 'Asia/Kuala_Lumpur';

  // Calculate UTC and past check
  const { scheduledUtcIso, isPastTime } = useMemo(() => {
    try {
      const utcIso = combineDateTimeToUtc(scheduledDate, scheduledTime, targetTimeZone);
      const scheduledEpoch = new Date(utcIso).getTime();
      const nowEpoch = Date.now();
      return {
        scheduledUtcIso: utcIso,
        isPastTime: scheduledEpoch <= nowEpoch,
      };
    } catch {
      return {
        scheduledUtcIso: new Date().toISOString(),
        isPastTime: false,
      };
    }
  }, [scheduledDate, scheduledTime]);

  // Validation Gatekeeper: Check all selected platforms
  const failingPlatforms = useMemo(() => {
    return selectedPlatforms
      .map((plat) => {
        const check = validateMediaAsset(
          mediaAsset,
          plat,
          postType,
          variants[plat],
          storyParts
        );
        return {
          platform: plat,
          spec: PLATFORM_SPECS[plat],
          passed: check.passed,
          failingChecks: check.checks.filter((c) => c.status === 'fail'),
        };
      })
      .filter((r) => !r.passed);
  }, [mediaAsset, selectedPlatforms, postType, variants, storyParts]);

  const hasFailingChecks = failingPlatforms.length > 0;
  const isScheduleBlocked = hasFailingChecks || (scheduleMode === 'schedule' && isPastTime);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 1. SCHEDULE MODE CHOICE */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Publishing Time
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label
            className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
              scheduleMode === 'publish_now'
                ? 'border-[var(--accent)] bg-[var(--surface-hover)]'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
            }`}
          >
            <input
              type="radio"
              name="schedule-mode"
              checked={scheduleMode === 'publish_now'}
              onChange={() => setScheduleMode('publish_now')}
              className="accent-[var(--accent)]"
            />
            <div>
              <div className="text-xs font-semibold text-[var(--text)]">Publish Immediately</div>
              <div className="text-[11px] text-[var(--muted)]">Dispatch to social queues right away</div>
            </div>
          </label>

          <label
            className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
              scheduleMode === 'schedule'
                ? 'border-[var(--accent)] bg-[var(--surface-hover)]'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
            }`}
          >
            <input
              type="radio"
              name="schedule-mode"
              checked={scheduleMode === 'schedule'}
              onChange={() => setScheduleMode('schedule')}
              className="accent-[var(--accent)]"
            />
            <div>
              <div className="text-xs font-semibold text-[var(--text)]">Schedule for Later</div>
              <div className="text-[11px] text-[var(--muted)]">Pick exact date and time</div>
            </div>
          </label>
        </div>

        {/* Date and Time Picker (if schedule mode) */}
        {scheduleMode === 'schedule' && (
          <div className="pt-2 border-t border-[var(--border)] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
                  Scheduled Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
                  Scheduled Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            </div>

            {/* Timezone & UTC Display */}
            <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[var(--text)]">
                <Globe className="w-4 h-4 text-[var(--muted)] shrink-0" />
                <span>
                  Local: <strong>{scheduledDate} at {scheduledTime}</strong> ({targetTimeZone})
                </span>
              </div>
              <span className="text-[var(--muted)] text-[11px] font-mono">
                UTC: {scheduledUtcIso.replace('T', ' ').slice(0, 16)} UTC
              </span>
            </div>

            {isPastTime && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                Scheduled time cannot be in the past. Please select a future time.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. SUMMARY CARD */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Summary Card
          </span>
          <span className="text-[11px] font-medium text-emerald-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> All metadata ready
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Profile */}
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-1">
            <span className="text-[11px] text-[var(--muted)]">Profile</span>
            <div className="flex items-center gap-2 font-semibold text-[var(--text)]">
              <span>{profileMeta.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--muted)]">
                {profileMeta.badge}
              </span>
            </div>
          </div>

          {/* Type & File */}
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-1">
            <span className="text-[11px] text-[var(--muted)]">Content Type & Asset</span>
            <div className="font-semibold text-[var(--text)] capitalize">
              {postType} · {mediaAsset.kind} ({mediaAsset.width}×{mediaAsset.height})
            </div>
          </div>

          {/* Platforms & Variants */}
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-1 sm:col-span-2">
            <span className="text-[11px] text-[var(--muted)]">Selected Platforms & Target Formats</span>
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedPlatforms.map((plat) => {
                const spec = PLATFORM_SPECS[plat];
                const variant = variants[plat];
                const fitLabel = variant?.fit === 'blur_fill' ? 'Blur fill' : variant?.fit === 'letterbox' ? 'Letterbox' : 'Crop';
                const aspectLabel = variant?.aspect || '9:16';

                return (
                  <div
                    key={plat}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--card)] text-[11px] font-medium text-[var(--text)]"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: `var(--p-${plat})` }}
                    />
                    <span>{spec.name}:</span>
                    <span className="text-[var(--muted)]">
                      {aspectLabel} ({fitLabel})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Story Parts count */}
          {postType === 'story' && mediaAsset.kind === 'video' && (
            <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-1 sm:col-span-2">
              <span className="text-[11px] text-[var(--muted)]">Story Parts Breakdown</span>
              <div className="font-semibold text-[var(--text)]">
                {storyParts?.length || 1} parts planned and posting in contiguous sequence
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. VALIDATION GATEKEEPER ALERT */}
      {hasFailingChecks && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-red-500">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            Scheduling is blocked by failing platform specifications
          </div>
          <div className="space-y-1.5 pl-6">
            {failingPlatforms.map((item) => (
              <div key={item.platform} className="flex items-center justify-between text-red-600 dark:text-red-400">
                <span>
                  <strong>{item.spec.name}:</strong>{' '}
                  {item.failingChecks.map((c) => `${c.label} (${c.actual} / limit ${c.limit})`).join(', ')}
                </span>
                <button
                  type="button"
                  onClick={() => onGoToFixPlatform(item.platform)}
                  className="underline font-semibold ml-2 hover:text-red-700 cursor-pointer"
                >
                  Fix in Step 2
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ACTION BUTTONS: Save Draft & Schedule */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onNavigateBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Caption
        </Button>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onSaveAsDraft}
            isLoading={isSubmitting}
            leftIcon={<FileText className="w-4 h-4 text-blue-500" />}
          >
            Save as Draft
          </Button>

          <Button
            type="button"
            variant="accent"
            size="md"
            disabled={isScheduleBlocked || isSubmitting}
            onClick={onSchedulePost}
            isLoading={isSubmitting}
            leftIcon={<Send className="w-4 h-4" />}
          >
            {scheduleMode === 'publish_now' ? 'Publish Now' : 'Schedule Post'}
          </Button>
        </div>
      </div>
    </div>
  );
};
