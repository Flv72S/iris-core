/**
 * Phase 13J — Trust Pipeline Orchestrator. Output types.
 */

import type { NodeBehaviorProfile } from '../behavior_monitoring/index.js';
import type { NormalizedBehaviorMetrics } from '../trust_normalization/index.js';
import type { NodeReputationProfile } from '../reputation_engine/index.js';
import type { TrustGraph } from '../reputation_trust_graph/index.js';
import type { AnomalyReport } from '../anomaly_detection/index.js';
import type { RecoveryAction, NodeTrustState } from '../trust_recovery/index.js';
import type { TrustGovernanceEvent } from '../trust_governance_bridge/index.js';
import type {
  NetworkHealthReport,
  TrustDistributionReport,
  AnomalyActivityReport,
} from '../trust_observatory/observatory_types.js';
import type { TrustExplainabilityReport } from '../trust_explainability/explainability_types.js';

/** Combined observatory output (13H). */
export interface TrustObservatoryReport {
  readonly health: NetworkHealthReport;
  readonly distribution: TrustDistributionReport;
  readonly anomaly_activity: AnomalyActivityReport;
}

/**
 * Full output of the trust pipeline. Deterministic snapshot of trust intelligence results.
 */
export interface TrustPipelineResult {
  readonly timestamp: number;

  readonly behavior_profiles: readonly NodeBehaviorProfile[];
  readonly normalized_metrics: readonly NormalizedBehaviorMetrics[];

  readonly reputation_profiles: readonly NodeReputationProfile[];
  readonly trust_graph: TrustGraph;

  readonly anomaly_reports: readonly AnomalyReport[];

  readonly recovery_actions: readonly RecoveryAction[];
  readonly trust_states: readonly NodeTrustState[];

  readonly governance_events: readonly TrustGovernanceEvent[];

  readonly observatory_report: TrustObservatoryReport;
  readonly explainability_reports: readonly TrustExplainabilityReport[];
}
