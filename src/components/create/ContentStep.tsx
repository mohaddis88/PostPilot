import React, { useRef, useState } from 'react';
import {
  Upload,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileVideo,
  FileImage,
  ArrowRight,
  Crop,
  Scissors,
  Split,
  RefreshCw,
  Folder,
} from 'lucide-react';
import { Button } from '../common/Button';
import {
  MediaAsset,
  MediaCheckResult,
  MediaVariant,
  MockDriveFile,
  PlatformType,
  PostType,
  StoryPart,
} from '../../domain/types';
import { PLATFORM_SPECS } from '../../domain/specs';
import { validateMedia } from '../../domain/validation';
import { api } from '../../api';

interface ContentStepProps {
  postType: PostType;
  setPostType: (type: PostType) => void;
  selectedPlatforms: PlatformType[];
  setSelectedPlatforms: (platforms: PlatformType[]) => void;
  mediaAsset: MediaAsset | null;
  setMediaAsset: (asset: MediaAsset | null) => void;
  variants: Partial<Record<PlatformType, MediaVariant>>;
  storyParts?: StoryPart[];
  onOpenDrivePicker: () => void;
  onNavigateToStep: (step: 1 | 2 | 3 | 4) => void;
  onSelectPlatformTab: (platform: PlatformType) => void;
  onProceedToStep2: () => void;
}

export const ContentStep: React.FC<ContentStepProps> = ({
  postType,
  setPostType,
  selectedPlatforms,
  setSelectedPlatforms,
  mediaAsset,
  setMediaAsset,
  variants,
  storyParts,
  onOpenDrivePicker,
  onNavigateToStep,
  onSelectPlatformTab,
  onProceedToStep2,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Platform list
  const allPlatforms: PlatformType[] = ['linkedin', 'instagram', 'facebook', 'tiktok'];

  // Handle post type change
  const handlePostTypeChange = (newType: PostType) => {
    setPostType(newType);
    if (newType === 'story') {
      // Stories only supported on Instagram and Facebook
      const valid = selectedPlatforms.filter((p) => PLATFORM_SPECS[p].story.supported);
      if (valid.length === 0) {
        setSelectedPlatforms(['instagram']);
      } else {
        setSelectedPlatforms(valid);
      }
    }
  };

  // Toggle platform selection
  const handleTogglePlatform = (plat: PlatformType) => {
    if (postType === 'story' && !PLATFORM_SPECS[plat].story.supported) {
      return; // Disabled for story
    }
    if (selectedPlatforms.includes(plat)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== plat));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, plat]);
    }
  };

  // Process chosen File
  const handleFileChange = (file: File) => {
    setUploadError(null);
    const mime = file.type.toLowerCase();
    const name = file.name;
    const isImage = mime.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(name);
    const isVideo = mime.startsWith('video/') || /\.(mp4|mov)$/i.test(name);

    if (!isImage && !isVideo) {
      setUploadError('Unsupported format. Please select JPG, PNG, MP4, or MOV.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    if (isImage) {
      const img = new Image();
      img.onload = () => {
        const asset: MediaAsset = {
          id: `asset-${Date.now()}`,
          kind: 'image',
          width: img.naturalWidth || 1080,
          height: img.naturalHeight || 1080,
          sizeBytes: file.size,
          mime: file.type || 'image/jpeg',
          name: file.name,
          url: objectUrl,
          thumbnailUrl: objectUrl,
        };
        setMediaAsset(asset);
      };
      img.onerror = () => {
        setUploadError('Failed to read image file.');
      };
      img.src = objectUrl;
    } else {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const durationMs = Math.round((video.duration || 30) * 1000);
        const width = video.videoWidth || 1080;
        const height = video.videoHeight || 1920;
        const asset: MediaAsset = {
          id: `asset-${Date.now()}`,
          kind: 'video',
          width,
          height,
          durationMs,
          sizeBytes: file.size,
          mime: file.type || 'video/mp4',
          name: file.name,
          url: objectUrl,
          thumbnailUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
        };
        setMediaAsset(asset);
      };
      video.onerror = () => {
        setUploadError('Failed to parse video metadata.');
      };
      video.src = objectUrl;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  // Format duration
  const formatDuration = (ms?: number): string => {
    if (!ms) return '0:00';
    const totalSec = Math.round(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. CONTENT TYPE SEGMENTED CHOICE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Content Type</span>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="inline-flex p-1 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
              <button
                type="button"
                onClick={() => handlePostTypeChange('post')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  postType === 'post'
                    ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                Post
              </button>
              <button
                type="button"
                onClick={() => handlePostTypeChange('story')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  postType === 'story'
                    ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                Story
              </button>
            </div>
          </div>
        </div>

        {/* Platforms Selector */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Target Platforms</span>
          <div className="flex items-center gap-2 mt-1.5">
            {allPlatforms.map((plat) => {
              const spec = PLATFORM_SPECS[plat];
              const isStory = postType === 'story';
              const isSupported = !isStory || spec.story.supported;
              const isSelected = selectedPlatforms.includes(plat);

              if (isStory && !isSupported) {
                return (
                  <div key={plat} className="relative group">
                    <div
                      className="px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] opacity-50 cursor-not-allowed text-xs font-medium flex items-center gap-1.5"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: `var(--p-${plat})` }}
                      />
                      {spec.name}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 px-2 py-1 text-[11px] font-medium text-white bg-neutral-900 dark:bg-neutral-800 rounded shadow-lg whitespace-nowrap pointer-events-none">
                      Not supported for stories
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={plat}
                  type="button"
                  onClick={() => handleTogglePlatform(plat)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--border-strong)] bg-[var(--surface-hover)] text-[var(--text)] font-semibold shadow-xs'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: `var(--p-${plat})` }}
                  />
                  {spec.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. FILE UPLOADER & DRIVE PICKER */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,video/mp4,video/quicktime,.jpg,.jpeg,.png,.mp4,.mov"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
          }
        }}
      />

      {!mediaAsset ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all flex flex-col items-center justify-center ${
            isDragging
              ? 'border-[var(--accent)] bg-[var(--surface-hover)]'
              : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)]'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)] mb-4">
            <Upload className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text)]">Choose image or video to create {postType}</h3>
          <p className="text-xs text-[var(--muted)] mt-1">Accepts JPG, PNG, MP4, and MOV files</p>

          <div className="flex items-center gap-3 mt-6">
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Browse Local File
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenDrivePicker}
              leftIcon={<HardDrive className="w-4 h-4 text-emerald-500" />}
            >
              Select from Google Drive
            </Button>
          </div>

          {uploadError && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              {uploadError}
            </div>
          )}
        </div>
      ) : (
        /* COMPACT CARD FOR CURRENT FILE + SPEC PANEL */
        <div className="space-y-4">
          {/* File Card */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--surface)] border border-[var(--border)] shrink-0 relative flex items-center justify-center">
                {mediaAsset.thumbnailUrl || mediaAsset.url ? (
                  <img
                    src={mediaAsset.thumbnailUrl || mediaAsset.url}
                    alt={mediaAsset.name || 'Selected media'}
                    className="w-full h-full object-cover"
                  />
                ) : mediaAsset.kind === 'video' ? (
                  <FileVideo className="w-6 h-6 text-[var(--muted)]" />
                ) : (
                  <FileImage className="w-6 h-6 text-[var(--muted)]" />
                )}
                {mediaAsset.kind === 'video' && (
                  <span className="absolute bottom-1 right-1 text-[9px] font-bold px-1 rounded bg-black/70 text-white">
                    {formatDuration(mediaAsset.durationMs)}
                  </span>
                )}
              </div>

              {/* File Info */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-[var(--text)] truncate max-w-[240px] sm:max-w-[360px]">
                    {mediaAsset.name || 'Uploaded Media'}
                  </h4>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)]">
                    {mediaAsset.kind}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-[var(--muted)]">
                  <span>{mediaAsset.width} × {mediaAsset.height}</span>
                  <span>•</span>
                  <span>Ratio: {(mediaAsset.width / (mediaAsset.height || 1)).toFixed(2)}</span>
                  <span>•</span>
                  <span>{formatSize(mediaAsset.sizeBytes)}</span>
                </div>
              </div>
            </div>

            {/* Replace button */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Replace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenDrivePicker}
                leftIcon={<HardDrive className="w-3.5 h-3.5 text-emerald-500" />}
                className="text-xs"
              >
                Drive
              </Button>
            </div>
          </div>

          {/* SPEC PANEL: One row per selected platform with validateMedia checks */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Platform Specifications & Validation
              </h4>
              <span className="text-[11px] text-[var(--muted)]">
                {selectedPlatforms.length} platform{selectedPlatforms.length === 1 ? '' : 's'} checked
              </span>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {selectedPlatforms.map((plat) => {
                const spec = PLATFORM_SPECS[plat];
                const variant = variants[plat];
                // Validate media with existing variant & story split
                const checks = validateMedia(mediaAsset, plat, postType, variant, storyParts);

                const hasFail = checks.some((c) => c.status === 'fail');
                const hasWarn = checks.some((c) => c.status === 'warn');

                return (
                  <div key={plat} className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: `var(--p-${plat})` }}
                        />
                        <span className="text-xs font-semibold text-[var(--text)]">{spec.name}</span>
                        {hasFail ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                            <AlertOctagon className="w-3 h-3" /> Fix required
                          </span>
                        ) : hasWarn ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <AlertTriangle className="w-3 h-3" /> Compatible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        )}
                      </div>

                      {/* Applicable Fix Buttons */}
                      {hasFail && (
                        <div className="flex items-center gap-1.5">
                          {Array.from(new Set(checks.flatMap((c) => (c.status === 'fail' ? c.fixes : [])))).map(
                            (fix) => {
                              if (fix === 'crop') {
                                return (
                                  <button
                                    key="crop"
                                    type="button"
                                    onClick={() => {
                                      onSelectPlatformTab(plat);
                                      onNavigateToStep(2);
                                    }}
                                    className="px-2.5 py-1 rounded text-[11px] font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer flex items-center gap-1"
                                  >
                                    <Crop className="w-3 h-3 text-[var(--accent-text)]" /> Crop
                                  </button>
                                );
                              }
                              if (fix === 'trim') {
                                return (
                                  <button
                                    key="trim"
                                    type="button"
                                    onClick={() => {
                                      onSelectPlatformTab(plat);
                                      onNavigateToStep(2);
                                    }}
                                    className="px-2.5 py-1 rounded text-[11px] font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer flex items-center gap-1"
                                  >
                                    <Scissors className="w-3 h-3 text-[var(--accent-text)]" /> Trim
                                  </button>
                                );
                              }
                              if (fix === 'split') {
                                return (
                                  <button
                                    key="split"
                                    type="button"
                                    onClick={() => {
                                      onSelectPlatformTab(plat);
                                      onNavigateToStep(2);
                                    }}
                                    className="px-2.5 py-1 rounded text-[11px] font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer flex items-center gap-1"
                                  >
                                    <Split className="w-3 h-3 text-[var(--accent-text)]" /> Split into stories
                                  </button>
                                );
                              }
                              if (fix === 'replace') {
                                return (
                                  <button
                                    key="replace"
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-2.5 py-1 rounded text-[11px] font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer flex items-center gap-1"
                                  >
                                    <RefreshCw className="w-3 h-3 text-[var(--accent-text)]" /> Replace
                                  </button>
                                );
                              }
                              return null;
                            }
                          )}
                        </div>
                      )}
                    </div>

                    {/* Check item list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pl-4">
                      {checks.map((chk) => (
                        <div
                          key={chk.id}
                          className="flex items-center justify-between p-1.5 rounded bg-[var(--surface)] border border-[var(--border)]"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {chk.status === 'pass' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : chk.status === 'warn' ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            ) : (
                              <AlertOctagon className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            )}
                            <span className="text-[var(--text)] font-medium truncate">{chk.label}</span>
                          </div>
                          <span className="text-[var(--muted)] text-[10px] shrink-0 ml-2">
                            {chk.actual} / {chk.limit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="accent"
              size="md"
              onClick={onProceedToStep2}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Platforms & Format
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
