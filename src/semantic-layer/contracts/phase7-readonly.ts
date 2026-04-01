/**
 * Phase 7 Read-Only Contract
 * Microstep 8.1.0 — Non-Contamination Guardrails
 *
 * ARCHITECTURAL: Phase 8 MUST consume Phase 7 data ONLY as read-only.
 * MUST NOT modify, extend, or reinterpret Phase 7 types (tokens, balance,
 * availability, Read Model 7.5, limits 7.6, UX contracts 7.4.x).
 *
 * This file defines the CONTRACT and type-level enforcement. It does NOT
 * define Phase 7 domain types (those remain in core/read-platform).
 */

/**
 * Marks a type as the read-only view that Phase 8 is allowed to hold.
 * Use this when storing or passing "Phase 7 data" inside the semantic layer.
 * Mutations are not expressible on this surface.
 *
 * Rule: SemanticLayer MUST NOT write to, extend, or replace Phase 7 data.
 */
export type Phase7ReadOnly<T> = Readonly<T>;

/**
 * Helper: deep readonly for nested structures coming from Phase 7.
 * Use when the overlay receives DTOs from Read Model (7.5) or queries.
 */
export type DeepPhase7ReadOnly<T> = T extends object
  ? { readonly [K in keyof T]: DeepPhase7ReadOnly<T[K]> }
  : T;

/**
 * Contract assertion (documentation + type guard).
 * Code in semantic-layer MUST treat any value coming from Phase 7 as
 * Phase7ReadOnly; MUST NOT assign back to Phase 7 or mutate.
 */
export const PHASE7_READONLY_CONTRACT =
  'Phase 8 MUST NOT mutate or extend Phase 7. Read-only consumption only.';
