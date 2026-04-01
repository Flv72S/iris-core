/**
 * Phase 11C.1 — SLA Drift Detector.
 * Deterministic: group by tenant/service, sort by timestamp, slope = (last - first) / time_delta.
 */

import type { SLAMetricSnapshot, SLADriftSignal, SLADriftMetric, SLADriftDirection } from './sla_drift_types.js';
import { classifyDriftSeverity } from './sla_drift_classifier.js';

/** Key: tenant_id + \0 + service_name */
function serviceKey(tenant_id: string, service_name: string): string {
  return `${tenant_id}\0${service_name}`;
}

/**
 * Group snapshots by tenant and service; each history sorted by timestamp (then node_id for tie-break).
 */
export function buildServiceMetricHistory(
  snapshots: readonly SLAMetricSnapshot[]
): Map<string, SLAMetricSnapshot[]> {
  const byService = new Map<string, SLAMetricSnapshot[]>();
  for (const s of snapshots) {
    const key = serviceKey(s.tenant_id, s.service_name);
    const arr = byService.get(key) ?? [];
    arr.push({ ...s });
    byService.set(key, arr);
  }
  for (const arr of byService.values()) {
    arr.sort((a, b) => a.timestamp - b.timestamp || a.node_id.localeCompare(b.node_id));
  }
  return byService;
}

/**
 * slope = (last_value - first_value) / time_delta; if time_delta === 0 return 0.
 */
export function calculateMetricSlope(
  values: readonly number[],
  timestamps: readonly number[]
): number {
  if (values.length === 0 || timestamps.length === 0 || values.length !== timestamps.length) return 0;
  const first = values[0];
  const last = values[values.length - 1];
  const tFirst = timestamps[0];
  const tLast = timestamps[timestamps.length - 1];
  const timeDelta = tLast - tFirst;
  if (timeDelta <= 0) return 0;
  return (last - first) / timeDelta;
}

/**
 * Latency slope positive → degrading; throughput slope negative → degrading; uptime slope negative → degrading.
 */
function driftDirection(metric: SLADriftMetric, slope: number): SLADriftDirection {
  if (Math.abs(slope) < 1e-12) return 'stable';
  switch (metric) {
    case 'latency':
      return slope > 0 ? 'degrading' : 'improving';
    case 'throughput':
    case 'uptime':
      return slope < 0 ? 'degrading' : 'improving';
    default:
      return slope < 0 ? 'degrading' : 'improving';
  }
}

/**
 * Detect drift per (tenant, service, metric). Uses first/last snapshot per service history for slope.
 */
export function detectMetricDrift(snapshots: readonly SLAMetricSnapshot[]): SLADriftSignal[] {
  const history = buildServiceMetricHistory(snapshots);
  const signals: SLADriftSignal[] = [];
  const keys = [...history.keys()].sort();
  const metrics: SLADriftMetric[] = ['uptime', 'latency', 'throughput'];

  for (const key of keys) {
    const [tenant_id, service_name] = key.split('\0');
    const list = history.get(key) ?? [];
    if (list.length < 2) continue;

    const timestamps = list.map((s) => s.timestamp);
    for (const metric of metrics) {
      const values =
        metric === 'uptime'
          ? list.map((s) => s.observed_uptime)
          : metric === 'latency'
            ? list.map((s) => s.observed_latency_ms)
            : list.map((s) => s.observed_throughput);
      const slope = calculateMetricSlope(values, timestamps);
      const direction = driftDirection(metric, slope);
      const severity = classifyDriftSeverity(slope);
      const description = `metric=${metric} slope=${slope} direction=${direction}`;
      signals.push(
        Object.freeze({
          tenant_id,
          service_name,
          metric,
          drift_direction: direction,
          drift_severity: severity,
          description,
        })
      );
    }
  }

  return signals.sort(
    (a, b) =>
      a.tenant_id.localeCompare(b.tenant_id) ||
      a.service_name.localeCompare(b.service_name) ||
      String(a.metric).localeCompare(String(b.metric))
  );
}
