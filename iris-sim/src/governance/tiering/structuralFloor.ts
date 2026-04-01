/**
 * Step 7A — Structural floor (anti-gaming). Metric floor and structural caps.
 */

import { clamp01 } from './normalization.js';
import type { NormalizedMetricVector } from './tieringModel.js';
import type { GovernanceTier } from './hysteresis.js';

const METRIC_FLOOR = 0.2;
const LOW_THRESHOLD = 0.25;
const GLOBAL_PENALTY_THRESHOLD = 0.4;
const GLOBAL_PENALTY_PCT = 0.1;
const MIN_METRICS_UNDER_25 = 2;
const MIN_METRICS_UNDER_40 = 3;

export interface StructuralFloorResult {
  readonly adjustedVector: NormalizedMetricVector;
  readonly structuralCapTier: GovernanceTier | null;
  readonly globalPenalty: number;
}

function countUnder(vector: NormalizedMetricVector, threshold: number): number {
  let n = 0;
  if (vector.flipStability < threshold) n++;
  if (vector.invariantIntegrity < threshold) n++;
  if (vector.entropyControl < threshold) n++;
  if (vector.violationPressure < threshold) n++;
  return n;
}

export function applyStructuralFloor(
  vector: NormalizedMetricVector,
  structuralFloorEnabled: boolean
): StructuralFloorResult {
  if (!structuralFloorEnabled) {
    return {
      adjustedVector: vector,
      structuralCapTier: null,
      globalPenalty: 0,
    };
  }

  const lift = (v: number): number => (v < METRIC_FLOOR ? METRIC_FLOOR : v);
  const adjustedVector: NormalizedMetricVector = Object.freeze({
    flipStability: clamp01(lift(vector.flipStability)),
    invariantIntegrity: clamp01(lift(vector.invariantIntegrity)),
    entropyControl: clamp01(lift(vector.entropyControl)),
    violationPressure: clamp01(lift(vector.violationPressure)),
  });

  const under25 = countUnder(adjustedVector, LOW_THRESHOLD);
  const structuralCapTier: GovernanceTier | null =
    under25 >= MIN_METRICS_UNDER_25 ? 'TIER_2_CONTROLLED' : null;

  const under40 = countUnder(adjustedVector, GLOBAL_PENALTY_THRESHOLD);
  const globalPenalty = under40 >= MIN_METRICS_UNDER_40 ? GLOBAL_PENALTY_PCT : 0;

  return Object.freeze({
    adjustedVector,
    structuralCapTier,
    globalPenalty,
  });
}
