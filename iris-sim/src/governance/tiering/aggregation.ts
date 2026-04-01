/**
 * Step 7A — Score aggregation. Geometric (anti-masking) or linear.
 */

import { clamp01 } from './normalization.js';
import type { NormalizedMetricVector } from './tieringModel.js';
import type { TieringModelConfig } from './tieringModel.js';

export function aggregateScore(
  vector: NormalizedMetricVector,
  weights: TieringModelConfig['weights'],
  geometric: boolean
): number {
  if (geometric) {
    const eps = 1e-10;
    const g =
      Math.pow(Math.max(eps, vector.flipStability), weights.flipStability) *
      Math.pow(Math.max(eps, vector.invariantIntegrity), weights.invariantIntegrity) *
      Math.pow(Math.max(eps, vector.entropyControl), weights.entropyControl) *
      Math.pow(Math.max(eps, vector.violationPressure), weights.violationPressure);
    return clamp01(g);
  }
  const linear =
    vector.flipStability * weights.flipStability +
    vector.invariantIntegrity * weights.invariantIntegrity +
    vector.entropyControl * weights.entropyControl +
    vector.violationPressure * weights.violationPressure;
  return clamp01(linear);
}
