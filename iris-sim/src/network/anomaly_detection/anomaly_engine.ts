/**
 * Phase 13D — Anomaly Detection Engine. Orchestrator.
 * Phase 13XX-D — Multi-layer rule-based AnomalyEngine.
 */

import type { NodeBehaviorProfile } from '../behavior_monitoring/index.js';
import type { NormalizedBehaviorMetrics } from '../trust_normalization/index.js';
import type { NodeReputationProfile } from '../reputation_engine/index.js';
import type { TrustGraph } from '../reputation_trust_graph/index.js';
import type { AnomalyReport, AnomalySeverity } from './anomaly_types.js';
import type { AnomalyContext } from './anomaly_rule.js';
import type { AnomalyEvent } from './anomaly_event.js';
import type { AnomalyDetector } from './anomaly_detector.js';
import type { NodePassportUpdater } from '../node_passport/index.js';
import { detectActivityOutliers } from './outlier_detector.js';
import { detectConsensusManipulation } from './consensus_manipulation_detector.js';
import { detectTrustCollusion } from './trust_graph_anomaly_detector.js';
import { detectSybilPatterns } from './sybil_detector.js';

const HIGH_SEVERITY: AnomalySeverity[] = ['HIGH', 'CRITICAL'];

export interface AnomalyEngineOptions {
  onAnomalyRecorded?: (event: AnomalyEvent) => void;
}

/**
 * Multi-layer engine: detect anomalies, update node passport, emit observability.
 * Deterministic; timestamps from context.
 */
export class AnomalyEngine {
  constructor(
    private readonly detector: AnomalyDetector,
    private readonly passportUpdater: NodePassportUpdater,
    private readonly options: AnomalyEngineOptions = {}
  ) {}

  process(context: AnomalyContext): AnomalyEvent[] {
    const events = this.detector.detect(context);
    const detected_at = context.detected_at;
    const node_id = context.node_id;
    for (const event of events) {
      try {
        this.passportUpdater.recordAnomaly(node_id, detected_at);
        if (HIGH_SEVERITY.includes(event.severity)) {
          this.passportUpdater.applyGovernanceFlag(node_id, 'UNDER_REVIEW', detected_at);
        }
      } catch {
        // Passport may not exist for this node
      }
      this.options.onAnomalyRecorded?.(event);
    }
    return events;
  }
}

/**
 * Run all detectors and return merged report list, sorted by node_id then anomaly_type.
 */
export function detectNetworkAnomalies(
  behavior_profiles: readonly NodeBehaviorProfile[],
  normalized_metrics: readonly NormalizedBehaviorMetrics[],
  reputations: readonly NodeReputationProfile[],
  graph: TrustGraph,
  timestamp: number
): AnomalyReport[] {
  const all: AnomalyReport[] = [
    ...detectActivityOutliers(normalized_metrics, timestamp),
    ...detectConsensusManipulation(behavior_profiles, normalized_metrics, timestamp),
    ...detectTrustCollusion(graph, reputations, timestamp),
    ...detectSybilPatterns(normalized_metrics, reputations, graph, timestamp),
  ];
  return [...all].sort((a, b) => {
    const c = a.node_id.localeCompare(b.node_id);
    return c !== 0 ? c : String(a.anomaly_type).localeCompare(String(b.anomaly_type));
  });
}
