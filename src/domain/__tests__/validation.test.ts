import { describe, expect, it } from './testHelper';
import { validateMedia, validateMediaAsset } from '../validation';
import { targetsFor } from '../specs';
import { MediaAsset, PlatformType, PostType } from '../types';
import validationVectors from './vectors/validation_vectors.json';

describe('validateMedia domain logic', () => {
  it('matches all fixed validation vectors', () => {
    for (const vector of validationVectors) {
      const asset = vector.asset as MediaAsset;
      const platform = vector.platform as PlatformType;
      const postType = vector.postType as PostType;

      const result = validateMediaAsset(asset, platform, postType);
      expect(result.passed).toBe(vector.expectedPass);

      const failedIds = result.checks
        .filter((c) => c.status === 'fail')
        .map((c) => c.id);

      for (const expectedFailId of vector.failedCheckIds) {
        expect(failedIds).toContain(expectedFailId);
      }
    }
  });

  it('verifies targetsFor function', () => {
    expect(targetsFor('story')).toEqual(['instagram', 'facebook']);
    expect(targetsFor('post')).toEqual(['linkedin', 'instagram', 'facebook', 'tiktok']);
  });
});
