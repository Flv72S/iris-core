/**
 * Phase 11C.2 — SLA Trust Weighting. Types.
 */

/**
 * Trust assigned to a node. trust_score in [0, 1]: 0 = no trust, 1 = maximum trust.
 */
export interface NodeTrustScore {
  readonly node_id: string;
  readonly trust_score: number;
  readonly trust_source: string;
}

/**
 * Trust-weighted SLA metrics for a service (weighted averages across nodes).
 */
export interface WeightedServiceSLA {
  readonly tenant_id: string;
  readonly service_name: string;
  readonly weighted_uptime_target: number;
  readonly weighted_latency_target_ms: number;
  readonly weighted_throughput_target: number;
}
