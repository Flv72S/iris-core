/**
 * Phase 16E.X1 / 16E.X1.FIX — Map IRIS metric snapshots to Prometheus exposition model (strict registry + labels).
 */

import type { MetricsSnapshot, StandardMetricsSnapshot } from '../metrics/metrics_types.js';
import { METRIC_DEFINITIONS } from './metric_definitions.js';

export type MetricLabels = Record<string, string>;

export type PromMetric = {
  name: string;
  type: 'counter' | 'gauge';
  help: string;
  value: number;
  labels: MetricLabels;
};

/** Snapshot sources that can supply `node_id` for labels. */
export type PrometheusMetricsInput = StandardMetricsSnapshot | (MetricsSnapshot & { nodeId: string });

/** Opt-in diagnostics for skipped metrics (`IRIS_PROMETHEUS_DEBUG=1`). */
function shouldLogSkippedMetrics(): boolean {
  return process.env.IRIS_PROMETHEUS_DEBUG === '1';
}

function metricsRecord(snapshot: PrometheusMetricsInput): Record<string, number> {
  return snapshot.metrics ?? {};
}

function nodeIdFromSnapshot(snapshot: PrometheusMetricsInput): string | undefined {
  if ('nodeId' in snapshot && typeof snapshot.nodeId === 'string' && snapshot.nodeId.length > 0) {
    return snapshot.nodeId;
  }
  return undefined;
}

/**
 * Map a metrics snapshot to Prometheus metrics.
 * - Only internal keys listed in {@link METRIC_DEFINITIONS} are exported.
 * - Requires non-empty `node_id` on the snapshot; otherwise returns [].
 * - Unknown internal keys are skipped (optional dev stderr).
 * - Non-finite values are skipped.
 */
export function mapMetricsToPrometheus(snapshot: PrometheusMetricsInput): PromMetric[] {
  const nodeId = nodeIdFromSnapshot(snapshot);
  if (nodeId === undefined) {
    return [];
  }

  const labels: MetricLabels = { node_id: nodeId };
  if (!isValidLabelSet(labels)) {
    if (shouldLogSkippedMetrics()) {
      console.error('[IRIS Prometheus] skipped export: invalid label values');
    }
    return [];
  }

  const raw = metricsRecord(snapshot);
  const keys = Object.keys(raw).sort();
  const out: PromMetric[] = [];

  for (const internalKey of keys) {
    const def = METRIC_DEFINITIONS[internalKey];
    if (!def) {
      if (shouldLogSkippedMetrics()) {
        console.error(`[IRIS Prometheus] skipped unknown internal metric key: ${internalKey}`);
      }
      continue;
    }

    const v = raw[internalKey];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;

    out.push({
      name: def.name,
      type: def.type,
      help: def.help,
      value: v,
      labels: { ...labels },
    });
  }

  return out.sort(comparePromMetric);
}

function comparePromMetric(a: PromMetric, b: PromMetric): number {
  const byName = a.name.localeCompare(b.name);
  if (byName !== 0) return byName;
  return renderLabelsForSort(a.labels).localeCompare(renderLabelsForSort(b.labels));
}

function renderLabelsForSort(labels: MetricLabels): string {
  const keys = Object.keys(labels).sort();
  return keys.map((k) => `${k}=${labels[k]}`).join('\0');
}

/** Reserved for exporter tests — reject empty values and control chars. */
export function isValidLabelSet(labels: MetricLabels): boolean {
  for (const [k, v] of Object.entries(labels)) {
    if (k.length === 0) return false;
    if (typeof v !== 'string') return false;
    if (v.length === 0) return false;
    for (let i = 0; i < v.length; i++) {
      const c = v.charCodeAt(i);
      if (c < 0x20 && c !== 0x09) return false;
    }
  }
  return true;
}
