import { describe, expect, it } from './testHelper';
import { computeCrop } from '../crop';
import cropVectors from './vectors/crop_vectors.json';

describe('computeCrop domain logic', () => {
  it('passes all fixed crop test vectors', () => {
    for (const vector of cropVectors) {
      const result = computeCrop(
        vector.sourceW,
        vector.sourceH,
        vector.targetRatio,
        vector.crop
      );
      expect(result.x).toBe(vector.expected.x);
      expect(result.y).toBe(vector.expected.y);
      expect(result.w).toBe(vector.expected.w);
      expect(result.h).toBe(vector.expected.h);

      // Verify that crop stays entirely within source frame
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.x + result.w).toBeLessThanOrEqual(vector.sourceW);
      expect(result.y + result.h).toBeLessThanOrEqual(vector.sourceH);
    }
  });

  it('clamps coordinates correctly when center is out of bounds', () => {
    const res = computeCrop(1920, 1080, 1.0, { cx: 1.5, cy: -0.5, zoom: 1 });
    expect(res.x).toBeLessThanOrEqual(1920 - 1080);
    expect(res.y).toBe(0);
    expect(res.w).toBe(1080);
    expect(res.h).toBe(1080);
  });

  it('throws for invalid dimensions or ratios', () => {
    expect(() => computeCrop(0, 1080, 1.0)).toThrow();
    expect(() => computeCrop(1920, -10, 1.0)).toThrow();
    expect(() => computeCrop(1920, 1080, 0)).toThrow();
  });
});
