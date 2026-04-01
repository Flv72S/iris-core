/// O8 — Extract fork metadata from divergence. Does not modify state.

import 'package:iris_flutter_app/core/network/divergence/divergence_report.dart';
import 'package:iris_flutter_app/core/network/divergence/divergence_types.dart';
import 'package:iris_flutter_app/core/network/divergence/deterministic_state_metadata.dart';
import 'package:iris_flutter_app/core/network/fork/fork_analysis.dart';
import 'package:iris_flutter_app/core/network/fork/fork_branch.dart';

/// Extracts fork metadata from a divergence report and state metadata.
/// Preserves full hash chain integrity; does not mutate state.
class ForkAnalyzer {
  ForkAnalyzer();

  /// Build [ForkAnalysis] when [divergence] is forkDetected and [commonAncestorHeight] is set.
  /// Returns null if not a fork or common ancestor is missing.
  ForkAnalysis? analyze({
    required DivergenceReport divergence,
    required DeterministicStateMetadata localState,
    required DeterministicStateMetadata remoteState,
  }) {
    if (divergence.type != DivergenceType.forkDetected) return null;
    final ancestor = divergence.commonAncestorHeight;
    if (ancestor == null || ancestor < 0) return null;

    final localBranch = _extractBranch(
      branchId: 'local',
      state: localState,
      ancestorHeight: ancestor,
    );
    final remoteBranch = _extractBranch(
      branchId: 'remote',
      state: remoteState,
      ancestorHeight: ancestor,
    );
    if (localBranch == null || remoteBranch == null) return null;

    return ForkAnalysis(
      commonAncestorHeight: ancestor,
      localBranch: localBranch,
      remoteBranch: remoteBranch,
    );
  }

  ForkBranch? _extractBranch({
    required String branchId,
    required DeterministicStateMetadata state,
    required int ancestorHeight,
  }) {
    if (state.chainHashHistory.length < ancestorHeight) return null;
    final start = ancestorHeight;
    if (start >= state.chainHashHistory.length) {
      return ForkBranch(
        branchId: branchId,
        startingHeight: start,
        eventHashes: [],
        finalSnapshotHash: state.snapshotHash,
      );
    }
    final hashes = state.chainHashHistory
        .sublist(start)
        .map((h) => h.toRadixString(16))
        .toList();
    return ForkBranch(
      branchId: branchId,
      startingHeight: start,
      eventHashes: hashes,
      finalSnapshotHash: state.snapshotHash,
    );
  }
}
