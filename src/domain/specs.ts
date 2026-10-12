// verify against current platform docs
// All platform constraints and limits are defined strictly in this file. Keep every number here only.

import { PlatformType, PostType } from './types';

export interface AspectRange {
  min: number;
  max: number;
  recommended?: number;
}

export interface DurationRangeMs {
  minMs: number;
  maxMs: number;
}

export interface PlatformPostSpec {
  image?: {
    ratio: AspectRange;
    maxSizeBytes?: number;
    allowedMimes?: string[];
  };
  video?: {
    ratio: AspectRange;
    durationMs?: DurationRangeMs;
    maxSizeBytes?: number;
    isReel?: boolean;
  };
}

export interface PlatformStorySpec {
  supported: boolean;
  ratio?: number;
  maxVideoDurationMs?: number;
  photoDurationMs?: number;
  maxPartsPerDay?: number;
  maxSizeBytesPerPart?: number;
}

export interface PlatformSpec {
  name: string;
  post: PlatformPostSpec;
  story: PlatformStorySpec;
}

export const PLATFORM_SPECS: Record<PlatformType, PlatformSpec> = {
  linkedin: {
    name: 'LinkedIn',
    post: {
      image: {
        ratio: {
          min: 1.0, // 1:1
          max: 1.91, // 1.91:1
        },
      },
      video: {
        ratio: {
          min: 1 / 2.4, // 1:2.4 (~0.4167)
          max: 2.4, // 2.4:1
        },
        durationMs: {
          minMs: 3000, // 3s
          maxMs: 600000, // 10min
        },
      },
    },
    story: {
      supported: false,
    },
  },
  instagram: {
    name: 'Instagram',
    post: {
      image: {
        ratio: {
          min: 4 / 5, // 4:5 (0.80)
          max: 1.91, // 1.91:1
        },
        maxSizeBytes: 30 * 1024 * 1024, // 30MB = 31,457,280 bytes
      },
      video: {
        ratio: {
          min: 9 / 16, // 9:16 (0.5625)
          max: 16 / 9, // 16:9 (~1.7778)
          recommended: 9 / 16, // 9:16 recommended (published as Reel)
        },
        durationMs: {
          minMs: 3000, // 3s
          maxMs: 900000, // 15min
        },
        isReel: true,
      },
    },
    story: {
      supported: true,
      ratio: 9 / 16, // 9:16
      maxVideoDurationMs: 60000, // 60s per part
      photoDurationMs: 7000, // 7s for photo
      maxPartsPerDay: 100, // 100 parts per 24h
      maxSizeBytesPerPart: 250 * 1024 * 1024, // 250MB = 262,144,000 bytes
    },
  },
  facebook: {
    name: 'Facebook',
    post: {
      image: {
        ratio: {
          min: 9 / 16, // 9:16 (0.5625)
          max: 16 / 9, // 16:9 (~1.7778)
        },
      },
      video: {
        ratio: {
          min: 9 / 16, // 9:16
          max: 16 / 9, // 16:9
        },
      },
    },
    story: {
      supported: true,
      ratio: 9 / 16, // 9:16
      maxVideoDurationMs: 60000, // 60s per part
    },
  },
  tiktok: {
    name: 'TikTok',
    post: {
      image: {
        ratio: {
          min: 9 / 16,
          max: 16 / 9,
          recommended: 9 / 16,
        },
        allowedMimes: ['image/jpeg', 'image/jpg'], // JPG only
      },
      video: {
        ratio: {
          min: 9 / 16,
          max: 16 / 9,
          recommended: 9 / 16, // 9:16 recommended
        },
        durationMs: {
          minMs: 3000, // 3s
          maxMs: 600000, // 10min
        },
      },
    },
    story: {
      supported: false,
    },
  },
};

/**
 * Platform branding color tokens.
 * Small identifiers only: icon chips, chart series, calendar dots. Never buttons or large areas.
 */
export const PLATFORM_COLORS: Record<PlatformType, string> = {
  linkedin: '#0A66C2',
  facebook: '#1877F2',
  instagram: '#E1306C',
  tiktok: '#FE2C55',
};

/**
 * Returns supported platforms for the given post type.
 * Story is supported on Instagram and Facebook only.
 */
export function targetsFor(postType: PostType): PlatformType[] {
  if (postType === 'story') {
    return (Object.keys(PLATFORM_SPECS) as PlatformType[]).filter(
      (p) => PLATFORM_SPECS[p].story.supported
    );
  }
  return Object.keys(PLATFORM_SPECS) as PlatformType[];
}
