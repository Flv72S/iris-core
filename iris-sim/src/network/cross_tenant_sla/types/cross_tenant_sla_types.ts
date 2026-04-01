/**
 * Phase 11C — Cross-Tenant SLA Coordinator. Types.
 * Deterministic, stateless, serializable, hashable.
 */

import type { SLADriftSignal } from '../drift/sla_drift_types.js';
import type { WeightedServiceSLA } from '../trust/sla_trust_types.js';
import type { SLAConsensusCheckResult } from '../verification/sla_consensus_types.js';

export interface LocalNodeSLA {
  readonly node_id: string;
  readonly tenant_id: string;
  readonly service_name: string;
  readonly uptime_target: number;
  readonly latency_target_ms: number;
  readonly throughput_target: number;
  readonly reporting_window_seconds: number;
  readonly timestamp: number;
}

export interface TenantServiceSLA {
  readonly service_name: string;
  readonly participating_nodes: string[];
  readonly aggregated_uptime_target: number;
  readonly aggregated_latency_target_ms: number;
  readonly aggregated_throughput_target: number;
}

export interface TenantSLAState {
  readonly tenant_id: string;
  readonly services: TenantServiceSLA[];
}

export type SLAGapType =
  | 'UPTIME_BELOW_THRESHOLD'
  | 'LATENCY_EXCEEDS_TARGET'
  | 'NODE_MISSING_SLA'
  | 'SLA_CONFLICT';

export type SLAGapSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface SLAComplianceGap {
  readonly tenant_id: string;
  readonly service_name: string;
  readonly gap_type: SLAGapType | string;
  readonly severity: SLAGapSeverity | string;
  readonly description: string;
}

/** Phase 11C.1 — Optional drift signals (when metric snapshots provided). */
export interface FederatedSLAReport {
  readonly timestamp: number;
  readonly tenant_states: TenantSLAState[];
  readonly detected_gaps: SLAComplianceGap[];
  readonly report_hash: string;
  /** Present when coordinator was run with metricSnapshots; included in report_hash. */
  readonly drift_signals?: readonly SLADriftSignal[];
  /** Phase 11C.2 — Present when coordinator was run with trustScores; included in report_hash. */
  readonly weighted_service_slas?: readonly WeightedServiceSLA[];
  /** Phase 11C.3 — Present when coordinator was run with consensusResult; included in report_hash. */
  readonly sla_consensus_check?: SLAConsensusCheckResult;
}

