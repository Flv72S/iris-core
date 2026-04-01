/**
 * Phase 13E — Trust Recovery Framework. Cooldown and trust restoration.
 */

import { TrustState, type NodeTrustState } from './recovery_types.js';

const RESTORE_REPUTATION_THRESHOLD = 0.5;

/**
 * Set node to COOLDOWN; temporary reduction of influence, no reputation growth.
 */
export function applyCooldown(node: NodeTrustState, timestamp: number): NodeTrustState {
  return Object.freeze({
    node_id: node.node_id,
    trust_state: TrustState.COOLDOWN,
    reputation_score: node.reputation_score,
    state_timestamp: timestamp,
  });
}

/**
 * Restore trust: COOLDOWN → PROBATION, PROBATION (with score ≥ threshold) → TRUSTED.
 */
export function restoreTrust(node: NodeTrustState, timestamp: number): NodeTrustState {
  if (node.trust_state === TrustState.COOLDOWN) {
    return Object.freeze({
      node_id: node.node_id,
      trust_state: TrustState.PROBATION,
      reputation_score: node.reputation_score,
      state_timestamp: timestamp,
    });
  }
  if (node.trust_state === TrustState.PROBATION && node.reputation_score >= RESTORE_REPUTATION_THRESHOLD) {
    return Object.freeze({
      node_id: node.node_id,
      trust_state: TrustState.TRUSTED,
      reputation_score: node.reputation_score,
      state_timestamp: timestamp,
    });
  }
  return node;
}
