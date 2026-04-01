/**
 * Invalidation and Fallback Contract
 * Microstep 8.1.1 §5 — Duration and Reversibility
 *
 * ARCHITECTURAL: Every Phase 8 semantics MUST have invalidation conditions
 * and fallback to neutrality. No irreversible or non-cancellable semantics.
 */

/**
 * Component that holds Phase 8 semantics and MUST support invalidation
 * and fallback. When invalidated or fallback is requested, semantics
 * cease and only Phase 7 data remains.
 */
export interface InvalidatableSemantics {
  /**
   * Invalidate current overlay semantics. After this, consumer MUST treat
   * as Phase 7 pure (no residual semantic state).
   */
  invalidate(): void;

  /**
   * Restore neutral state: no Phase 8 interpretation. MUST NOT require
   * mutating Phase 7 data to "exit" Phase 8.
   */
  fallbackToNeutrality(): void;
}

/**
 * Conditions under which overlay MUST be considered invalid (8.1.1 §5).
 * Each semantic overlay MUST declare these.
 */
export type InvalidationCondition =
  | { kind: 'time'; expiresAt: number }
  | { kind: 'event'; eventType: string }
  | { kind: 'killSwitch' }
  | { kind: 'explicit' };

export const FALLBACK_CONTRACT =
  'Semantics MUST be reversible; fallback to neutrality MUST NOT mutate Phase 7.';
