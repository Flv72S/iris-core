/**
 * Phase 11C.1 — SLA Drift Detection. Types.
 */

export interface SLAMetricSnapshot {
  readonly node_id: string;
  readonly tenant_id: string;
  readonly service_name: string;
  readonly observed_uptime: number;
  readonly observed_latency_ms: number;
  readonly observed_throughput: number;
  readonly timestamp: number;
}

export type SLADriftMetric = 'uptime' | 'latency' | 'throughput';
export type SLADriftDirection = 'degrading' | 'improving' | 'stable';
export type SLADriftSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SLADriftSignal {
  readonly tenant_id: string;
  readonly service_name: string;
  readonly metric: SLADriftMetric | string;
  readonly drift_direction: SLADriftDirection | string;
  readonly drift_severity: SLADriftSeverity | string;
  readonly description: string;
}
