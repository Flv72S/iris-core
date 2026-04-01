/**
 * Microstep 10G — Governance Trust Event Log Engine. Types.
 */

export type TrustEventType =
  | 'CROSS_NODE_VERIFICATION'
  | 'TRUST_GRAPH_UPDATED'
  | 'TRUST_POLICY_DECISION'
  | 'TRUST_SNAPSHOT_CREATED';

export interface TrustEvent {
  readonly event_id: string;
  readonly type: TrustEventType;
  readonly timestamp: number;
  readonly payload_hash: string;
  readonly event_hash: string;
}

export interface TrustEventPayload {
  readonly source: string;
  readonly reference_id: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface TrustEventLog {
  readonly events: readonly TrustEvent[];
}
