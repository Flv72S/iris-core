/**
 * Phase 13I — Trust Explainability Engine. Anomaly explanation.
 */

import type { AnomalyReport } from '../anomaly_detection/index.js';
import type { AnomalyExplanation } from './explainability_types.js';

/**
 * Explain anomalies affecting a node. Return null if none. Deterministic.
 */
export function explainAnomalies(
  node_id: string,
  anomalies: readonly AnomalyReport[]
): AnomalyExplanation | null {
  const affecting = anomalies.filter((a) => a.node_id === node_id);
  if (affecting.length === 0) return null;

  const types = [...new Set(affecting.map((a) => String(a.anomaly_type)))].sort();
  const sources = affecting.map((a) => `${a.anomaly_type}:${a.anomaly_score}`).sort();

  return Object.freeze({
    node_id,
    anomaly_types: Object.freeze(types),
    anomaly_count: affecting.length,
    anomaly_sources: Object.freeze(sources),
  });
}
