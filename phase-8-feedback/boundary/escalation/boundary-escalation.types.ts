/**
 * Phase 8.3 — Boundary Escalation (declarative, immutable)
 */

export type BoundaryEscalationLevel =
  | 'NONE'
  | 'OBSERVE'
  | 'REVIEW'
  | 'BLOCK_RECOMMENDED';

export interface BoundaryEscalationEvent {
  readonly level: BoundaryEscalationLevel;
  readonly checklistStatus: 'SAFE' | 'WARNING' | 'UNSAFE';
  readonly violatedRules: readonly string[];
  readonly explanation: string;
  readonly deterministicHash: string;
}
