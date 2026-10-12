import { StoryPart } from './types';

/**
 * Plans video split points for social story formats.
 *
 * Rules:
 * - Parts are contiguous and non-overlapping, cover the whole video exactly, and use millisecond precision internally.
 * - Each part is within [1s, max].
 * - Default segment L = min(preferredMs, platform max). n = ceil(duration / L). If n = 1, no split.
 * - If the last part would be shorter than 5s (minTailMs), use balanced parts instead:
 *   n equal parts (remaining milliseconds spread over the first parts).
 *
 * @param durationMs Total video duration in milliseconds
 * @param maxPartMs Maximum allowed part length (e.g. 60,000ms for Instagram/Facebook stories)
 * @param preferredMs Preferred target part length (defaults to 30,000ms)
 * @param minTailMs Minimum tail chunk length (defaults to 5,000ms)
 * @returns List of StoryPart { index, startMs, endMs }
 */
export function planStoryParts(
  durationMs: number,
  maxPartMs: number,
  preferredMs = 30000,
  minTailMs = 5000
): StoryPart[] {
  if (durationMs <= 0 || maxPartMs <= 0) {
    return [];
  }

  const roundedDuration = Math.round(durationMs);
  const L = Math.min(preferredMs, maxPartMs);
  if (L <= 0) return [];

  const n = Math.ceil(roundedDuration / L);

  if (n <= 1) {
    return [{ index: 0, startMs: 0, endMs: roundedDuration }];
  }

  const tail = roundedDuration - (n - 1) * L;

  if (tail < minTailMs) {
    // Balanced parts: n equal parts (remaining milliseconds spread over the first parts)
    const baseLen = Math.floor(roundedDuration / n);
    const rem = roundedDuration % n;

    const parts: StoryPart[] = [];
    let currentStart = 0;

    for (let i = 0; i < n; i++) {
      const partDuration = baseLen + (i < rem ? 1 : 0);
      const endMs = currentStart + partDuration;
      parts.push({
        index: i,
        startMs: currentStart,
        endMs,
      });
      currentStart = endMs;
    }

    return parts;
  }

  // Regular split: (n - 1) parts of length L, final part of length tail
  const parts: StoryPart[] = [];
  let currentStart = 0;

  for (let i = 0; i < n - 1; i++) {
    const endMs = currentStart + L;
    parts.push({
      index: i,
      startMs: currentStart,
      endMs,
    });
    currentStart = endMs;
  }

  parts.push({
    index: n - 1,
    startMs: currentStart,
    endMs: roundedDuration,
  });

  return parts;
}

/**
 * Validates manual cut-point edits.
 * Cut points are the internal split positions in milliseconds.
 * All parts must be within [minPartMs, maxPartMs] and cover [0, durationMs].
 */
export function validateStoryCutPoints(
  cutPointsMs: number[],
  durationMs: number,
  maxPartMs: number,
  minPartMs = 1000
): { valid: boolean; error?: string; parts: StoryPart[] } {
  if (durationMs <= 0) {
    return { valid: false, error: 'Invalid video duration', parts: [] };
  }

  // Sort and remove duplicates
  const sorted = Array.from(new Set(cutPointsMs.map((c) => Math.round(c)))).sort((a, b) => a - b);
  const allPoints = [0, ...sorted, Math.round(durationMs)];

  const parts: StoryPart[] = [];

  for (let i = 0; i < allPoints.length - 1; i++) {
    const startMs = allPoints[i];
    const endMs = allPoints[i + 1];
    const len = endMs - startMs;

    if (len < minPartMs) {
      return {
        valid: false,
        error: `Part ${i + 1} is too short (${(len / 1000).toFixed(1)}s). Each part must be at least ${(
          minPartMs / 1000
        ).toFixed(0)}s.`,
        parts: [],
      };
    }

    if (len > maxPartMs) {
      return {
        valid: false,
        error: `Part ${i + 1} exceeds max limit of ${(maxPartMs / 1000).toFixed(0)}s (${(
          len / 1000
        ).toFixed(1)}s).`,
        parts: [],
      };
    }

    parts.push({
      index: i,
      startMs,
      endMs,
    });
  }

  return { valid: true, parts };
}
