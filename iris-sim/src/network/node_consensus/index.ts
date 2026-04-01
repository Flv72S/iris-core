/**
 * Phase 11A — Node Consensus Engine.
 */

export {
  CONSENSUS_ENGINE_SCHEMA_VERSION,
  type SnapshotData,
  type NodeMetadata,
  type ConsensusParameters,
  type SnapshotConflictEntry,
  type SnapshotConflictSet,
  type ConflictResolutionLog,
  type AggregatedSnapshotSet,
  type MergedGovernanceSnapshot,
  type ConsensusProof,
  type ConsensusStatus,
  type ConsensusDiagnostics,
  type ConsensusResult,
} from './types/consensus_engine_types.js';

export { verifySnapshotIntegrity, normalizeSnapshots, loadSnapshots, aggregateSnapshots } from './aggregation/snapshot_aggregation_engine.js';
export { detectSnapshotDivergence, buildConflictSet } from './conflict/conflict_detection_engine.js';
export {
  applyConsensusRules,
  resolveConflicts,
  generateResolutionLog,
  type ResolutionOutcome,
} from './resolution/deterministic_conflict_resolver.js';
export { buildMergedSnapshot, validateMergedSnapshot } from './merged/merged_snapshot_builder.js';
export {
  calculateConsensusHash,
  generateConsensusProof,
  generateEmptyConsensusProof,
} from './proof/consensus_proof_generator.js';
export {
  buildConsensusResult,
  serializeConsensusResult,
  hashConsensusResult,
} from './result/consensus_result_builder.js';
export {
  runNodeConsensus,
  DEFAULT_CONSENSUS_PARAMETERS,
} from './engine/node_consensus_engine.js';
export {
  createConsensusAuditEntry,
  verifyConsensusAuditEntry,
  type ConsensusAuditEntry,
  type ConsensusLogPhase,
} from './logging/consensus_audit_log.js';
export { hashConsensusPayload, sha256Hex } from './hashing/consensus_hash.js';
