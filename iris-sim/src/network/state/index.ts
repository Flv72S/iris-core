/**
 * Phase 14A — State Model Definition. Canonical distributed state.
 */

export type { StateVersion, StateVectorClock, StateMetadata } from './state_types.js';
export type { NodeState, NodeStatus } from './node_state.js';
export type { TrustState } from './trust_state.js';
export { TRUST_SCORE_MIN, TRUST_SCORE_MAX, isTrustScoreInRange } from './trust_state.js';
export type { GovernanceState } from './governance_state.js';
export type { TopologyEdge } from './topology_state.js';
export { topologyEdgeId, createTopologyEdge } from './topology_state.js';
export type { PolicyState } from './policy_state.js';
export type { NetworkState } from './network_state.js';
export { StateSerializer } from './state_serializer.js';
export type { StateHashRoot } from './state_hash.js';
export { computeStateHash } from './state_hash.js';
export { StateValidator } from './state_validator.js';
export { vectorClockAfter, mergeVectorClocks, vectorClockKeys } from './state_vector_clock.js';
export { StateError, StateErrorCode } from './state_errors.js';
// Phase 14B — Snapshot Engine
export type { StateSnapshot } from './snapshot_types.js';
export { SnapshotID } from './snapshot_id.js';
export { SnapshotBuilder } from './snapshot_builder.js';
export { SnapshotCompressor } from './snapshot_compressor.js';
export { SnapshotSignature } from './snapshot_signature.js';
export { SnapshotValidator } from './snapshot_validator.js';
export { SnapshotLoader } from './snapshot_loader.js';
export { SnapshotError, SnapshotErrorCode } from './snapshot_errors.js';
// Phase 14C — State Diff Engine
export type { StateDiffMetadata, DiffOperation, StateDiff } from './diff/state_diff_types.js';
export { StateDiffGenerator } from './diff/state_diff_generator.js';
export { StateDiffMerger } from './diff/state_diff_merger.js';
export { StateDiffValidator } from './diff/state_diff_validator.js';
export { StateDiffEngine } from './diff/state_diff_engine.js';
export { StateDiffError, StateDiffErrorCode } from './diff/state_diff_errors.js';
// Phase 14D — Conflict Resolution Engine
export type { StateConflict, ConflictResolutionResult, ConflictEntityType } from './conflict/conflict_types.js';
export { ConflictDetector } from './conflict/conflict_detector.js';
export { ConflictPolicy } from './conflict/conflict_policy.js';
export { ConflictResolver } from './conflict/conflict_resolver.js';
export { ConflictValidator } from './conflict/conflict_validator.js';
export { ConflictError, ConflictErrorCode } from './conflict/conflict_errors.js';
// Phase 14E — State Recovery Engine
export type { RecoveryPlan, RecoveryResult, RecoveryContext } from './recovery/recovery_types.js';
export { StateRecoveryPlanner } from './recovery/state_recovery_planner.js';
export type { DiffMeta } from './recovery/state_recovery_planner.js';
export { StateRecoveryExecutor } from './recovery/state_recovery_executor.js';
export { StateRecoveryEngine } from './recovery/state_recovery_engine.js';
export type { RecoverStateParams, RecoverStateOutput } from './recovery/state_recovery_engine.js';
export { StateRecoveryValidator } from './recovery/state_recovery_validator.js';
export { RecoveryError, RecoveryErrorCode } from './recovery/state_recovery_errors.js';
