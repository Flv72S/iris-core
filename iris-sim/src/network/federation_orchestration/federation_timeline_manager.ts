/**
 * Phase 11H — Federation timeline manager. Builds deterministic stage snapshots.
 */

import type { FederationExecutionStage, FederationStageSnapshot } from './federation_orchestration_types.js';
import { GOVERNANCE_EXECUTION_ORDER } from './governance_execution_stage.js';

/**
 * Build federation timeline: one snapshot per stage, ordered by GOVERNANCE_EXECUTION_ORDER,
 * status COMPLETED, timestamps increasing deterministically.
 */
export function buildFederationTimeline(
  stages: readonly FederationExecutionStage[],
  timestamp: number
): FederationStageSnapshot[] {
  const orderSet = new Set(GOVERNANCE_EXECUTION_ORDER);
  const sorted = [...stages].filter((s) => orderSet.has(s));
  sorted.sort((a, b) => GOVERNANCE_EXECUTION_ORDER.indexOf(a) - GOVERNANCE_EXECUTION_ORDER.indexOf(b));
  const seen = new Set<FederationExecutionStage>();
  const deduped: FederationExecutionStage[] = [];
  for (const s of sorted) {
    if (!seen.has(s)) {
      seen.add(s);
      deduped.push(s);
    }
  }
  return deduped.map((stage, i) =>
    Object.freeze({
      stage,
      status: 'COMPLETED' as const,
      timestamp: timestamp + i,
    })
  );
}
