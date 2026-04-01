/**
 * Feature Flag Invalid Tests (STEP 6C)
 *
 * Valore invalido => abort startup (throw).
 */

import { describe, it, expect } from 'vitest';
import { loadFeatureFlagsFromEnv } from '../featureFlags/loadFeatureFlags';

describe('Feature Flags - Invalid', () => {
  it('valore invalido => throw', () => {
    const env: any = {
      FEATURE_THREADS_ENABLED: 'maybe',
      FEATURE_SYNC_ENABLED: 'true',
    };

    expect(() => loadFeatureFlagsFromEnv(env)).toThrow(/must be 'true' or 'false'/);
  });
});

