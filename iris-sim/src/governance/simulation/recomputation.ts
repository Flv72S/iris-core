/**
 * Step 7D — Score recomputation using Step 7A aggregation model.
 */

import { TIERING_MODEL_V1 } from '../tiering/tieringModel.js';
import { aggregateScore } from '../tiering/aggregation.js';
import type { NormalizedMetricVector } from '../tiering/tieringModel.js';

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
}

/**
 * Recompute governance score from normalized metrics (same model as Step 7A).
 * Uses geometric aggregation, no structural floor or hard caps.
 */
export function rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo(
  normalizedMetrics: Record<string, number>
): number {
  const vector: NormalizedMetricVector = Object.freeze({
    flipStability: clamp01(normalizedMetrics.flipStability ?? 0.9),
    invariantIntegrity: clamp01(normalizedMetrics.invariantIntegrity ?? 0.9),
    entropyControl: clamp01(normalizedMetrics.entropyControl ?? 0.9),
    violationPressure: clamp01(normalizedMetrics.violationPressure ?? 0.9),
  });
  return aggregateScore(vector, TIERING_MODEL_V1.weights, TIERING_MODEL_V1.geometricAggregation);
}
