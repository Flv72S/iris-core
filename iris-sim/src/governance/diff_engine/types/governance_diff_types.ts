/**
 * Step 8N — Governance Diff Engine. Types.
 */

export interface GovernanceComponentChange {
  readonly component: string;
  readonly previous_hash: string | null;
  readonly current_hash: string | null;
}

export interface GovernanceDiffReport {
  readonly snapshot_A_hash: string;
  readonly snapshot_B_hash: string;
  readonly changed_components: readonly GovernanceComponentChange[];
  readonly diff_hash: string;
  readonly timestamp: number;
}
