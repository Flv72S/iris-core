/**
 * Phase 11A — Build and serialize ConsensusResult.
 */

import { hashConsensusPayload } from '../hashing/consensus_hash.js';
import type {
  ConsensusResult,
  ConsensusProof,
  MergedGovernanceSnapshot,
  ConsensusStatus,
  ConsensusDiagnostics,
  AggregatedSnapshotSet,
  ConflictResolutionLog,
} from '../types/consensus_engine_types.js';
import { CONSENSUS_ENGINE_SCHEMA_VERSION } from '../types/consensus_engine_types.js';

/**
 * Build final ConsensusResult.
 */
export function buildConsensusResult(
  merged: MergedGovernanceSnapshot | null,
  consensusProof: ConsensusProof,
  status: ConsensusStatus,
  aggregated: AggregatedSnapshotSet,
  resolutionLog: ConflictResolutionLog,
  quorumMet: boolean,
  chosenNodeId: string
): ConsensusResult {
  const diagnostics: ConsensusDiagnostics = Object.freeze({
    aggregated_count: aggregated.snapshots.length,
    conflict_count: consensusProof.conflict_report.conflicts.length,
    resolution_count: resolutionLog.entries.length,
    quorum_met: quorumMet,
    chosen_node_id: chosenNodeId,
    version: CONSENSUS_ENGINE_SCHEMA_VERSION,
  });
  return Object.freeze({
    merged_snapshot: merged,
    consensus_proof: consensusProof,
    status,
    diagnostics,
    version: CONSENSUS_ENGINE_SCHEMA_VERSION,
  });
}

/**
 * Serialize ConsensusResult to JSON (deterministic for hashing).
 */
export function serializeConsensusResult(result: ConsensusResult): string {
  return JSON.stringify(result);
}

/**
 * Hash of ConsensusResult for verification.
 */
export function hashConsensusResult(result: ConsensusResult): string {
  return hashConsensusPayload(result);
}
