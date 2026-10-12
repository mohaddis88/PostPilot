import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  Folder,
  HardDrive,
  X,
  FileVideo,
  FileImage,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ContentStep } from './ContentStep';
import { PlatformFormatStep } from './PlatformFormatStep';
import { CaptionStep } from './CaptionStep';
import { ScheduleStep } from './ScheduleStep';
import {
  MediaAsset,
  MediaVariant,
  MockDriveFile,
  PlatformType,
  PostItem,
  PostType,
  StoryPart,
} from '../../domain/types';
import { api, mediaApi } from '../../api';
import { combineDateTimeToUtc, DEFAULT_USER_TIMEZONE } from '../../domain/dates';

export const CreatePostFlow: React.FC = () => {
  const {
    activeProfile,
    profileMeta,
    addNewPost,
    updateExistingPost,
    setActiveNav,
    createDraft,
    updateCreateDraft,
    resetCreateDraft,
    clearRecommendationPrefill,
  } = useApp();

  // Current step 1..4
  const currentStep = (createDraft.currentStep || 1) as 1 | 2 | 3 | 4;
  const postType: PostType = createDraft.postType || 'post';

  // State
  const selectedPlatforms = createDraft.selectedPlatforms || ['linkedin', 'instagram'];
  const masterTitle = createDraft.masterTitle || '';
  const masterCaption = createDraft.masterCaption || '';
  const platformOverrides = createDraft.platformOverrides || {};
  const activePreviewPlatform = createDraft.activePreviewPlatform || selectedPlatforms[0] || 'instagram';

  const tomorrowUtc = new Date(Date.now() + 86400000);
  const defaultDateStr = tomorrowUtc.toISOString().split('T')[0];
  const scheduleMode = createDraft.scheduleMode || 'schedule';
  const scheduledDate = createDraft.scheduledDate || defaultDateStr;
  const scheduledTime = createDraft.scheduledTime || '15:00';

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drive Picker Modal
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<MockDriveFile[]>([]);
  const [driveActiveFolder, setDriveActiveFolder] = useState<'Approved' | 'Drafts'>('Approved');

  useEffect(() => {
    mediaApi.listDriveFiles().then(setDriveFiles).catch(() => {});
  }, []);

  // Media Asset representation from createDraft.selectedFile
  const mediaAsset: MediaAsset | null = React.useMemo(() => {
    if (!createDraft.selectedFile) return null;
    const f = createDraft.selectedFile;
    const kind = f.kind || (f.name?.toLowerCase().endsWith('.png') || f.name?.toLowerCase().endsWith('.jpg') ? 'image' : 'video');
    const width = f.width || (f.aspect === '9:16' ? 1080 : 1920);
    const height = f.height || (f.aspect === '9:16' ? 1920 : 1080);
    const durationMs = f.durationMs || (kind === 'video' ? 30000 : undefined);
    const sizeBytes = f.sizeBytes || 24000000;
    const mime = f.mime || (kind === 'video' ? 'video/mp4' : 'image/jpeg');

    return {
      id: f.driveFileId || `asset-${Date.now()}`,
      kind,
      width,
      height,
      durationMs,
      sizeBytes,
      mime,
      name: f.name,
      url: f.videoUrl,
      thumbnailUrl: f.thumbnailUrl,
    };
  }, [createDraft.selectedFile]);

  // Set Media Asset helper
  const setMediaAsset = (asset: MediaAsset | null) => {
    if (!asset) {
      updateCreateDraft({ selectedFile: null });
      return;
    }
    const aspectStr = asset.width / asset.height < 0.8 ? '9:16' : asset.width / asset.height > 1.3 ? '16:9' : '1:1';
    const totalSec = Math.round((asset.durationMs || 30000) / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const durationStr = `${m}:${s.toString().padStart(2, '0')}`;

    updateCreateDraft({
      selectedFile: {
        name: asset.name || 'uploaded_media',
        sizeFormatted: `${(asset.sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
        aspect: aspectStr,
        duration: durationStr,
        videoUrl: asset.url || '',
        thumbnailUrl: asset.thumbnailUrl || '',
        driveFileId: asset.driveFileId,
        resolution: `${asset.width}x${asset.height}`,
        kind: asset.kind,
        width: asset.width,
        height: asset.height,
        durationMs: asset.durationMs,
        sizeBytes: asset.sizeBytes,
        mime: asset.mime,
      },
    });
  };

  // Per-platform variants
  const variants = createDraft.variants || {};
  const setVariants = (
    updater:
      | Partial<Record<PlatformType, MediaVariant>>
      | ((prev: Partial<Record<PlatformType, MediaVariant>>) => Partial<Record<PlatformType, MediaVariant>>)
  ) => {
    if (typeof updater === 'function') {
      updateCreateDraft({ variants: updater(createDraft.variants || {}) });
    } else {
      updateCreateDraft({ variants: updater });
    }
  };

  // Story parts plan
  const storyParts = createDraft.storyPlan?.parts;
  const setStoryParts = (parts: StoryPart[]) => {
    updateCreateDraft({
      storyPlan: {
        segmentLengthSeconds: 30,
        parts,
      },
    });
  };

  // Navigation handlers
  const handleSetStep = (step: 1 | 2 | 3 | 4) => {
    updateCreateDraft({ currentStep: step });
  };

  const handleSelectDriveFile = (file: MockDriveFile) => {
    const isImage = file.name.toLowerCase().endsWith('.png') || file.name.toLowerCase().endsWith('.jpg');
    const width = file.aspect === '9:16' ? 1080 : 1920;
    const height = file.aspect === '9:16' ? 1920 : 1080;
    const kind = isImage ? 'image' : 'video';

    updateCreateDraft({
      selectedFile: {
        name: file.name,
        sizeFormatted: file.sizeFormatted,
        aspect: file.aspect,
        duration: file.duration,
        videoUrl: file.videoUrl,
        thumbnailUrl: file.thumbnailUrl,
        driveFileId: file.id,
        resolution: file.resolution,
        kind,
        width,
        height,
        durationMs: kind === 'video' ? 30000 : undefined,
        sizeBytes: 25 * 1024 * 1024,
        mime: isImage ? 'image/jpeg' : 'video/mp4',
      },
      masterTitle: createDraft.masterTitle || file.suggestedTitle,
      masterCaption: createDraft.masterCaption || file.suggestedCaption,
    });

    setDrivePickerOpen(false);
  };

  // Save as Draft (calls api.savePost)
  const handleSaveAsDraft = async () => {
    if (!mediaAsset) return;
    setIsSubmitting(true);
    try {
      const postData: Partial<PostItem> = {
        id: createDraft.editingPostId || undefined,
        profileId: activeProfile,
        type: postType,
        title: masterTitle || mediaAsset.name || 'Untitled Draft',
        caption: masterCaption,
        platformCaptions: platformOverrides,
        videoUrl: mediaAsset.url || '',
        videoDuration: mediaAsset.durationMs ? `${Math.round(mediaAsset.durationMs / 1000)}s` : '0:30',
        videoAspect: mediaAsset.width / mediaAsset.height < 0.8 ? '9:16' : '16:9',
        thumbnailUrl: mediaAsset.thumbnailUrl || mediaAsset.url || '',
        platforms: selectedPlatforms,
        status: 'draft',
        author: profileMeta.name,
        fileName: mediaAsset.name,
        fileSizeBytes: mediaAsset.sizeBytes,
        fileSizeFormatted: `${(mediaAsset.sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
        resolution: `${mediaAsset.width}x${mediaAsset.height}`,
        mediaAsset,
        variants,
        storyParts,
        cta: createDraft.cta || 'none',
      };

      const saved = await api.savePost(postData);

      if (createDraft.editingPostId) {
        updateExistingPost(createDraft.editingPostId, saved);
      } else {
        addNewPost(saved);
      }

      resetCreateDraft();
      setActiveNav('drafts');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Schedule Post / Publish Now (calls api.schedulePost)
  const handleSchedulePost = async () => {
    if (!mediaAsset) return;
    setIsSubmitting(true);
    try {
      const isPublishNow = scheduleMode === 'publish_now';
      const postData: Partial<PostItem> = {
        id: createDraft.editingPostId || undefined,
        profileId: activeProfile,
        type: postType,
        title: masterTitle || mediaAsset.name || 'Untitled Post',
        caption: masterCaption,
        platformCaptions: platformOverrides,
        videoUrl: mediaAsset.url || '',
        videoDuration: mediaAsset.durationMs ? `${Math.round(mediaAsset.durationMs / 1000)}s` : '0:30',
        videoAspect: mediaAsset.width / mediaAsset.height < 0.8 ? '9:16' : '16:9',
        thumbnailUrl: mediaAsset.thumbnailUrl || mediaAsset.url || '',
        platforms: selectedPlatforms,
        status: isPublishNow ? 'published' : 'scheduled',
        author: profileMeta.name,
        fileName: mediaAsset.name,
        fileSizeBytes: mediaAsset.sizeBytes,
        fileSizeFormatted: `${(mediaAsset.sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
        resolution: `${mediaAsset.width}x${mediaAsset.height}`,
        plannedDate: isPublishNow ? 'Today' : `${scheduledDate} at ${scheduledTime}`,
        scheduledFor: isPublishNow ? 'Just now' : `${scheduledDate} at ${scheduledTime}`,
        scheduledForUtc: isPublishNow
          ? new Date().toISOString()
          : combineDateTimeToUtc(
              scheduledDate,
              scheduledTime,
              profileMeta.timezone || DEFAULT_USER_TIMEZONE
            ),
        publishedAt: isPublishNow ? 'Just now' : undefined,
        mediaAsset,
        variants,
        storyParts,
        cta: createDraft.cta || 'none',
      };

      const scheduled = await api.schedulePost(postData);

      if (createDraft.editingPostId) {
        updateExistingPost(createDraft.editingPostId, scheduled);
      } else {
        addNewPost(scheduled);
      }

      resetCreateDraft();
      setActiveNav(isPublishNow ? 'logs' : 'schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsConfig: { step: 1 | 2 | 3 | 4; label: string }[] = [
    { step: 1, label: 'Content' },
    { step: 2, label: 'Platforms & Format' },
    { step: 3, label: 'Caption' },
    { step: 4, label: 'Schedule' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Prefilled from Recommendation Banner */}
      {createDraft.prefilledRecommendation && (
        <div className="p-3.5 sm:p-4 rounded-2xl border border-[var(--accent-border-tint)] bg-[var(--surface)] flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-[var(--text)] min-w-0">
            <span className="p-1.5 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-[var(--accent-text)]">Prefilled from a recommendation</p>
              <p className="text-[var(--muted)] text-[11px] truncate">
                {createDraft.prefilledRecommendation.headline}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearRecommendationPrefill}
            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--surface-hover)] text-[var(--text)] hover:border-[var(--accent-border-tint)] transition-all cursor-pointer shrink-0 font-medium"
          >
            Clear
          </button>
        </div>
      )}

      {/* 4-Step Stepper Header */}
      <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2 flex-1">
          {stepsConfig.map((item, idx) => {
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            const isClickable = item.step <= currentStep || (item.step === 2 && !!mediaAsset);

            return (
              <React.Fragment key={item.step}>
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => handleSetStep(item.step)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[var(--surface-hover)] text-[var(--accent-text)] border border-[var(--border)] shadow-xs'
                      : isCompleted
                      ? 'text-[var(--text)] hover:bg-[var(--surface)] cursor-pointer'
                      : 'text-[var(--muted)] opacity-60 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                        : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]'
                    }`}
                  >
                    {isCompleted ? '✓' : item.step}
                  </span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>

                {idx < stepsConfig.length - 1 && (
                  <div className="w-4 sm:w-8 h-px bg-[var(--border)] shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="text-xs font-medium text-[var(--muted)] shrink-0 ml-2">
          Step {currentStep} of 4
        </div>
      </div>

      {/* STEP 1: CONTENT */}
      {currentStep === 1 && (
        <ContentStep
          postType={postType}
          setPostType={(t) => updateCreateDraft({ postType: t })}
          selectedPlatforms={selectedPlatforms}
          setSelectedPlatforms={(p) => updateCreateDraft({ selectedPlatforms: p })}
          mediaAsset={mediaAsset}
          setMediaAsset={setMediaAsset}
          variants={variants}
          storyParts={storyParts}
          onOpenDrivePicker={() => setDrivePickerOpen(true)}
          onNavigateToStep={handleSetStep}
          onSelectPlatformTab={(plat) => updateCreateDraft({ activePreviewPlatform: plat })}
          onProceedToStep2={() => handleSetStep(2)}
        />
      )}

      {/* STEP 2: PLATFORMS AND FORMAT */}
      {currentStep === 2 && mediaAsset && (
        <PlatformFormatStep
          postType={postType}
          selectedPlatforms={selectedPlatforms}
          mediaAsset={mediaAsset}
          variants={variants}
          setVariants={setVariants}
          storyParts={storyParts}
          setStoryParts={setStoryParts}
          activePlatformTab={activePreviewPlatform}
          setActivePlatformTab={(plat) => updateCreateDraft({ activePreviewPlatform: plat })}
          onNavigateBack={() => handleSetStep(1)}
          onProceedToCaption={() => handleSetStep(3)}
          onReplaceFile={() => handleSetStep(1)}
        />
      )}

      {/* STEP 3: CAPTION */}
      {currentStep === 3 && (
        <CaptionStep
          postType={postType}
          masterTitle={masterTitle}
          setMasterTitle={(t) => updateCreateDraft({ masterTitle: t })}
          masterCaption={masterCaption}
          setMasterCaption={(c) => updateCreateDraft({ masterCaption: c })}
          selectedPlatforms={selectedPlatforms}
          platformOverrides={platformOverrides}
          setPlatformOverrides={(updater) => {
            if (typeof updater === 'function') {
              updateCreateDraft({ platformOverrides: updater(createDraft.platformOverrides || {}) });
            } else {
              updateCreateDraft({ platformOverrides: updater });
            }
          }}
          cta={createDraft.cta || 'none'}
          onSelectCta={(c) => updateCreateDraft({ cta: c })}
          onNavigateBack={() => handleSetStep(2)}
          onProceedToSchedule={() => handleSetStep(4)}
        />
      )}

      {/* STEP 4: SCHEDULE */}
      {currentStep === 4 && mediaAsset && (
        <ScheduleStep
          profileMeta={profileMeta}
          postType={postType}
          selectedPlatforms={selectedPlatforms}
          mediaAsset={mediaAsset}
          variants={variants}
          storyParts={storyParts}
          masterTitle={masterTitle}
          masterCaption={masterCaption}
          scheduleMode={scheduleMode}
          setScheduleMode={(m) => updateCreateDraft({ scheduleMode: m })}
          scheduledDate={scheduledDate}
          setScheduledDate={(d) => updateCreateDraft({ scheduledDate: d })}
          scheduledTime={scheduledTime}
          setScheduledTime={(t) => updateCreateDraft({ scheduledTime: t })}
          onNavigateBack={() => handleSetStep(3)}
          onGoToFixPlatform={(plat) => {
            updateCreateDraft({ activePreviewPlatform: plat });
            handleSetStep(2);
          }}
          onSaveAsDraft={handleSaveAsDraft}
          onSchedulePost={handleSchedulePost}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Google Drive Picker Modal */}
      {drivePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-semibold text-[var(--text)]">Select Asset from Google Drive</h3>
              </div>
              <button
                type="button"
                onClick={() => setDrivePickerOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Folder Toggle */}
            <div className="px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDriveActiveFolder('Approved')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  driveActiveFolder === 'Approved'
                    ? 'bg-[var(--card)] text-[var(--text)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-amber-500" /> Approved
              </button>
              <button
                type="button"
                onClick={() => setDriveActiveFolder('Drafts')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  driveActiveFolder === 'Drafts'
                    ? 'bg-[var(--card)] text-[var(--text)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-blue-500" /> Drafts
              </button>
            </div>

            {/* Drive Files List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {driveFiles
                .filter((f) => f.folder === driveActiveFolder)
                .map((file) => (
                  <div
                    key={file.id}
                    onClick={() => handleSelectDriveFile(file)}
                    className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0 relative">
                        <img
                          src={file.thumbnailUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 text-[8px] font-bold px-1 rounded bg-black/80 text-white">
                          {file.duration}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[var(--text)] truncate">{file.name}</div>
                        <div className="text-[11px] text-[var(--muted)] flex items-center gap-2 mt-0.5">
                          <span>{file.resolution}</span>
                          <span>•</span>
                          <span>{file.sizeFormatted}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] text-[var(--accent-text)] shrink-0"
                    >
                      Select
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
