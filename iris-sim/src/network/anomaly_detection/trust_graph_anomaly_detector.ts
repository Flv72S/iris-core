/**
 * Phase 13D — Anomaly Detection Engine. Trust graph collusion detection.
 */

import type { TrustGraph } from '../reputation_trust_graph/index.js';
import type { NodeReputationProfile } from '../reputation_engine/index.js';
import { AnomalyType, type AnomalyReport } from './anomaly_types.js';

const COLLUSION_THRESHOLD = 0.8;

/**
 * Find clusters where internal_edges/total_edges > 0.8; mark nodes with TRUST_COLLUSION_CLUSTER.
 */
export function detectTrustCollusion(
  graph: TrustGraph,
  _reputations: readonly NodeReputationProfile[],
  timestamp: number
): AnomalyReport[] {
  const nodeIds = [...graph.nodes.keys()].sort();
  if (nodeIds.length === 0) return [];

  const outEdges = new Map<string, { internal: number; total: number }>();
  for (const id of nodeIds) {
    outEdges.set(id, { internal: 0, total: 0 });
  }

  const nodeSet = new Set(nodeIds);
  for (const e of graph.edges) {
    const from = e.from_node;
    const data = outEdges.get(from);
    if (!data) continue;
    data.total += 1;
    if (nodeSet.has(e.to_node)) data.internal += 1;
  }

  const reports: AnomalyReport[] = [];
  for (const node_id of nodeIds) {
    const data = outEdges.get(node_id)!;
    if (data.total === 0) continue;
    const ratio = data.internal / data.total;
    if (ratio > COLLUSION_THRESHOLD) {
      reports.push(
        Object.freeze({
          node_id,
          anomaly_type: AnomalyType.TRUST_COLLUSION_CLUSTER,
          anomaly_score: Math.min(1, ratio),
          detection_timestamp: timestamp,
        })
      );
    }
  }
  return reports;
}
