/**
 * ExecutionSemanticBlocker - C.4.B
 * Blocco dichiarativo. Nessuna esecuzione.
 */

export const EXECUTION_SEMANTIC_BLOCKER_REASONS = [
  'DIGITAL_WELLBEING',
  'FOCUS_MODE',
  'MISSING_CAPABILITY',
  'MISSING_ADAPTER',
  'POLICY_CONSTRAINT',
] as const;

export type ExecutionSemanticBlockerReason = (typeof EXECUTION_SEMANTIC_BLOCKER_REASONS)[number];

export interface ExecutionSemanticBlocker {
  readonly blockerId: string;
  readonly actionPlanId: string;
  readonly reason: ExecutionSemanticBlockerReason;
  readonly description: string;
  readonly declaredAt: string;
}
