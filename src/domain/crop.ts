import { CropBox, CropCoordinates } from './types';

/**
 * Computes a crop window {x, y, w, h} in source pixels, clamped inside the source frame,
 * maintaining the exact target ratio.
 *
 * @param sourceW Width of the source image/video in pixels (> 0)
 * @param sourceH Height of the source image/video in pixels (> 0)
 * @param targetRatio Desired width / height aspect ratio (> 0)
 * @param crop Optional center coordinates (cx, cy in 0..1) and zoom factor (>= 1)
 * @returns Bounding box {x, y, w, h} within the source frame
 */
export function computeCrop(
  sourceW: number,
  sourceH: number,
  targetRatio: number,
  crop?: Partial<CropCoordinates>
): CropBox {
  if (sourceW <= 0 || sourceH <= 0) {
    throw new Error(`Invalid source dimensions: ${sourceW}x${sourceH}`);
  }
  if (targetRatio <= 0) {
    throw new Error(`Invalid target aspect ratio: ${targetRatio}`);
  }

  const cx = Math.max(0, Math.min(1, crop?.cx ?? 0.5));
  const cy = Math.max(0, Math.min(1, crop?.cy ?? 0.5));
  const zoom = Math.max(1, crop?.zoom ?? 1);

  const sourceRatio = sourceW / sourceH;

  let baseW: number;
  let baseH: number;

  if (sourceRatio > targetRatio) {
    // Source is wider than target ratio: crop horizontally
    baseH = sourceH;
    baseW = sourceH * targetRatio;
  } else {
    // Source is taller than target ratio: crop vertically
    baseW = sourceW;
    baseH = sourceW / targetRatio;
  }

  // Zoom scales down the crop box size
  const w = baseW / zoom;
  const h = baseH / zoom;

  // Center point in source pixels
  const px = cx * sourceW;
  const py = cy * sourceH;

  // Top-left origin
  const rawX = px - w / 2;
  const rawY = py - h / 2;

  // Clamped inside source bounds [0, sourceW - w] and [0, sourceH - h]
  const clampedX = Math.max(0, Math.min(sourceW - w, rawX));
  const clampedY = Math.max(0, Math.min(sourceH - h, rawY));

  return {
    x: Math.round(clampedX),
    y: Math.round(clampedY),
    w: Math.round(w),
    h: Math.round(h),
  };
}

/**
 * Returns float precision crop box if exact subpixel coordinates are required.
 */
export function computeCropPrecise(
  sourceW: number,
  sourceH: number,
  targetRatio: number,
  crop?: Partial<CropCoordinates>
): CropBox {
  const cx = Math.max(0, Math.min(1, crop?.cx ?? 0.5));
  const cy = Math.max(0, Math.min(1, crop?.cy ?? 0.5));
  const zoom = Math.max(1, crop?.zoom ?? 1);

  const sourceRatio = sourceW / sourceH;

  let baseW: number;
  let baseH: number;

  if (sourceRatio > targetRatio) {
    baseH = sourceH;
    baseW = sourceH * targetRatio;
  } else {
    baseW = sourceW;
    baseH = sourceW / targetRatio;
  }

  const w = baseW / zoom;
  const h = baseH / zoom;

  const px = cx * sourceW;
  const py = cy * sourceH;

  const rawX = px - w / 2;
  const rawY = py - h / 2;

  const x = Math.max(0, Math.min(sourceW - w, rawX));
  const y = Math.max(0, Math.min(sourceH - h, rawY));

  return { x, y, w, h };
}
