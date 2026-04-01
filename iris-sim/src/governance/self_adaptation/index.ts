/**
 * Step 8C — Governance Self-Adaptation Engine. Deterministic behavioral regulation.
 */

export type {
  AutonomyLevel,
  AdaptationProfile,
  AdaptationSnapshot,
} from './types/adaptation_types.js';

export { getAdaptationProfileForTier } from './profiles/adaptation_profiles.js';

export { computeAutonomyLevel } from './strategies/autonomy_strategy.js';
export { computeAuditMultiplier } from './strategies/audit_strategy.js';
export { resolveAllowedFeatures } from './strategies/feature_strategy.js';
export { computeSafetyConstraintLevel } from './strategies/safety_strategy.js';

export { computeAdaptationSnapshot } from './engine/self_adaptation_engine.js';

export type { AdaptationSnapshotWithHash } from './snapshot/adaptation_snapshot.js';
export { withAdaptationHash } from './snapshot/adaptation_snapshot.js';
