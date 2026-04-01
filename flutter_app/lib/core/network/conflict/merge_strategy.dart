/// OX1 — Structured merge strategy. Explicit; deterministic.

import 'package:iris_flutter_app/core/network/conflict/conflict_type.dart';

/// Resolution strategy type. No timestamp or random tie-breaking.
enum MergeStrategyType {
  strictReject,
  mergeNonOverlapping,
  fieldPriorityLocal,
  fieldPriorityRemote,
  deterministicCrdt,
}

/// Policy for merge. All merges require full replay validation before commit.
class MergeStrategy {
  const MergeStrategy({
    this.type = MergeStrategyType.mergeNonOverlapping,
    this.allowStructuralMerge = false,
    this.requireFullReplayValidation = true,
  });

  final MergeStrategyType type;
  final bool allowStructuralMerge;
  final bool requireFullReplayValidation;

  /// OX1 default: merge non-overlapping only; no structural merge; replay required.
  static const MergeStrategy defaultStrategy = MergeStrategy(
    type: MergeStrategyType.mergeNonOverlapping,
    allowStructuralMerge: false,
    requireFullReplayValidation: true,
  );
}
