/**
 * Step 8A — Governance Public API. Response DTOs (read-only).
 * Every response includes timestamp, hash, and snapshot_id where applicable.
 */

/** GET /governance/tier */
export interface TierStatusResponse {
  readonly tier: string;
  readonly score: number;
  readonly tier_range: string;
  readonly governance_hash: string;
  readonly snapshot_id: string;
  readonly timestamp: string;
  readonly response_hash: string;
}

/** GET /governance/certificate */
export interface GovernanceCertificateResponse {
  readonly certificate_id: string;
  readonly governance_state: string;
  readonly tier: string;
  readonly sla_profile: string;
  readonly hash: string;
  readonly issued_at: string;
  readonly valid: boolean;
  readonly snapshot_id: string;
  readonly timestamp: string;
  readonly response_hash: string;
}

/** GET /governance/sla */
export interface SLAGovernanceResponse {
  readonly profile: string;
  readonly availability_target: number;
  readonly latency_target_ms: number;
  readonly breach_count_30d: number;
  readonly snapshot_id: string;
  readonly timestamp: string;
  readonly response_hash: string;
}

/** GET /governance/snapshot */
export interface GovernanceSnapshotResponse {
  readonly snapshot_id: string;
  readonly tier: string;
  readonly sla_profile: string;
  readonly governance_hash: string;
  readonly created_at: string;
  readonly integrity_verified: boolean;
  readonly timestamp: string;
  readonly response_hash: string;
}

/** Single entry for GET /governance/history */
export interface GovernanceHistoryEntryResponse {
  readonly snapshot_id: string;
  readonly tier: string;
  readonly sla_profile: string;
  readonly governance_hash: string;
  readonly timestamp: string;
}

/** GET /governance/history */
export interface GovernanceHistoryResponse {
  readonly entries: readonly GovernanceHistoryEntryResponse[];
  readonly timestamp: string;
  readonly response_hash: string;
}
