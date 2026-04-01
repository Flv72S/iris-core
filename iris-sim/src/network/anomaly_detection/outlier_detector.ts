/**
 * Phase 13D — Anomaly Detection Engine. Activity outlier detection.
 */

import type { NormalizedBehaviorMetrics } from '../trust_normalization/index.js';
import { AnomalyType, type AnomalyReport } from './anomaly_types.js';

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], m: number): number {
  if (values.length === 0) return 0;
  const sq = values.reduce((acc, v) => acc + (v - m) ** 2, 0);
  return Math.sqrt(sq / values.length) || 0;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * Mark nodes where activity_score > mean + 2*std_dev. Score = (activity_score - mean)/std_dev clamped [0,1].
 */
export function detectActivityOutliers(
  metrics: readonly NormalizedBehaviorMetrics[],
  timestamp: number
): AnomalyReport[] {
  if (metrics.length === 0) return [];
  const activities = metrics.map((m) => m.normalized_activity_score);
  const m = mean(activities);
  const std = stdDev(activities, m);
  const reports: AnomalyReport[] = [];
  for (const node of metrics) {
    const score = node.normalized_activity_score;
    if (std > 0 && score > m + 2 * std) {
      const raw = (score - m) / std;
      reports.push(
        Object.freeze({
          node_id: node.node_id,
          anomaly_type: AnomalyType.ACTIVITY_OUTLIER,
          anomaly_score: clamp01(raw),
          detection_timestamp: timestamp,
        })
      );
    }
  }
  return reports;
}
