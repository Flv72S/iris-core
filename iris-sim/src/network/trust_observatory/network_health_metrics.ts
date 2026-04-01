/**
 * Phase 13H — Network Trust Observatory. Global network health.
 */

import type { NodeReputationProfile } from '../reputation_engine/index.js';
import type { AnomalyReport } from '../anomaly_detection/index.js';
import type { NodeTrustState } from '../trust_recovery/index.js';
import { TrustState } from '../trust_recovery/index.js';
import type { TrustGovernanceEvent } from '../trust_governance_bridge/index.js';
import type { NetworkHealthReport } from './observatory_types.js';

/**
 * Compute global health metrics. Read-only; deterministic.
 */
export function computeNetworkHealth(
  reputations: readonly NodeReputationProfile[],
  anomalies: readonly AnomalyReport[],
  recovery_states: readonly NodeTrustState[],
  governance_events: readonly TrustGovernanceEvent[],
  timestamp: number
): NetworkHealthReport {
  const total_nodes = Math.max(1, reputations.length);
  const sumRep = reputations.reduce((s, r) => s + r.reputation_score, 0);
  const average_reputation = sumRep / total_nodes;

  const maxRep = reputations.length > 0
    ? Math.max(...reputations.map((r) => r.reputation_score))
    : 0;
  const trust_concentration_index =
    average_reputation > 0 ? maxRep / average_reputation : 0;

  const anomaly_rate = anomalies.length / total_nodes;

  const probationOrCooldown = recovery_states.filter(
    (s) => s.trust_state === TrustState.PROBATION || s.trust_state === TrustState.COOLDOWN
  ).length;
  const recovery_activity_rate = probationOrCooldown / total_nodes;

  const governance_event_rate = governance_events.length / total_nodes;

  return Object.freeze({
    timestamp,
    total_nodes,
    average_reputation,
    trust_concentration_index,
    anomaly_rate,
    recovery_activity_rate,
    governance_event_rate,
  });
}
