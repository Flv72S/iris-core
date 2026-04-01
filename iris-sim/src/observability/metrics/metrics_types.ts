/**
 * Phase 16E — Prometheus-style metric snapshots (in-memory).
 */

export type MetricValue =
  | { kind: 'counter'; name: string; value: number }
  | { kind: 'gauge'; name: string; value: number };

export type MetricsSnapshot = {
  generatedAt: string;
  metrics: Record<string, number>;
};

export type StandardMetricsSnapshot = {
  metrics: Record<string, number>;
  timestamp: string;
  nodeId: string;
};
