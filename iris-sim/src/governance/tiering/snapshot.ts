/**
 * Step 7A — Immutable certifiable tier snapshot.
 */

import type { TieringModelConfig, TieringModelVersion, NormalizedMetricVector } from './tieringModel.js';
import { TIERING_MODEL_V1 } from './tieringModel.js';
import { buildNormalizedVector } from './metricsVector.js';
import { applyStructuralFloor } from './structuralFloor.js';
import { aggregateScore } from './aggregation.js';
import type { GovernanceSnapshotForTiering } from './hardCaps.js';
import { applyHardCaps } from './hardCaps.js';
import type { TierState, GovernanceTier } from './hysteresis.js';
import { computeTierWithHysteresis } from './hysteresis.js';
import { clamp01 } from './normalization.js';

export interface GovernanceTierSnapshot {
  readonly modelVersion: TieringModelVersion;
  readonly score: number;
  readonly tier: GovernanceTier;
  readonly computedAt: number;
  readonly normalizedMetrics: NormalizedMetricVector;
  readonly hardCapApplied: boolean;
  readonly structuralCapApplied: boolean;
}

export function generateTierSnapshot(
  snapshot: GovernanceSnapshotForTiering,
  state: TierState,
  config: TieringModelConfig = TIERING_MODEL_V1
): GovernanceTierSnapshot {
  const computedAt = Date.now();

  const metricsInput: { flipRate?: number; entropyIndex?: number; invariantViolationCount?: number; violationFrequency?: number } = {};
  if (snapshot.flipRate !== undefined) metricsInput.flipRate = snapshot.flipRate;
  if (snapshot.entropyIndex !== undefined) metricsInput.entropyIndex = snapshot.entropyIndex;
  if (snapshot.invariantViolationCount !== undefined) metricsInput.invariantViolationCount = snapshot.invariantViolationCount;
  if (snapshot.violationFrequency !== undefined) metricsInput.violationFrequency = snapshot.violationFrequency;
  let vector = buildNormalizedVector(metricsInput, config);

  const floorResult = config.structuralFloorEnabled
    ? applyStructuralFloor(vector, true)
    : { adjustedVector: vector, structuralCapTier: null, globalPenalty: 0 };
  vector = floorResult.adjustedVector;

  let score = aggregateScore(vector, config.weights, config.geometricAggregation);
  if (floorResult.globalPenalty > 0) {
    score = clamp01(score - floorResult.globalPenalty);
  }

  const capsResult = applyHardCaps(score, snapshot, config.hardCaps);
  score = capsResult.adjustedScore;
  const hardCapApplied = capsResult.hardCapTier !== null;

  const tier = computeTierWithHysteresis(
    score,
    state,
    capsResult.hardCapTier,
    floorResult.structuralCapTier
  );
  const structuralCapApplied = floorResult.structuralCapTier !== null;

  return Object.freeze({
    modelVersion: config.version,
    score,
    tier,
    computedAt,
    normalizedMetrics: vector,
    hardCapApplied,
    structuralCapApplied,
  });
}
