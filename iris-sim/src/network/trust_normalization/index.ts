/**
 * Phase 13F — Trust Data Normalization Layer.
 * Transforms raw behavior metrics into normalized, comparable trust metrics.
 */

export type { NormalizedBehaviorMetrics } from './trust_normalization_types.js';
export { computeActivityBaseline } from './baseline_engine.js';
export {
  normalizeBehaviorProfile,
  normalizeBehaviorProfiles,
} from './normalization_engine.js';
export { applyTemporalSmoothing } from './smoothing_engine.js';
