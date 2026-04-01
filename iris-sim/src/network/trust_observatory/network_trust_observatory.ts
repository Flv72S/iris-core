/**
 * Phase 13H — Network Trust Observatory. Main aggregator.
 */

import type { NodeReputationProfile } from '../reputation_engine/index.js';
import type { TrustGraph } from '../reputation_trust_graph/index.js';
import type { AnomalyReport } from '../anomaly_detection/index.js';
import type { NodeTrustState } from '../trust_recovery/index.js';
import type { TrustGovernanceEvent } from '../trust_governance_bridge/index.js';
import type { NetworkHealthReport, TrustDistributionReport, AnomalyActivityReport } from './observatory_types.js';
import { computeNetworkHealth } from './network_health_metrics.js';
import { analyzeTrustDistribution } from './trust_distribution_analyzer.js';
import { analyzeAnomalyActivity } from './anomaly_activity_monitor.js';

/**
 * Generate combined observatory report. Read-only; deterministic.
 */
export function generateNetworkObservatoryReport(
  reputations: readonly NodeReputationProfile[],
  _trust_graph: TrustGraph,
  anomalies: readonly AnomalyReport[],
  trust_states: readonly NodeTrustState[],
  governance_events: readonly TrustGovernanceEvent[],
  timestamp: number
): {
  health: NetworkHealthReport;
  distribution: TrustDistributionReport;
  anomaly_activity: AnomalyActivityReport;
} {
  return {
    health: computeNetworkHealth(
      reputations,
      anomalies,
      trust_states,
      governance_events,
      timestamp
    ),
    distribution: analyzeTrustDistribution(reputations, timestamp),
    anomaly_activity: analyzeAnomalyActivity(anomalies, timestamp),
  };
}
