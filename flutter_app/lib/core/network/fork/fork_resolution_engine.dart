/// O8 — Controlled fork resolution. Deterministic branch selection; no silent rewrite.

import 'package:iris_flutter_app/core/network/fork/fork_analysis.dart';
import 'package:iris_flutter_app/core/network/fork/fork_resolution_backend.dart';
import 'package:iris_flutter_app/core/network/fork/fork_resolution_policy.dart';
import 'package:iris_flutter_app/core/network/fork/fork_resolution_result.dart';

/// Resolves forks according to policy. Validates via backend; no automatic merge.
class ForkResolutionEngine {
  ForkResolutionEngine();

  /// Resolve fork from [analysis] using [policy]. [backend] performs replay and apply.
  /// Returns explicit result; state restored on validation failure.
  ForkResolutionResult resolve({
    required ForkAnalysis analysis,
    required ForkResolutionPolicy policy,
    required ForkResolutionBackend backend,
  }) {
    switch (policy.strategy) {
      case ForkResolutionStrategy.reject:
        return ForkResolutionResult(
          status: ForkResolutionStatus.rejected,
          message: 'Fork resolution rejected by policy',
        );

      case ForkResolutionStrategy.manualSelection:
        return ForkResolutionResult(
          status: ForkResolutionStatus.deferred,
          message: 'Fork deferred; manual selection required',
        );

      case ForkResolutionStrategy.preferRemote:
        if (!policy.requireFullReplayValidation) {
          return ForkResolutionResult(
            status: ForkResolutionStatus.rejected,
            message: 'Full replay validation required',
          );
        }
        final applied = backend.validateAndApplyRemoteBranch(
          commonAncestorHeight: analysis.commonAncestorHeight,
          remoteBranch: analysis.remoteBranch,
        );
        if (applied) {
          return ForkResolutionResult(
            status: ForkResolutionStatus.resolvedRemote,
            message: 'Remote branch validated and applied',
            appliedBranchId: analysis.remoteBranch.branchId,
          );
        }
        return ForkResolutionResult(
          status: ForkResolutionStatus.rejected,
          message: 'Remote branch replay validation failed; state unchanged',
        );

      case ForkResolutionStrategy.preferLocal:
        final ok = backend.verifyLocalChain();
        if (ok) {
          return ForkResolutionResult(
            status: ForkResolutionStatus.resolvedLocal,
            message: 'Local branch kept; integrity verified',
            appliedBranchId: analysis.localBranch.branchId,
          );
        }
        return ForkResolutionResult(
          status: ForkResolutionStatus.rejected,
          message: 'Local chain integrity check failed',
        );
    }
  }
}
