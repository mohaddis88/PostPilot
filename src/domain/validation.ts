import { PLATFORM_SPECS } from './specs';
import {
  MediaAsset,
  MediaCheck,
  MediaCheckResult,
  MediaVariant,
  PlatformType,
  PostType,
  StoryPart,
} from './types';

/**
 * Validates a media asset (and its platform variant / story plan if configured)
 * against the platform's published specifications for a post or story.
 * Pure function: relies entirely on PLATFORM_SPECS with zero side effects.
 *
 * @param asset The source media asset (image or video)
 * @param platform Target social media platform
 * @param postType 'post' | 'story'
 * @param variant Optional per-platform MediaVariant with crop/fit/trim
 * @param storyParts Optional StoryPart[] split plan for story posts
 * @returns Array of checks with pass/warn/fail status and suggested fix actions
 */
export function validateMedia(
  asset: MediaAsset,
  platform: PlatformType,
  postType: PostType,
  variant?: MediaVariant,
  storyParts?: StoryPart[]
): MediaCheck[] {
  const spec = PLATFORM_SPECS[platform];
  const checks: MediaCheck[] = [];

  // 1. Post type support check
  if (postType === 'story') {
    if (!spec.story.supported) {
      checks.push({
        id: 'story_support',
        label: `${spec.name} Stories Support`,
        actual: 'Unsupported format',
        limit: 'Supported only on Instagram and Facebook',
        status: 'fail',
        fixes: ['replace'],
      });
      return checks; // early return if whole format is rejected
    }
  }

  // Determine effective ratio: variant ratio takes precedence if fitted/cropped
  let effectiveRatio = asset.height > 0 ? asset.width / asset.height : 1;
  if (variant?.aspect) {
    const presetRatio = parseAspectPreset(variant.aspect);
    if (presetRatio !== null) {
      effectiveRatio = presetRatio;
    }
  }

  const effectiveRatioStr = formatRatio(effectiveRatio);

  // 2. Aspect Ratio Check
  if (postType === 'story') {
    const targetRatio = spec.story.ratio ?? (9 / 16);
    const targetStr = '9:16 (0.56)';
    const ratioDelta = Math.abs(effectiveRatio - targetRatio);

    if (ratioDelta > 0.05) {
      checks.push({
        id: 'aspect_ratio',
        label: 'Aspect Ratio',
        actual: effectiveRatioStr,
        limit: targetStr,
        status: 'fail',
        fixes: ['crop'],
      });
    } else {
      checks.push({
        id: 'aspect_ratio',
        label: 'Aspect Ratio',
        actual: effectiveRatioStr,
        limit: targetStr,
        status: 'pass',
        fixes: [],
      });
    }
  } else {
    // Standard Post
    const mediaSpec = asset.kind === 'video' ? spec.post.video : spec.post.image;

    if (mediaSpec?.ratio) {
      const { min, max, recommended } = mediaSpec.ratio;
      const minStr = formatRatio(min);
      const maxStr = formatRatio(max);

      if (effectiveRatio < min - 0.02 || effectiveRatio > max + 0.02) {
        checks.push({
          id: 'aspect_ratio',
          label: 'Aspect Ratio',
          actual: effectiveRatioStr,
          limit: `${minStr} to ${maxStr}`,
          status: 'fail',
          fixes: ['crop'],
        });
      } else if (recommended && Math.abs(effectiveRatio - recommended) > 0.06) {
        checks.push({
          id: 'aspect_ratio',
          label: 'Aspect Ratio',
          actual: effectiveRatioStr,
          limit: `${formatRatio(recommended)} (recommended)`,
          status: 'warn',
          fixes: ['crop'],
        });
      } else {
        checks.push({
          id: 'aspect_ratio',
          label: 'Aspect Ratio',
          actual: effectiveRatioStr,
          limit: `${minStr} to ${maxStr}`,
          status: 'pass',
          fixes: [],
        });
      }
    }
  }

  // 3. Duration Check (Video only)
  if (asset.kind === 'video' && typeof asset.durationMs === 'number') {
    let effectiveDurationMs = asset.durationMs;
    if (
      variant?.trimStartMs !== undefined &&
      variant?.trimEndMs !== undefined &&
      variant.trimEndMs > variant.trimStartMs
    ) {
      effectiveDurationMs = variant.trimEndMs - variant.trimStartMs;
    }

    const actualSec = Math.round(effectiveDurationMs / 1000);
    const actualFormatted = formatDurationMs(effectiveDurationMs);

    if (postType === 'story') {
      const maxStoryDurationMs = spec.story.maxVideoDurationMs ?? 60000;
      const maxSec = Math.round(maxStoryDurationMs / 1000);

      // If split plan provided and splits are valid
      if (storyParts && storyParts.length > 1) {
        const partsCount = storyParts.length;
        const allWithinLimit = storyParts.every(
          (p) => p.endMs - p.startMs <= maxStoryDurationMs + 50
        );

        if (allWithinLimit) {
          checks.push({
            id: 'video_duration',
            label: 'Story Video Duration',
            actual: `${actualFormatted} (${partsCount} parts)`,
            limit: `Max ${maxSec}s per segment`,
            status: 'pass',
            fixes: [],
          });
        } else {
          checks.push({
            id: 'video_duration',
            label: 'Story Video Duration',
            actual: `${actualFormatted} (${partsCount} parts)`,
            limit: `Max ${maxSec}s per segment`,
            status: 'fail',
            fixes: ['split', 'trim'],
          });
        }
      } else if (effectiveDurationMs > maxStoryDurationMs) {
        checks.push({
          id: 'video_duration',
          label: 'Story Video Duration',
          actual: actualFormatted,
          limit: `Max ${maxSec}s per segment`,
          status: 'fail',
          fixes: ['split', 'trim'],
        });
      } else {
        checks.push({
          id: 'video_duration',
          label: 'Story Video Duration',
          actual: actualFormatted,
          limit: `Max ${maxSec}s per segment`,
          status: 'pass',
          fixes: [],
        });
      }
    } else {
      // Post video duration
      const durationRange = spec.post.video?.durationMs;
      if (durationRange) {
        const minSec = Math.round(durationRange.minMs / 1000);
        const maxSec = Math.round(durationRange.maxMs / 1000);

        if (effectiveDurationMs < durationRange.minMs) {
          checks.push({
            id: 'video_duration',
            label: 'Video Duration',
            actual: `${actualSec}s`,
            limit: `Min ${minSec}s, Max ${maxSec}s`,
            status: 'fail',
            fixes: ['replace'],
          });
        } else if (effectiveDurationMs > durationRange.maxMs) {
          checks.push({
            id: 'video_duration',
            label: 'Video Duration',
            actual: `${actualSec}s`,
            limit: `Min ${minSec}s, Max ${maxSec}s`,
            status: 'fail',
            fixes: ['trim'],
          });
        } else {
          checks.push({
            id: 'video_duration',
            label: 'Video Duration',
            actual: `${actualSec}s`,
            limit: `${minSec}s - ${maxSec}s`,
            status: 'pass',
            fixes: [],
          });
        }
      }
    }
  }

  // 4. File Size Check
  const maxBytes =
    postType === 'story'
      ? spec.story.maxSizeBytesPerPart
      : asset.kind === 'image'
      ? spec.post.image?.maxSizeBytes
      : spec.post.video?.maxSizeBytes;

  if (maxBytes && asset.sizeBytes > 0) {
    const actualMb = (asset.sizeBytes / (1024 * 1024)).toFixed(1);
    const limitMb = (maxBytes / (1024 * 1024)).toFixed(0);

    if (asset.sizeBytes > maxBytes) {
      checks.push({
        id: 'file_size',
        label: 'File Size',
        actual: `${actualMb} MB`,
        limit: `Max ${limitMb} MB`,
        status: 'fail',
        fixes: ['replace'],
      });
    } else {
      checks.push({
        id: 'file_size',
        label: 'File Size',
        actual: `${actualMb} MB`,
        limit: `Max ${limitMb} MB`,
        status: 'pass',
        fixes: [],
      });
    }
  }

  // 5. Mime / Container Type Check
  const allowedMimes =
    postType === 'post' && asset.kind === 'image'
      ? spec.post.image?.allowedMimes
      : undefined;

  if (allowedMimes && allowedMimes.length > 0) {
    const isAllowed = allowedMimes.some(
      (m) => m.toLowerCase() === asset.mime.toLowerCase()
    );
    if (!isAllowed) {
      checks.push({
        id: 'media_mime',
        label: 'File Format',
        actual: asset.mime,
        limit: allowedMimes.join(', '),
        status: 'fail',
        fixes: ['replace'],
      });
    } else {
      checks.push({
        id: 'media_mime',
        label: 'File Format',
        actual: asset.mime,
        limit: allowedMimes.join(', '),
        status: 'pass',
        fixes: [],
      });
    }
  }

  return checks;
}

/**
 * Convenience wrapper returning an aggregated result boolean and checks list.
 */
export function validateMediaAsset(
  asset: MediaAsset,
  platform: PlatformType,
  postType: PostType,
  variant?: MediaVariant,
  storyParts?: StoryPart[]
): MediaCheckResult {
  const checks = validateMedia(asset, platform, postType, variant, storyParts);
  const passed = !checks.some((c) => c.status === 'fail');
  return { passed, checks };
}

export function parseAspectPreset(aspect?: string): number | null {
  if (!aspect) return null;
  if (aspect === '9:16') return 9 / 16;
  if (aspect === '16:9') return 16 / 9;
  if (aspect === '1:1') return 1.0;
  if (aspect === '4:5') return 4 / 5;
  if (aspect === '1.91:1' || aspect === '1.91') return 1.91;
  const parts = aspect.split(':');
  if (parts.length === 2) {
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    if (w > 0 && h > 0) return w / h;
  }
  return null;
}

export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatRatio(ratio: number): string {
  if (Math.abs(ratio - 9 / 16) < 0.02) return '9:16 (0.56)';
  if (Math.abs(ratio - 16 / 9) < 0.02) return '16:9 (1.78)';
  if (Math.abs(ratio - 1.0) < 0.02) return '1:1 (1.00)';
  if (Math.abs(ratio - 4 / 5) < 0.02) return '4:5 (0.80)';
  if (Math.abs(ratio - 1.91) < 0.02) return '1.91:1 (1.91)';
  return ratio.toFixed(2);
}
