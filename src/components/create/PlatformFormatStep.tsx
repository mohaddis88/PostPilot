import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Crop,
  Layers,
  RectangleHorizontal,
  RotateCcw,
  Scissors,
  Split,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  ArrowLeft,
  Copy,
  RefreshCw,
  Clock,
  Play,
  Pause,
} from 'lucide-react';
import { Button } from '../common/Button';
import {
  MediaAsset,
  MediaFit,
  MediaVariant,
  PlatformType,
  PostType,
  StoryPart,
} from '../../domain/types';
import { PLATFORM_SPECS } from '../../domain/specs';
import { computeCrop } from '../../domain/crop';
import { planStoryParts, validateStoryCutPoints } from '../../domain/story';
import { parseAspectPreset, validateMediaAsset, formatDurationMs } from '../../domain/validation';
import { api } from '../../api';

interface PlatformFormatStepProps {
  postType: PostType;
  selectedPlatforms: PlatformType[];
  mediaAsset: MediaAsset;
  variants: Partial<Record<PlatformType, MediaVariant>>;
  setVariants: React.Dispatch<React.SetStateAction<Partial<Record<PlatformType, MediaVariant>>>>;
  storyParts?: StoryPart[];
  setStoryParts: (parts: StoryPart[]) => void;
  activePlatformTab: PlatformType;
  setActivePlatformTab: (plat: PlatformType) => void;
  onNavigateBack: () => void;
  onProceedToCaption: () => void;
  onReplaceFile: () => void;
}

export const PlatformFormatStep: React.FC<PlatformFormatStepProps> = ({
  postType,
  selectedPlatforms,
  mediaAsset,
  variants,
  setVariants,
  storyParts,
  setStoryParts,
  activePlatformTab,
  setActivePlatformTab,
  onNavigateBack,
  onProceedToCaption,
  onReplaceFile,
}) => {
  // Ensure active tab is within selectedPlatforms
  const currentPlatform = selectedPlatforms.includes(activePlatformTab)
    ? activePlatformTab
    : selectedPlatforms[0] || 'instagram';

  const spec = PLATFORM_SPECS[currentPlatform];

  // Aspect presets allowed for currentPlatform
  const allowedAspects = useMemo(() => {
    if (postType === 'story') {
      return [{ id: '9:16', label: '9:16 (Story)', ratio: 9 / 16, recommended: true }];
    }
    if (currentPlatform === 'linkedin') {
      return [
        { id: '1:1', label: '1:1 (Square)', ratio: 1.0, recommended: true },
        { id: '16:9', label: '16:9 (Landscape)', ratio: 16 / 9 },
        { id: '1.91:1', label: '1.91:1 (Wide)', ratio: 1.91 },
      ];
    }
    if (currentPlatform === 'instagram') {
      return [
        { id: '9:16', label: '9:16 (Reel)', ratio: 9 / 16, recommended: true },
        { id: '4:5', label: '4:5 (Portrait)', ratio: 4 / 5 },
        { id: '1:1', label: '1:1 (Square)', ratio: 1.0 },
        { id: '16:9', label: '16:9 (Landscape)', ratio: 16 / 9 },
      ];
    }
    if (currentPlatform === 'tiktok') {
      return [
        { id: '9:16', label: '9:16 (Full Vertical)', ratio: 9 / 16, recommended: true },
        { id: '1:1', label: '1:1 (Square)', ratio: 1.0 },
        { id: '16:9', label: '16:9 (Landscape)', ratio: 16 / 9 },
      ];
    }
    // Facebook
    return [
      { id: '16:9', label: '16:9 (Landscape)', ratio: 16 / 9 },
      { id: '9:16', label: '9:16 (Vertical)', ratio: 9 / 16, recommended: true },
      { id: '1:1', label: '1:1 (Square)', ratio: 1.0 },
    ];
  }, [currentPlatform, postType]);

  // Current variant for active tab
  const activeVariant: MediaVariant = useMemo(() => {
    const existing = variants[currentPlatform];
    const recommendedAspect =
      allowedAspects.find((a) => a.recommended)?.id || allowedAspects[0].id;

    if (existing) {
      return existing;
    }

    return {
      id: `var-${currentPlatform}-${Date.now()}`,
      assetId: mediaAsset.id,
      platform: currentPlatform,
      aspect: recommendedAspect,
      fit: 'crop',
      crop: { cx: 0.5, cy: 0.5, zoom: 1.0 },
      trimStartMs: 0,
      trimEndMs: mediaAsset.durationMs,
    };
  }, [variants, currentPlatform, allowedAspects, mediaAsset]);

  // Update variant helper
  const updateActiveVariant = (updates: Partial<MediaVariant>) => {
    setVariants((prev) => ({
      ...prev,
      [currentPlatform]: {
        ...activeVariant,
        ...updates,
      },
    }));
  };

  // Target aspect ratio float
  const targetRatio = useMemo(() => {
    return parseAspectPreset(activeVariant.aspect) || 9 / 16;
  }, [activeVariant.aspect]);

  // Pure domain computeCrop result in source pixels
  const cropBox = useMemo(() => {
    try {
      return computeCrop(
        mediaAsset.width || 1080,
        mediaAsset.height || 1920,
        targetRatio,
        activeVariant.crop
      );
    } catch {
      return { x: 0, y: 0, w: mediaAsset.width, h: mediaAsset.height };
    }
  }, [mediaAsset, targetRatio, activeVariant.crop]);

  // Interactive Drag State for Crop
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; cx: number; cy: number }>({
    mouseX: 0,
    mouseY: 0,
    cx: 0.5,
    cy: 0.5,
  });

  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (activeVariant.fit !== 'crop') return;
    e.preventDefault();
    setIsDraggingCrop(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      cx: activeVariant.crop.cx,
      cy: activeVariant.crop.cy,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingCrop || !previewContainerRef.current) return;
      const rect = previewContainerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;

      // Sensitivity factor based on zoom and preview dimensions
      const zoom = activeVariant.crop.zoom || 1.0;
      const stepX = (deltaX / (rect.width * zoom)) * 0.8;
      const stepY = (deltaY / (rect.height * zoom)) * 0.8;

      const newCx = Math.max(0, Math.min(1, dragStartRef.current.cx - stepX));
      const newCy = Math.max(0, Math.min(1, dragStartRef.current.cy - stepY));

      updateActiveVariant({
        crop: {
          ...activeVariant.crop,
          cx: parseFloat(newCx.toFixed(3)),
          cy: parseFloat(newCy.toFixed(3)),
        },
      });
    };

    const handleMouseUp = () => {
      setIsDraggingCrop(false);
    };

    if (isDraggingCrop) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingCrop, activeVariant]);

  // Reset Crop
  const handleResetCrop = () => {
    updateActiveVariant({
      crop: { cx: 0.5, cy: 0.5, zoom: 1.0 },
    });
  };

  // Apply to all vertical platforms
  const handleApplyToAllVertical = () => {
    setVariants((prev) => {
      const updated = { ...prev };
      selectedPlatforms.forEach((p) => {
        // Apply 9:16 preset and crop settings to vertical platforms (Instagram, TikTok, Facebook)
        if (p === 'instagram' || p === 'tiktok' || p === 'facebook') {
          updated[p] = {
            id: `var-${p}-${Date.now()}`,
            assetId: mediaAsset.id,
            platform: p,
            aspect: '9:16',
            fit: activeVariant.fit,
            crop: { ...activeVariant.crop },
            trimStartMs: activeVariant.trimStartMs,
            trimEndMs: activeVariant.trimEndMs,
          };
        }
      });
      return updated;
    });
  };

  // Story Split Management
  const isVideo = mediaAsset.kind === 'video';
  const durationMs = mediaAsset.durationMs || 30000;
  const maxStoryPartMs = spec.story.maxVideoDurationMs || 60000;
  const isStoryOverLimit = postType === 'story' && durationMs > maxStoryPartMs;

  const [segmentLengthSec, setSegmentLengthSec] = useState<number>(() => {
    return Math.min(30, Math.round(maxStoryPartMs / 1000));
  });
  const [customSegmentSec, setCustomSegmentSec] = useState<string>('30');
  const [splitErrorMessage, setSplitErrorMessage] = useState<string | null>(null);

  // Auto-plan story parts when segmentLengthSec or duration changes
  useEffect(() => {
    if (postType === 'story' && isVideo) {
      const effectiveChunkMs = segmentLengthSec * 1000;
      const planned = planStoryParts(durationMs, maxStoryPartMs, effectiveChunkMs, 5000);
      const cap = PLATFORM_SPECS.instagram.story.maxPartsPerDay || 100;
      if (planned.length > cap) {
        setSplitErrorMessage(`Exceeds daily story limit of ${cap} parts (${planned.length} parts planned).`);
      } else {
        setSplitErrorMessage(null);
        setStoryParts(planned);
      }
    }
  }, [postType, isVideo, durationMs, maxStoryPartMs, segmentLengthSec, setStoryParts]);

  // Video Trim State
  const trimStartMs = activeVariant.trimStartMs || 0;
  const trimEndMs = activeVariant.trimEndMs || durationMs;
  const trimmedDurationMs = Math.max(0, trimEndMs - trimStartMs);

  // Validation status of current platform variant
  const currentValidation = useMemo(() => {
    return validateMediaAsset(mediaAsset, currentPlatform, postType, activeVariant, storyParts);
  }, [mediaAsset, currentPlatform, postType, activeVariant, storyParts]);

  return (
    <div className="space-y-6">
      {/* Platform Tabs Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          {selectedPlatforms.map((plat) => {
            const pSpec = PLATFORM_SPECS[plat];
            const isActive = plat === currentPlatform;
            const pVariant = variants[plat];
            const pCheck = validateMediaAsset(mediaAsset, plat, postType, pVariant, storyParts);

            return (
              <button
                key={plat}
                type="button"
                onClick={() => setActivePlatformTab(plat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: `var(--p-${plat})` }}
                />
                <span>{pSpec.name}</span>
                {pCheck.passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertOctagon className="w-3.5 h-3.5 text-red-500 shrink-0" />
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--accent)]" />
                )}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onReplaceFile}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="text-xs shrink-0"
        >
          Replace file
        </Button>
      </div>

      {/* Main Grid: Controls (Left) vs Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Variant Controls & Trimming & Story Split (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. ASPECT RATIO PRESETS */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Aspect Preset ({spec.name})
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                Target: {activeVariant.aspect}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {allowedAspects.map((preset) => {
                const isSelected = activeVariant.aspect === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateActiveVariant({ aspect: preset.id })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--border-strong)] bg-[var(--surface-hover)] text-[var(--text)] font-semibold shadow-xs'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {preset.label}
                    {preset.recommended && (
                      <span className="ml-1 text-[10px] text-emerald-500 font-bold">•</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. FIT MODE: Crop | Blur Fill | Letterbox */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Fit Mode
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                {activeVariant.fit === 'blur_fill'
                  ? 'Keeps full frame on blurred background'
                  : activeVariant.fit === 'letterbox'
                  ? 'Black letterbox bars'
                  : 'Cropped to exact ratio'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => updateActiveVariant({ fit: 'crop' })}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeVariant.fit === 'crop'
                    ? 'border-[var(--border-strong)] bg-[var(--surface-hover)] text-[var(--text)] shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <Crop className="w-3.5 h-3.5 text-[var(--accent-text)]" /> Crop
              </button>

              <button
                type="button"
                onClick={() => updateActiveVariant({ fit: 'blur_fill' })}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeVariant.fit === 'blur_fill'
                    ? 'border-[var(--border-strong)] bg-[var(--surface-hover)] text-[var(--text)] shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-500" /> Blur fill
              </button>

              <button
                type="button"
                onClick={() => updateActiveVariant({ fit: 'letterbox' })}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeVariant.fit === 'letterbox'
                    ? 'border-[var(--border-strong)] bg-[var(--surface-hover)] text-[var(--text)] shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <RectangleHorizontal className="w-3.5 h-3.5 text-neutral-400" /> Letterbox
              </button>
            </div>

            {/* If Crop Mode: Zoom slider & Draggable Pan Controls */}
            {activeVariant.fit === 'crop' && (
              <div className="pt-2 border-t border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--muted)] font-medium">Zoom Magnification</span>
                  <span className="font-semibold text-[var(--text)]">
                    {(activeVariant.crop.zoom || 1.0).toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={activeVariant.crop.zoom || 1.0}
                  onChange={(e) =>
                    updateActiveVariant({
                      crop: {
                        ...activeVariant.crop,
                        zoom: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-[var(--accent)] cursor-pointer"
                />

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleResetCrop}
                    className="text-xs text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset crop
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyToAllVertical}
                    className="text-xs text-[var(--accent-text)] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Apply to all vertical platforms
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. VIDEO TRIM TIMELINE (If video) */}
          {isVideo && (
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[var(--accent-text)]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Video Trim
                  </span>
                </div>
                <span className="text-xs font-semibold text-[var(--text)]">
                  {formatDurationMs(trimStartMs)} – {formatDurationMs(trimEndMs)} · Length: {formatDurationMs(trimmedDurationMs)}
                </span>
              </div>

              {/* Sliders for start / end */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[var(--muted)] w-12">Start</span>
                  <input
                    type="range"
                    min="0"
                    max={trimEndMs - 1000}
                    step="1000"
                    value={trimStartMs}
                    onChange={(e) =>
                      updateActiveVariant({
                        trimStartMs: parseInt(e.target.value, 10),
                      })
                    }
                    className="flex-1 accent-[var(--accent)] cursor-pointer"
                  />
                  <span className="font-mono text-[11px] w-12 text-right">
                    {formatDurationMs(trimStartMs)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[var(--muted)] w-12">End</span>
                  <input
                    type="range"
                    min={trimStartMs + 1000}
                    max={durationMs}
                    step="1000"
                    value={trimEndMs}
                    onChange={(e) =>
                      updateActiveVariant({
                        trimEndMs: parseInt(e.target.value, 10),
                      })
                    }
                    className="flex-1 accent-[var(--accent)] cursor-pointer"
                  />
                  <span className="font-mono text-[11px] w-12 text-right">
                    {formatDurationMs(trimEndMs)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. STORY SPLIT (If story post and video) */}
          {postType === 'story' && isVideo && (
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Split className="w-4 h-4 text-[var(--accent-text)]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Split Into Parts
                  </span>
                </div>
                <span className="text-xs font-semibold text-[var(--text)]">
                  {storyParts?.length || 1} part{(storyParts?.length || 1) === 1 ? '' : 's'}
                </span>
              </div>

              {/* Segment Length Selector: 15s, 30s, 60s, custom */}
              <div className="space-y-2">
                <span className="text-xs text-[var(--muted)]">Target segment duration</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[15, 30, 60].map((sec) => {
                    if (sec * 1000 > maxStoryPartMs) return null;
                    const isSelected = segmentLengthSec === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          setSegmentLengthSec(sec);
                          setCustomSegmentSec(sec.toString());
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[var(--border-strong)] bg-[var(--surface-hover)] text-[var(--text)] shadow-xs'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        {sec}s
                      </button>
                    );
                  })}

                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-xs text-[var(--muted)]">Custom:</span>
                    <input
                      type="number"
                      min="5"
                      max={Math.round(maxStoryPartMs / 1000)}
                      value={customSegmentSec}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setCustomSegmentSec(e.target.value);
                        if (!isNaN(val) && val >= 5 && val <= Math.round(maxStoryPartMs / 1000)) {
                          setSegmentLengthSec(val);
                        }
                      }}
                      className="w-16 px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                    />
                    <span className="text-xs text-[var(--muted)]">s</span>
                  </div>
                </div>
              </div>

              {splitErrorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  {splitErrorMessage}
                </div>
              )}

              {/* Story Parts List: contiguous and posting in order */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[var(--muted)]">
                  Posting Order & Parts Schedule
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(storyParts || []).map((part, index) => {
                    const startFmt = formatDurationMs(part.startMs);
                    const endFmt = formatDurationMs(part.endMs);
                    const lengthSec = ((part.endMs - part.startMs) / 1000).toFixed(1);

                    return (
                      <div
                        key={part.index}
                        className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] text-[10px] font-bold flex items-center justify-center text-[var(--text)]">
                            {index + 1}
                          </span>
                          <div>
                            <div className="font-semibold text-[var(--text)]">
                              Part {index + 1} · {startFmt} - {endFmt}
                            </div>
                            <div className="text-[10px] text-[var(--muted)]">Duration: {lengthSec}s</div>
                          </div>
                        </div>

                        <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Ready
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Target Aspect Ratio Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-24">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Live Output Preview ({spec.name})
              </span>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text)]">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: `var(--p-${currentPlatform})` }}
                />
                {activeVariant.aspect} ({targetRatio.toFixed(2)})
              </div>
            </div>

            {/* PREVIEW CONTAINER CLAMPED TO EXACT TARGET RATIO */}
            <div className="w-full flex justify-center py-2 bg-black/10 dark:bg-black/30 rounded-lg">
              <div
                ref={previewContainerRef}
                onMouseDown={handleCropMouseDown}
                style={{
                  aspectRatio: `${targetRatio}`,
                  maxHeight: '440px',
                  width: targetRatio <= 1 ? 'auto' : '100%',
                  height: targetRatio <= 1 ? '440px' : 'auto',
                }}
                className={`relative rounded-lg overflow-hidden border border-[var(--border)] select-none bg-neutral-950 ${
                  activeVariant.fit === 'crop' ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
              >
                {/* 1. BLUR FILL MODE */}
                {activeVariant.fit === 'blur_fill' && (
                  <>
                    {/* Blurred background copy */}
                    <img
                      src={mediaAsset.thumbnailUrl || mediaAsset.url}
                      alt="Blurred backdrop"
                      className="absolute inset-0 w-full h-full object-cover filter blur-xl scale-125 brightness-75 pointer-events-none"
                    />
                    {/* Centered source frame */}
                    <img
                      src={mediaAsset.thumbnailUrl || mediaAsset.url}
                      alt="Source media"
                      className="relative z-10 w-full h-full object-contain pointer-events-none"
                    />
                  </>
                )}

                {/* 2. LETTERBOX MODE */}
                {activeVariant.fit === 'letterbox' && (
                  <div className="w-full h-full bg-black flex items-center justify-center">
                    <img
                      src={mediaAsset.thumbnailUrl || mediaAsset.url}
                      alt="Letterboxed media"
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  </div>
                )}

                {/* 3. CROP MODE: Exact zoom and normalized offset */}
                {activeVariant.fit === 'crop' && (
                  <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                    <img
                      src={mediaAsset.thumbnailUrl || mediaAsset.url}
                      alt="Cropped media"
                      style={{
                        transform: `translate(${(0.5 - activeVariant.crop.cx) * 100 * (activeVariant.crop.zoom || 1)}%, ${(0.5 - activeVariant.crop.cy) * 100 * (activeVariant.crop.zoom || 1)}%) scale(${activeVariant.crop.zoom || 1})`,
                        transition: isDraggingCrop ? 'none' : 'transform 0.1s ease-out',
                      }}
                      className="w-full h-full object-cover pointer-events-none"
                    />

                    {/* Framing Guidelines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/20">
                      <div className="border-r border-b border-white/10" />
                      <div className="border-r border-b border-white/10" />
                      <div className="border-b border-white/10" />
                      <div className="border-r border-b border-white/10" />
                      <div className="border-r border-b border-white/10" />
                      <div className="border-b border-white/10" />
                      <div className="border-r border-white/10" />
                      <div className="border-r border-white/10" />
                      <div />
                    </div>

                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono pointer-events-none backdrop-blur-xs">
                      Drag to pan frame
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Computed Source Pixel Coordinates (Transparency) */}
            <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[11px] font-mono space-y-1">
              <div className="flex justify-between text-[var(--muted)]">
                <span>Crop Coordinates (Source Pixels):</span>
                <span className="text-[var(--text)]">
                  {cropBox.w} × {cropBox.h} px
                </span>
              </div>
              <div className="flex justify-between text-[var(--muted)]">
                <span>Offset:</span>
                <span className="text-[var(--text)]">
                  x: {cropBox.x}, y: {cropBox.y}
                </span>
              </div>
            </div>

            {/* Platform spec compliance badge */}
            <div className="pt-2">
              {currentValidation.passed ? (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Format is compatible with {spec.name}
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  {currentValidation.checks.find((c) => c.status === 'fail')?.label || 'Fix required'}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Action */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onNavigateBack}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Content
            </Button>
            <Button
              type="button"
              variant="accent"
              size="md"
              onClick={onProceedToCaption}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Caption
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
