/// O7 — Base multi-device reconciliation. Non-destructive; replay-before-merge enforced.

import 'package:iris_flutter_app/core/network/divergence/divergence_report.dart';
import 'package:iris_flutter_app/core/network/divergence/divergence_types.dart';
import 'package:iris_flutter_app/core/network/divergence/deterministic_state_metadata.dart';
import 'package:iris_flutter_app/core/network/reconciliation/reconciliation_policy.dart';
import 'package:iris_flutter_app/core/network/reconciliation/reconciliation_result.dart';
import 'package:iris_flutter_app/core/network/reconciliation/replay_outcome.dart';

/// Base reconciliation engine. Decides outcome from divergence and optional replay result.
/// Does not mutate state; caller performs fetch/replay/send and reports outcome.
class ReconciliationEngine {
  ReconciliationEngine();

  /// Decide reconciliation result from [divergence], [localState], [remoteState], [policy].
  /// For [DivergenceType.remoteAhead], pass [replayOutcome] after attempting replay:
  /// - success → APPLIED_REMOTE_SEGMENT
  /// - failure → REJECTED
  ReconciliationResult reconcile({
    required DivergenceReport divergence,
    required DeterministicStateMetadata localState,
    required DeterministicStateMetadata remoteState,
    required ReconciliationPolicy policy,
    ReplayOutcome? replayOutcome,
  }) {
    switch (divergence.type) {
      case DivergenceType.inSync:
        return ReconciliationResult(
          status: ReconciliationStatus.noAction,
          message: 'In sync; no action',
        );

      case DivergenceType.remoteAhead:
        if (!policy.allowRemoteReplay) {
          return ReconciliationResult(
            status: ReconciliationStatus.rejected,
            message: 'Policy disallows remote replay',
          );
        }
        if (replayOutcome == null) {
          return ReconciliationResult(
            status: ReconciliationStatus.needRemoteReplay,
            message: 'Request remote segment and replay; then report outcome',
          );
        }
        if (replayOutcome.success) {
          return ReconciliationResult(
            status: ReconciliationStatus.appliedRemoteSegment,
            message: 'Remote segment applied and validated',
            appliedSegments: replayOutcome.appliedSegments,
          );
        }
        return ReconciliationResult(
          status: ReconciliationStatus.rejected,
          message: 'Replay validation failed; state not mutated',
        );

      case DivergenceType.localAhead:
        if (!policy.allowLocalSend) {
          return ReconciliationResult(
            status: ReconciliationStatus.rejected,
            message: 'Policy disallows sending local segment',
          );
        }
        return ReconciliationResult(
          status: ReconciliationStatus.sentLocalSegment,
          message: 'Send local segment to remote',
        );

      case DivergenceType.forkDetected:
        return ReconciliationResult(
          status: ReconciliationStatus.forkDeferred,
          message: 'Fork detected; deferred (no auto-merge)',
        );

      case DivergenceType.snapshotMismatch:
        return ReconciliationResult(
          status: ReconciliationStatus.rejected,
          message: 'Snapshot mismatch; no common ancestor',
        );

      case DivergenceType.protocolIncompatible:
        return ReconciliationResult(
          status: ReconciliationStatus.rejected,
          message: 'Protocol incompatible',
        );

      case DivergenceType.unknown:
        return ReconciliationResult(
          status: ReconciliationStatus.rejected,
          message: 'Unknown divergence; rejected',
        );
    }
  }
}
