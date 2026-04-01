/**
 * Phase 11A — Node Consensus Engine. Data structures.
 * All structures are serializable, hashable, and versioned.
 */

import type { GlobalGovernanceSnapshot } from '../../../governance/global_snapshot/types/global_snapshot_types.js';

/** Schema version for consensus engine artifacts. */
export const CONSENSUS_ENGINE_SCHEMA_VERSION = '1.0.0';

/**
 * Snapshot payload from a federated node.
 * Each item includes the governance state and node attribution.
 */
export interface SnapshotData {
  readonly governance_state: GlobalGovernanceSnapshot;
  readonly snapshot_hash: string;
  readonly timestamp: number;
  readonly node_id: string;
  readonly schema_version?: string;
}

/**
 * Metadata for a participating node (priority, reliability, role).
 */
export interface NodeMetadata {
  readonly node_id: string;
  readonly trust_anchor: string;
  readonly protocol_version: string;
  readonly governance_role: string;
  readonly reliability_weight: number;
}

/**
 * Configurable consensus parameters.
 */
export interface ConsensusParameters {
  readonly quorum_threshold: number;
  readonly node_priority_rules: 'reliability' | 'timestamp' | 'trust_anchor';
  readonly conflict_resolution_policy: 'quorum' | 'priority' | 'newest' | 'oldest';
  readonly max_snapshot_skew: number;
  readonly timestamp_tolerance: number;
}

/**
 * Single conflict entry (e.g. two snapshots disagree on same field).
 */
export interface SnapshotConflictEntry {
  readonly field: string;
  readonly values: readonly { node_id: string; value: unknown }[];
  readonly resolution: 'resolved' | 'unresolved';
  readonly chosen_value?: unknown;
  readonly chosen_node_id?: string;
}

/**
 * Set of conflicts between snapshots.
 */
export interface SnapshotConflictSet {
  readonly conflicts: readonly SnapshotConflictEntry[];
  readonly missing_nodes: readonly string[];
  readonly out_of_tolerance_nodes: readonly string[];
  readonly version: string;
}

/**
 * Log of how conflicts were resolved (deterministic, for audit).
 */
export interface ConflictResolutionLog {
  readonly entries: readonly {
    readonly conflict_id: string;
    readonly policy_applied: string;
    readonly chosen_node_id: string;
    readonly reason: string;
    readonly timestamp: number;
  }[];
  readonly version: string;
}

/**
 * Aggregated view of all loaded snapshots (normalized, integrity-checked).
 */
export interface AggregatedSnapshotSet {
  readonly snapshots: readonly SnapshotData[];
  readonly node_ids: readonly string[];
  readonly valid_count: number;
  readonly invalid_count: number;
  readonly version: string;
}

/**
 * Merged (agreed) governance snapshot plus audit metadata.
 */
export interface MergedGovernanceSnapshot {
  readonly snapshot: GlobalGovernanceSnapshot;
  readonly participating_node_ids: readonly string[];
  readonly chosen_node_id: string;
  readonly version: string;
}

/**
 * Verifiable proof of consensus.
 */
export interface ConsensusProof {
  readonly consensus_hash: string;
  readonly timestamp: number;
  readonly participating_nodes: readonly string[];
  readonly quorum_reached: boolean;
  readonly conflict_report: SnapshotConflictSet;
  readonly version: string;
}

/**
 * Consensus status.
 */
export type ConsensusStatus = 'OK' | 'WARNING' | 'ERROR';

/**
 * Diagnostics for audit (structured, hashable).
 */
export interface ConsensusDiagnostics {
  readonly aggregated_count: number;
  readonly conflict_count: number;
  readonly resolution_count: number;
  readonly quorum_met: boolean;
  readonly chosen_node_id: string;
  readonly version: string;
}

/**
 * Final result of the Node Consensus Engine.
 */
export interface ConsensusResult {
  readonly merged_snapshot: MergedGovernanceSnapshot | null;
  readonly consensus_proof: ConsensusProof;
  readonly status: ConsensusStatus;
  readonly diagnostics: ConsensusDiagnostics;
  readonly version: string;
}
