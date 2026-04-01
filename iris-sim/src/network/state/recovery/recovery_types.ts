/**
 * Phase 14E — State Recovery Engine. Recovery structures.
 */

export interface RecoveryPlan {
  readonly snapshot_version: number;
  readonly target_version: number;
  /** Ordered diff identifiers (e.g. indices or hashes) for replay. */
  readonly diff_chain: readonly string[];
}

export interface RecoveryResult {
  readonly success: boolean;
  readonly recovered_version: number;
  readonly applied_diffs: number;
}

export interface RecoveryContext {
  readonly node_id: string;
  readonly start_time: number;
  readonly snapshot_loaded: boolean;
}
