/**
 * Step 8M — Global Governance Snapshot. Types.
 */

export interface GlobalSnapshotHashFields {
  readonly governance_snapshot_hash: string;
  readonly policy_enforcement_hash: string;
  readonly adaptation_hash: string;
  readonly runtime_state_hash: string;
  readonly governance_proof_hash: string;
  readonly attestation_hash: string;
  readonly ledger_head_hash: string;
  readonly certificate_hash: string;
  readonly watcher_state_hash: string;
}

export interface GlobalGovernanceSnapshot extends GlobalSnapshotHashFields {
  readonly snapshot_id: string;
  readonly timestamp: number;
  readonly governance_tier: string;
  readonly trust_anchor_id: string;
  readonly global_hash: string;
}

export interface GlobalSnapshotAuditRecord {
  readonly snapshot_id: string;
  readonly timestamp: number;
  readonly tier: string;
  readonly certificate: string;
  readonly ledger_head: string;
  readonly global_hash: string;
}
