/// OX1 — Deterministic semantic merge. Replay-validated before commit; no silent overwrite.

import 'package:iris_flutter_app/core/network/conflict/conflict_analysis.dart';
import 'package:iris_flutter_app/core/network/conflict/conflict_analyzer.dart';
import 'package:iris_flutter_app/core/network/conflict/conflict_resolution_result.dart';
import 'package:iris_flutter_app/core/network/conflict/conflict_type.dart';
import 'package:iris_flutter_app/core/network/conflict/merge_strategy.dart';

/// Merges ancestor, local, remote state maps per strategy. Returns merged map or rejected/deferred.
/// Caller must replay-validate [mergedStateMap] before commit.
class MergeEngine {
  MergeEngine({ConflictAnalyzer? analyzer}) : _analyzer = analyzer ?? ConflictAnalyzer();

  final ConflictAnalyzer _analyzer;

  /// Merge [ancestorState], [localState], [remoteState] (as canonical maps) per [strategy].
  ConflictResolutionResult merge({
    required Map<String, dynamic> ancestorState,
    required Map<String, dynamic> localState,
    required Map<String, dynamic> remoteState,
    required MergeStrategy strategy,
  }) {
    final analysis = _analyzer.analyze(
      ancestorState: ancestorState,
      localState: localState,
      remoteState: remoteState,
    );

    switch (analysis.conflictType) {
      case ConflictType.noConflict:
        return ConflictResolutionResult(
          status: ConflictResolutionStatus.merged,
          message: 'No conflict',
          mergedStateMap: Map<String, dynamic>.from(localState),
        );

      case ConflictType.nonOverlappingChanges:
        if (strategy.type != MergeStrategyType.mergeNonOverlapping &&
            strategy.type != MergeStrategyType.fieldPriorityLocal &&
            strategy.type != MergeStrategyType.fieldPriorityRemote) {
          return ConflictResolutionResult(
            status: ConflictResolutionStatus.rejected,
            message: 'Strategy does not allow non-overlapping merge',
          );
        }
        final merged = _mergeNonOverlapping(ancestorState, localState, remoteState, strategy);
        return ConflictResolutionResult(
          status: ConflictResolutionStatus.merged,
          message: 'Non-overlapping merge',
          mergedStateMap: merged,
        );

      case ConflictType.fieldLevelConflict:
        if (strategy.type == MergeStrategyType.fieldPriorityLocal) {
          return ConflictResolutionResult(
            status: ConflictResolutionStatus.merged,
            message: 'Field priority local',
            mergedStateMap: Map<String, dynamic>.from(localState),
          );
        }
        if (strategy.type == MergeStrategyType.fieldPriorityRemote) {
          return ConflictResolutionResult(
            status: ConflictResolutionStatus.merged,
            message: 'Field priority remote',
            mergedStateMap: Map<String, dynamic>.from(remoteState),
          );
        }
        if (strategy.type == MergeStrategyType.strictReject) {
          return ConflictResolutionResult(
            status: ConflictResolutionStatus.rejected,
            message: 'Field conflict; strict reject',
          );
        }
        return ConflictResolutionResult(
          status: ConflictResolutionStatus.rejected,
          message: 'Field-level conflict; no field priority strategy',
        );

      case ConflictType.structuralConflict:
        if (!strategy.allowStructuralMerge) {
          return ConflictResolutionResult(
            status: ConflictResolutionStatus.rejected,
            message: 'Structural conflict; allowStructuralMerge=false',
          );
        }
        return ConflictResolutionResult(
          status: ConflictResolutionStatus.deferred,
          message: 'Structural merge not implemented in OX1',
        );

      case ConflictType.objectDeletionConflict:
        return ConflictResolutionResult(
          status: ConflictResolutionStatus.rejected,
          message: 'Object deletion conflict; reject in OX1',
        );

      case ConflictType.incompatibleSchema:
        return ConflictResolutionResult(
          status: ConflictResolutionStatus.rejected,
          message: 'Incompatible schema',
        );

      case ConflictType.unknown:
        return ConflictResolutionResult(
          status: ConflictResolutionStatus.rejected,
          message: 'Unknown conflict',
        );
    }
  }

  Map<String, dynamic> _mergeNonOverlapping(
    Map<String, dynamic> ancestor,
    Map<String, dynamic> local,
    Map<String, dynamic> remote,
    MergeStrategy strategy,
  ) {
    final result = Map<String, dynamic>.from(ancestor);
    final allKeys = <String>{...ancestor.keys, ...local.keys, ...remote.keys};
    for (final key in allKeys) {
      final a = ancestor[key];
      final l = local[key];
      final r = remote[key];
      final localDiffers = _neq(l, a);
      final remoteDiffers = _neq(r, a);
      if (localDiffers && !remoteDiffers) {
        result[key] = l;
      } else if (!localDiffers && remoteDiffers) {
        result[key] = r;
      } else if (!localDiffers && !remoteDiffers) {
        result[key] = l ?? r ?? a;
      } else {
        if (strategy.type == MergeStrategyType.fieldPriorityLocal) {
          result[key] = l;
        } else {
          result[key] = r;
        }
      }
    }
    return result;
  }

  bool _neq(dynamic a, dynamic b) {
    if (a == b) return false;
    if (a == null || b == null) return true;
    if (a is Map && b is Map) return _mapNeq(Map<String, dynamic>.from(a), Map<String, dynamic>.from(b));
    if (a is List && b is List) {
      if (a.length != b.length) return true;
      for (var i = 0; i < a.length; i++) {
        if (_neq(a[i], b[i])) return true;
      }
      return false;
    }
    return true;
  }

  bool _mapNeq(Map<String, dynamic> a, Map<String, dynamic> b) {
    if (a.length != b.length) return true;
    for (final k in a.keys) {
      if (!b.containsKey(k) || _neq(a[k], b[k])) return true;
    }
    return false;
  }
}
