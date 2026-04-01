/**
 * Phase 13I — Trust Explainability Engine. Recovery state explanation.
 */

import type { NodeTrustState } from '../trust_recovery/index.js';
import { TrustState } from '../trust_recovery/index.js';
import type { RecoveryExplanation } from './explainability_types.js';

function reasonForState(trust_state: TrustState): string {
  switch (trust_state) {
    case TrustState.PROBATION:
      return 'activity_outlier_probation';
    case TrustState.COOLDOWN:
      return 'consensus_manipulation_cooldown';
    case TrustState.RESTRICTED:
      return 'sybil_cluster_restriction';
    case TrustState.TRUSTED:
      return 'trusted';
    default:
      return String(trust_state).toLowerCase();
  }
}

/**
 * Explain recovery state. previous_state not available in NodeTrustState so null. Deterministic.
 */
export function explainRecoveryState(node: NodeTrustState): RecoveryExplanation | null {
  return Object.freeze({
    node_id: node.node_id,
    trust_state: String(node.trust_state),
    recovery_reason: reasonForState(node.trust_state),
    previous_state: null,
  });
}
