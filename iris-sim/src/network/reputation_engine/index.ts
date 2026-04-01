/**
 * Phase 13A — Node Reputation Engine.
 * Deterministic reputation scores from normalized behavior metrics.
 */

export type { NodeReputationProfile, ReputationWeights } from './reputation_types.js';
export { DEFAULT_REPUTATION_WEIGHTS } from './reputation_types.js';
export { computeReputationScore } from './reputation_calculator.js';
export { applyReputationDecay } from './reputation_decay_engine.js';
export {
  computeNodeReputation,
  computeReputationBatch,
} from './reputation_engine.js';
