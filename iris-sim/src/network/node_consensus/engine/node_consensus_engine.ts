/**
 * Phase 11A — Node Consensus Engine. Orchestrates aggregation, conflict detection,
 * resolution, merged snapshot, proof, and result. Stateless; all inputs explicit.
 */

import { aggregateSnapshots } from '../aggregation/snapshot_aggregation_engine.js';
import { detectSnapshotDivergence } from '../conflict/conflict_detection_engine.js';
import { resolveConflicts } from '../resolution/deterministic_conflict_resolver.js';
import { buildMergedSnapshot, validateMergedSnapshot } from '../merged/merged_snapshot_builder.js';
import { generateConsensusProof, generateEmptyConsensusProof } from '../proof/consensus_proof_generator.js';
import { buildConsensusResult } from '../result/consensus_result_builder.js';
import type { ConsensusAuditEntry } from '../logging/consensus_audit_log.js';
import {
  CONSENSUS_ENGINE_SCHEMA_VERSION,
  type SnapshotData,
  type NodeMetadata,
  type ConsensusParameters,
  type ConsensusResult,
  type ConsensusStatus,
} from '../types/consensus_engine_types.js';

export const DEFAULT_CONSENSUS_PARAMETERS: ConsensusParameters = Object.freeze({
  quorum_threshold: 0.66,
  node_priority_rules: 'reliability',
  conflict_resolution_policy: 'quorum',
  max_snapshot_skew: 60_000,
  timestamp_tolerance: 120_000,
});

/**
 * Run the full consensus pipeline. Stateless: no DB, no global state.
 * Returns ConsensusResult and optionally collects audit entries.
 */
export function runNodeConsensus(
  snapshots: readonly SnapshotData[],
  nodeMetadata: readonly NodeMetadata[],
  params: ConsensusParameters = DEFAULT_CONSENSUS_PARAMETERS,
  options?: { expectedNodeIds?: string[]; auditCollector?: (e: ConsensusAuditEntry) => void }
): ConsensusResult {
  const auditCollector = options?.auditCollector;
  const expectedNodeIds = options?.expectedNodeIds;

  const aggregated = aggregateSnapshots(snapshots, auditCollector);
  const totalNodes = expectedNodeIds?.length ?? aggregated.node_ids.length;
  const quorumRequired = Math.max(1, Math.ceil(totalNodes * params.quorum_threshold));
  const quorumMet = aggregated.valid_count >= quorumRequired;

  if (aggregated.snapshots.length === 0) {
    const conflictSet = Object.freeze({
      conflicts: [],
      missing_nodes: expectedNodeIds ?? [],
      out_of_tolerance_nodes: [],
      version: CONSENSUS_ENGINE_SCHEMA_VERSION,
    });
    const resolutionLog = Object.freeze({ entries: [], version: CONSENSUS_ENGINE_SCHEMA_VERSION });
    const proof = generateEmptyConsensusProof(conflictSet, resolutionLog);
    return buildConsensusResult(
      null,
      proof,
      'ERROR',
      aggregated,
      resolutionLog,
      false,
      ''
    );
  }

  const conflictSet = detectSnapshotDivergence(aggregated, params, expectedNodeIds, auditCollector);
  const { chosenSnapshot, resolutionLog } = resolveConflicts(
    aggregated,
    conflictSet,
    params,
    nodeMetadata,
    auditCollector
  );
  const merged = buildMergedSnapshot(chosenSnapshot, aggregated.node_ids);
  if (!validateMergedSnapshot(merged)) throw new Error('validateMergedSnapshot failed');
  const proof = generateConsensusProof(
    merged,
    resolutionLog,
    conflictSet,
    quorumMet,
    auditCollector
  );

  let status: ConsensusStatus = 'OK';
  if (!quorumMet || conflictSet.conflicts.length > 0 || conflictSet.missing_nodes.length > 0) {
    status = quorumMet ? 'WARNING' : 'ERROR';
  }
  if (aggregated.snapshots.length === 0) status = 'ERROR';

  return buildConsensusResult(
    merged,
    proof,
    status,
    aggregated,
    resolutionLog,
    quorumMet,
    chosenSnapshot.node_id
  );
}
