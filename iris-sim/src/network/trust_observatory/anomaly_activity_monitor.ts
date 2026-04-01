/**
 * Phase 13H — Network Trust Observatory. Anomaly activity analytics.
 */

import type { AnomalyReport } from '../anomaly_detection/index.js';
import type { AnomalyActivityReport } from './observatory_types.js';

/**
 * Group anomalies by type, count occurrences, count affected nodes. Deterministic; keys alphabetical.
 */
export function analyzeAnomalyActivity(
  anomalies: readonly AnomalyReport[],
  timestamp: number
): AnomalyActivityReport {
  const byType = new Map<string, number>();
  const nodeIds = new Set<string>();

  for (const a of anomalies) {
    const key = String(a.anomaly_type);
    byType.set(key, (byType.get(key) ?? 0) + 1);
    nodeIds.add(a.node_id);
  }

  const sortedKeys = [...byType.keys()].sort();
  const anomalies_by_type = new Map<string, number>();
  for (const k of sortedKeys) {
    anomalies_by_type.set(k, byType.get(k)!);
  }

  return Object.freeze({
    timestamp,
    total_anomalies: anomalies.length,
    anomalies_by_type,
    affected_nodes: nodeIds.size,
  });
}
