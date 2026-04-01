/**
 * Semantic Layer (Phase 8) — Structural Boundary
 * Microsteps 8.1.0 + 8.1.1
 *
 * ARCHITECTURAL BOUNDARY:
 * - This layer is Phase 8. It MUST depend on Phase 7 (core, read-platform) READ-ONLY.
 * - Phase 7 MUST NOT depend on this layer. Dependency is unidirectional: 8 -> 7.
 *
 * WHAT THIS LAYER CONTAINS:
 * - Contracts: read-only Phase 7 consumption, overlay, kill-switch, invalidation.
 * - Primitives: SemanticOverlay, Phase8KillSwitchRegistry, fallback to neutrality.
 *
 * WHAT THIS LAYER DOES NOT CONTAIN:
 * - No user-facing features. No optimization. No explanation of Phase 7.
 * - No new semantic categories beyond those explicitly allowed in 8.1.1.
 * - Vocabulary: only terms declared in 8.1.2 (vocabulary/) are allowed.
 * - No mutation or extension of Phase 7 types or Read Model.
 *
 * When ALL Phase 8 is disabled (kill-switch), system MUST behave identically to Phase 7 pure.
 */

export {
  type Phase7ReadOnly,
  type DeepPhase7ReadOnly,
  PHASE7_READONLY_CONTRACT,
  type OverlayDuration,
  type SemanticOverlay,
  createSemanticOverlay,
  neutralOverlay,
  type Phase8ComponentId,
  type Phase8KillSwitchRegistry,
  type Phase8KillSwitchAware,
  KILL_SWITCH_REQUIRED,
  type InvalidatableSemantics,
  type InvalidationCondition,
  FALLBACK_CONTRACT,
} from './contracts';

export { Phase8KillSwitchRegistryImpl } from './kill-switch';

export {
  type SemanticStateId,
  type SemanticState,
  type SemanticContext,
  type SemanticRanking,
  type SemanticMemory,
  type SemanticExplanation,
  type SemanticPolicy,
  type Disableable,
  FORBIDDEN_SEMANTIC_TERMS,
  isForbiddenTerm,
} from './vocabulary';

export {
  type SemanticInput,
  type SemanticSnapshot,
  createEmptySnapshot,
  isEmptySnapshot,
  type SemanticModule,
  SEMANTIC_ENGINE_COMPONENT_ID,
  isSemanticEngineEnabled,
  SemanticEngine,
} from './engine';
