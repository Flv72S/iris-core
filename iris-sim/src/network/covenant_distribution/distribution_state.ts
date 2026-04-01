/**
 * Microstep 14R — Distribution & Sync Engine. Node state.
 */

export interface NodeState {
  readonly node_id: string;
  readonly last_synced_at?: number;
}
