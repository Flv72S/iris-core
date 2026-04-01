/**
 * Phase 8 Architectural Contracts
 * Microsteps 8.1.0 + 8.1.1
 *
 * These contracts are VINCOLANTI. No Phase 8 component may violate them.
 * - phase7-readonly: Phase 8 MUST NOT mutate or extend Phase 7.
 * - overlay: Semantics MUST be overlay, reversible, disactivable.
 * - kill-switch: Every component MUST be disactivable.
 * - invalidation: Semantics MUST support invalidation and fallback to neutrality.
 */

export {
  type Phase7ReadOnly,
  type DeepPhase7ReadOnly,
  PHASE7_READONLY_CONTRACT,
} from './phase7-readonly';

export {
  type OverlayDuration,
  type SemanticOverlay,
  createSemanticOverlay,
  neutralOverlay,
} from './overlay';

export {
  type Phase8ComponentId,
  type Phase8KillSwitchRegistry,
  type Phase8KillSwitchAware,
  KILL_SWITCH_REQUIRED,
} from './kill-switch';

export {
  type InvalidatableSemantics,
  type InvalidationCondition,
  FALLBACK_CONTRACT,
} from './invalidation';
