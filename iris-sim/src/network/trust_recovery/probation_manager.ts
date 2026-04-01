/**
 * Phase 13E — Trust Recovery Framework. Probation state.
 */

import { TrustState, type NodeTrustState } from './recovery_types.js';

/**
 * Set node to PROBATION; trust weight effectively reduced.
 */
export function applyProbation(node: NodeTrustState, timestamp: number): NodeTrustState {
  return Object.freeze({
    node_id: node.node_id,
    trust_state: TrustState.PROBATION,
    reputation_score: node.reputation_score,
    state_timestamp: timestamp,
  });
}
