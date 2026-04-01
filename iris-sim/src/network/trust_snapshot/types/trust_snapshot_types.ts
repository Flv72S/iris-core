/**
 * Microstep 10F — Governance Trust Snapshot & Audit Engine. Types.
 */

import type { GovernanceTrustGraph, TrustScore } from '../../trust_graph/types/trust_graph_types.js';
import type { TrustPolicy, TrustDecision } from '../../trust_policy/types/trust_policy_types.js';

export interface GovernanceTrustSnapshot {
  readonly snapshot_id: string;
  readonly timestamp: number;
  readonly trust_graph_hash: string;
  readonly policy_hash: string;
  readonly decision_hash: string;
  readonly global_hash: string;
}

export interface SnapshotInput {
  readonly trust_graph: GovernanceTrustGraph;
  readonly trust_scores: readonly TrustScore[];
  readonly policies: readonly TrustPolicy[];
  readonly decisions: readonly TrustDecision[];
  /** Optional: for deterministic builds (e.g. tests). If omitted, builder uses Date.now(). */
  readonly timestamp?: number;
}

export interface SnapshotAuditResult {
  readonly snapshot_id: string;
  readonly valid: boolean;
  readonly recomputed_hash: string;
}
