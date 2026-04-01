/**
 * Phase 13C — Behavior Monitoring Engine. Core data structures.
 * Immutable, deterministic.
 */

/** Single behavioral observation for a node. */
export interface NodeBehaviorEvent {
  readonly node_id: string;
  readonly event_type: string;
  readonly event_timestamp: number;
  readonly metadata?: Record<string, unknown>;
}

/** Behavioral summary of a node; deterministically computable from event history. */
export interface NodeBehaviorProfile {
  readonly node_id: string;
  readonly total_events: number;
  readonly action_count: number;
  readonly consensus_votes: number;
  readonly validations_performed: number;
  readonly governance_actions: number;
  readonly last_activity_timestamp: number;
}
