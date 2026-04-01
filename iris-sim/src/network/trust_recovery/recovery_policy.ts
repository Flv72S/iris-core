/**
 * Phase 13E — Trust Recovery Framework. Deterministic recovery policies.
 */

import { AnomalyType, type AnomalyReport } from '../anomaly_detection/index.js';
import type { NodeReputationProfile } from '../reputation_engine/index.js';
import { RecoveryActionType } from './recovery_types.js';

/**
 * Map anomaly type to recovery action. Deterministic.
 */
export function evaluateRecoveryPolicy(
  anomaly: AnomalyReport,
  _reputation: NodeReputationProfile
): RecoveryActionType {
  switch (anomaly.anomaly_type) {
    case AnomalyType.ACTIVITY_OUTLIER:
      return RecoveryActionType.ENTER_PROBATION;
    case AnomalyType.CONSENSUS_MANIPULATION:
      return RecoveryActionType.APPLY_COOLDOWN;
    case AnomalyType.TRUST_COLLUSION_CLUSTER:
      return RecoveryActionType.RESTRICT_NODE;
    case AnomalyType.SYBIL_INDICATOR:
      return RecoveryActionType.RESTRICT_NODE;
    default:
      return RecoveryActionType.ENTER_PROBATION;
  }
}
