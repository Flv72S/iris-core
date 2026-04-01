/**
 * Phase 14D — Conflict Resolution Engine. Conflict structures.
 */

export type ConflictEntityType =
  | 'NODE'
  | 'TRUST'
  | 'GOVERNANCE'
  | 'TOPOLOGY'
  | 'POLICY';

export interface StateConflict {
  readonly entity_type: ConflictEntityType;
  readonly entity_id: string;
  readonly local_version: number;
  readonly remote_version: number;
  readonly local_value: unknown;
  readonly remote_value: unknown;
  readonly local_timestamp?: number;
  readonly remote_timestamp?: number;
}

export interface ConflictResolutionResult {
  readonly resolved_value: unknown;
  readonly resolution_strategy: string;
}
