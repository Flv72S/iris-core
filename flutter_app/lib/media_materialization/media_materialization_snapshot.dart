// Media Materialization — Snapshot. Immutable record for audit and replay.

import 'package:iris_flutter_app/media_lifecycle/media_lifecycle_plan.dart';

import 'physical_operation_plan.dart';

/// Immutable snapshot of lifecycle plan and its derived physical operations.
/// Used for audit, debug, and deterministic replay.
class MediaMaterializationSnapshot {
  const MediaMaterializationSnapshot({
    required this.lifecycle,
    required this.operations,
  });

  /// The source lifecycle plan.
  final MediaLifecyclePlan lifecycle;

  /// The derived physical operation plan.
  final PhysicalOperationPlan operations;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MediaMaterializationSnapshot &&
          lifecycle == other.lifecycle &&
          operations == other.operations);

  @override
  int get hashCode => Object.hash(lifecycle, operations);

  Map<String, Object> toJson() => {
        'lifecycle': lifecycle.toJson(),
        'operations': operations.toJson(),
      };

  @override
  String toString() =>
      'MediaMaterializationSnapshot(lifecycle: $lifecycle, '
      'operations: ${operations.length} ops)';
}
