/**
 * Phase 11H — Deterministic governance execution stage ordering.
 */

import type { FederationExecutionStage } from './federation_orchestration_types.js';

export const GOVERNANCE_EXECUTION_ORDER: readonly FederationExecutionStage[] = Object.freeze([
  'TRUST_EVALUATION',
  'CERTIFICATION',
  'PREDICTIVE_ANALYSIS',
  'AUDIT',
  'CONSENSUS_FINALIZATION',
]);

/**
 * Return the next stage in execution order, or null after CONSENSUS_FINALIZATION.
 * Deterministic: null → TRUST_EVALUATION; otherwise next in order.
 */
export function getNextExecutionStage(
  current_stage: FederationExecutionStage | null
): FederationExecutionStage | null {
  if (current_stage === null) return 'TRUST_EVALUATION';
  const idx = GOVERNANCE_EXECUTION_ORDER.indexOf(current_stage);
  if (idx < 0 || idx >= GOVERNANCE_EXECUTION_ORDER.length - 1) return null;
  return GOVERNANCE_EXECUTION_ORDER[idx + 1];
}
