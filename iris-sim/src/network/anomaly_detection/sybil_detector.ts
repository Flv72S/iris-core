/**
 * Phase 13D — Anomaly Detection Engine. Sybil pattern detection.
 */

import type { NormalizedBehaviorMetrics } from '../trust_normalization/index.js';
import type { NodeReputationProfile } from '../reputation_engine/index.js';
import type { TrustGraph } from '../reputation_trust_graph/index.js';
import { AnomalyType, type AnomalyReport } from './anomaly_types.js';

const REP_DIFF_THRESHOLD = 0.02;
const METRIC_SIMILARITY_THRESHOLD = 0.9;

function metricSimilarity(a: NormalizedBehaviorMetrics, b: NormalizedBehaviorMetrics): number {
  const d1 = Math.abs(a.normalized_activity_score - b.normalized_activity_score);
  const d2 = Math.abs(a.normalized_consensus_score - b.normalized_consensus_score);
  const d3 = Math.abs(a.normalized_validation_score - b.normalized_validation_score);
  const d4 = Math.abs(a.normalized_governance_score - b.normalized_governance_score);
  const avgDiff = (d1 + d2 + d3 + d4) / 4;
  return 1 - avgDiff;
}

function repScore(repMap: Map<string, number>, id: string): number {
  return repMap.get(id) ?? 0;
}

/** Mutual trust: both A->B and B->A exist in graph. */
function hasMutualTrust(graph: TrustGraph, a: string, b: string): boolean {
  const ab = graph.edges.some((e) => e.from_node === a && e.to_node === b);
  const ba = graph.edges.some((e) => e.from_node === b && e.to_node === a);
  return ab && ba;
}

/**
 * Flag groups where |repA-repB|<0.02, metric similarity > 0.9, and mutual trust exists.
 */
export function detectSybilPatterns(
  metrics: readonly NormalizedBehaviorMetrics[],
  reputations: readonly NodeReputationProfile[],
  graph: TrustGraph,
  timestamp: number
): AnomalyReport[] {
  const repMap = new Map<string, number>();
  for (const r of reputations) repMap.set(r.node_id, r.reputation_score);

  const metricMap = new Map<string, NormalizedBehaviorMetrics>();
  for (const m of metrics) metricMap.set(m.node_id, m);

  const reported = new Set<string>();
  const reports: AnomalyReport[] = [];
  const ids = [...metricMap.keys()].sort();

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]!;
      const b = ids[j]!;
      const ma = metricMap.get(a);
      const mb = metricMap.get(b);
      if (!ma || !mb) continue;
      const repDiff = Math.abs(repScore(repMap, a) - repScore(repMap, b));
      const sim = metricSimilarity(ma, mb);
      if (repDiff < REP_DIFF_THRESHOLD && sim > METRIC_SIMILARITY_THRESHOLD && hasMutualTrust(graph, a, b)) {
        for (const id of [a, b]) {
          if (reported.has(id)) continue;
          reported.add(id);
          const clusterScore = Math.min(1, 0.5 + sim * 0.5);
          reports.push(
            Object.freeze({
              node_id: id,
              anomaly_type: AnomalyType.SYBIL_INDICATOR,
              anomaly_score: clusterScore,
              detection_timestamp: timestamp,
            })
          );
        }
      }
    }
  }
  return reports;
}
