/**
 * Phase 11A — Consensus hash and ConsensusProof generation.
 */

import { createConsensusAuditEntry } from '../logging/consensus_audit_log.js';
import { hashConsensusPayload } from '../hashing/consensus_hash.js';
import type {
  MergedGovernanceSnapshot,
  ConsensusProof,
  SnapshotConflictSet,
  ConflictResolutionLog,
} from '../types/consensus_engine_types.js';
import { CONSENSUS_ENGINE_SCHEMA_VERSION } from '../types/consensus_engine_types.js';

/**
 * Build a ConsensusProof when no snapshots are available (failure path).
 */
export function generateEmptyConsensusProof(
  conflictReport: SnapshotConflictSet,
  resolutionLog: ConflictResolutionLog
): ConsensusProof {
  const consensus_hash = hashConsensusPayload({
    merged_snapshot_hash: null,
    participating_nodes: [],
    resolution_log: resolutionLog,
  });
  return Object.freeze({
    consensus_hash,
    timestamp: Date.now(),
    participating_nodes: [],
    quorum_reached: false,
    conflict_report: conflictReport,
    version: CONSENSUS_ENGINE_SCHEMA_VERSION,
  });
}

/**
 * Calculate consensus hash: HASH(merged_snapshot + participating_nodes + resolution_log).
 */
export function calculateConsensusHash(
  merged: MergedGovernanceSnapshot,
  resolutionLog: ConflictResolutionLog
): string {
  const payload = {
    merged_snapshot_hash: merged.snapshot.global_hash,
    participating_nodes: [...merged.participating_node_ids].sort(),
    resolution_log: resolutionLog,
  };
  return hashConsensusPayload(payload);
}

/**
 * Generate ConsensusProof (hashable, verifiable).
 */
export function generateConsensusProof(
  merged: MergedGovernanceSnapshot,
  resolutionLog: ConflictResolutionLog,
  conflictReport: SnapshotConflictSet,
  quorumReached: boolean,
  auditCollector?: (entry: import('../logging/consensus_audit_log.js').ConsensusAuditEntry) => void
): ConsensusProof {
  const consensus_hash = calculateConsensusHash(merged, resolutionLog);
  const proof: ConsensusProof = Object.freeze({
    consensus_hash,
    timestamp: Date.now(),
    participating_nodes: [...merged.participating_node_ids].sort(),
    quorum_reached: quorumReached,
    conflict_report: conflictReport,
    version: CONSENSUS_ENGINE_SCHEMA_VERSION,
  });
  if (auditCollector) {
    auditCollector(createConsensusAuditEntry('consensus_hash_generation', { consensus_hash }));
    auditCollector(createConsensusAuditEntry('proof_generation', { proof_hash: consensus_hash }));
  }
  return proof;
}
