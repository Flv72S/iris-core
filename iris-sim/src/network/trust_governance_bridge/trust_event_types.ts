/**
 * Phase 13G — Trust Governance Bridge. Event types.
 */

export enum TrustEventType {
  ANOMALY_CLUSTER = 'ANOMALY_CLUSTER',
  REPUTATION_COLLAPSE = 'REPUTATION_COLLAPSE',
  TRUST_GRAPH_ATTACK = 'TRUST_GRAPH_ATTACK',
  SYBIL_PATTERN = 'SYBIL_PATTERN',
  CONSENSUS_MANIPULATION = 'CONSENSUS_MANIPULATION',
}

export interface TrustGovernanceEvent {
  readonly event_id: string;
  readonly event_type: TrustEventType;
  readonly affected_nodes: readonly string[];
  readonly severity: number;
  readonly timestamp: number;
}
