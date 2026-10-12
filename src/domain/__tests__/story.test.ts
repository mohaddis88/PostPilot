import { describe, expect, it } from './testHelper';
import { planStoryParts } from '../story';
import storyVectors from './vectors/story_vectors.json';

describe('planStoryParts domain logic', () => {
  it('matches all fixed story split vectors', () => {
    for (const vector of storyVectors) {
      const parts = planStoryParts(
        vector.durationMs,
        vector.maxPartMs,
        vector.preferredMs,
        vector.minTailMs
      );

      expect(parts.length).toBe(vector.expected.length);
      for (let i = 0; i < parts.length; i++) {
        expect(parts[i].index).toBe(vector.expected[i].index);
        expect(parts[i].startMs).toBe(vector.expected[i].startMs);
        expect(parts[i].endMs).toBe(vector.expected[i].endMs);
      }
    }
  });

  it('guarantees parts are contiguous and span full duration', () => {
    const duration = 145000;
    const maxPart = 60000;
    const parts = planStoryParts(duration, maxPart, 30000, 5000);

    expect(parts[0].startMs).toBe(0);
    expect(parts[parts.length - 1].endMs).toBe(duration);

    for (let i = 0; i < parts.length; i++) {
      const len = parts[i].endMs - parts[i].startMs;
      expect(len).toBeLessThanOrEqual(maxPart);
      expect(len).toBeGreaterThanOrEqual(5000);

      if (i > 0) {
        expect(parts[i].startMs).toBe(parts[i - 1].endMs);
      }
    }
  });

  it('handles zero or negative durations', () => {
    expect(planStoryParts(0, 60000)).toEqual([]);
    expect(planStoryParts(-500, 60000)).toEqual([]);
  });
});
