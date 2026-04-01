/**
 * Semantic Overlay Contract
 * Microstep 8.1.1 — Semantic Scope Definition
 *
 * ARCHITECTURAL: Every Phase 8 semantics MUST be overlay: derived, reversible,
 * disactivable. NOT source of truth. Source of truth remains Phase 7.
 *
 * Each overlay MUST declare: duration, invalidation conditions, kill-switch
 * behavior, fallback to neutrality.
 */

import type { Phase7ReadOnly } from './phase7-readonly';

/**
 * Duration of validity for a semantic overlay.
 * MUST be declared for every overlay (8.1.1 section 5).
 */
export type OverlayDuration =
  | { kind: 'until'; invalidateAt: number }
  | { kind: 'ttl'; ttlMs: number }
  | { kind: 'event'; invalidateOnEvent: string }
  | { kind: 'explicit'; invalidateOnlyByCall: true };

/**
 * Semantic overlay over Phase 7 base data.
 * TBase = readonly Phase 7 shape. TOverlay = Phase 8-only semantics.
 * Rule: base is NEVER mutated. overlay is optional and removable.
 */
export interface SemanticOverlay<TBase, TOverlay = unknown> {
  readonly base: Phase7ReadOnly<TBase>;
  readonly overlay: TOverlay | null;
  readonly duration: OverlayDuration;
  readonly fallbackToNeutrality: true;
}

/**
 * Builds overlay container. When kill-switch is off or overlay is invalid,
 * consumers MUST use only .base and ignore .overlay.
 */
export function createSemanticOverlay<TBase, TOverlay>(
  base: Phase7ReadOnly<TBase>,
  overlay: TOverlay | null,
  duration: OverlayDuration
): SemanticOverlay<TBase, TOverlay> {
  return Object.freeze({
    base,
    overlay,
    duration,
    fallbackToNeutrality: true as const,
  });
}

/**
 * Neutral view: no overlay. Behavior MUST be identical to Phase 7 pure.
 */
export function neutralOverlay<TBase>(base: Phase7ReadOnly<TBase>): SemanticOverlay<TBase, never> {
  return createSemanticOverlay(base, null, { kind: 'explicit', invalidateOnlyByCall: true });
}
