/**
 * Phase 14A — State Model Definition. Node state.
 */

export type NodeStatus = 'ACTIVE' | 'SUSPICIOUS' | 'QUARANTINED' | 'REMOVED';

export interface NodeState {
  readonly node_id: string;
  readonly passport_version: number;
  readonly last_seen: number;
  readonly status: NodeStatus;
}
