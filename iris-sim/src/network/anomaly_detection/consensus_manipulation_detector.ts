/**
 * Phase 13D — Anomaly Detection Engine. Consensus manipulation detection.
 */

import type { NodeBehaviorProfile } from '../behavior_monitoring/index.js';
import type { NormalizedBehaviorMetrics } from '../trust_normalization/index.js';
import { AnomalyType, type AnomalyReport } from './anomaly_types.js';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * Flag nodes where consensus_votes/total_events > 0.9 and total_events above network median.
 */
export function detectConsensusManipulation(
  profiles: readonly NodeBehaviorProfile[],
  _metrics: readonly NormalizedBehaviorMetrics[],
  timestamp: number
): AnomalyReport[] {
  if (profiles.length === 0) return [];
  const totals = profiles.map((p) => p.total_events);
  const med = median(totals);
  const reports: AnomalyReport[] = [];
  for (const p of profiles) {
    if (p.total_events === 0) continue;
    const ratio = p.consensus_votes / p.total_events;
    if (ratio > 0.9 && p.total_events > med) {
      reports.push(
        Object.freeze({
          node_id: p.node_id,
          anomaly_type: AnomalyType.CONSENSUS_MANIPULATION,
          anomaly_score: clamp01(ratio),
          detection_timestamp: timestamp,
        })
      );
    }
  }
  return reports;
}
