/**
 * Step 7A — Governance Maturity Engine. Certifiable enterprise core.
 */

export type { TieringModelVersion, TieringModelConfig, NormalizedMetricVector } from './tieringModel.js';
export { TIERING_MODEL_V1, validateTieringConfig } from './tieringModel.js';
export { clamp01, normalizeLinear, normalizeLog, normalizeExp } from './normalization.js';
export { applyTemporalDecay } from './decay.js';
export { applyStructuralFloor } from './structuralFloor.js';
export type { StructuralFloorResult } from './structuralFloor.js';
export { aggregateScore } from './aggregation.js';
export type { GovernanceSnapshotForTiering } from './hardCaps.js';
export type { HardCapsResult } from './hardCaps.js';
export { applyHardCaps } from './hardCaps.js';
export type { GovernanceTier, TierState } from './hysteresis.js';
export { computeTierWithHysteresis, tierFromScore, tierOneBelow } from './hysteresis.js';
export type { CommercialSLAProfile } from './slaMapping.js';
export { mapTierToSLA } from './slaMapping.js';
export type { GovernanceTierSnapshot } from './snapshot.js';
export { generateTierSnapshot } from './snapshot.js';
export { buildNormalizedVector } from './metricsVector.js';
export type { TieringMetricsInput } from './metricsVector.js';
