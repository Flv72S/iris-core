// Media Materialization — Physical operation plan. Ordered; immutable; no logic.

import 'physical_operation.dart';

/// Represents an ordered plan of physical operations for a media asset.
/// Immutable; deterministically ordered; no decision logic.
class PhysicalOperationPlan {
  PhysicalOperationPlan({
    required List<PhysicalOperation> operations,
  }) : operations = List.unmodifiable(
          List<PhysicalOperation>.from(operations)
            ..sort((a, b) => a.sequenceOrder.compareTo(b.sequenceOrder)),
        );

  /// Ordered list of physical operations.
  final List<PhysicalOperation> operations;

  /// Returns true if this plan contains any cloud operations.
  bool get hasCloudOperations =>
      operations.any((op) => op.targetTier == 'cloud');

  /// Returns true if this plan contains archive operations.
  bool get hasArchiveOperations =>
      operations.any((op) => op.targetTier == 'archive');

  /// Returns true if this plan contains delete operations.
  bool get hasDeleteOperations =>
      operations.any((op) => op.type.name == 'delete');

  /// Number of operations in this plan.
  int get length => operations.length;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PhysicalOperationPlan &&
          _operationsEqual(operations, other.operations));

  static bool _operationsEqual(
    List<PhysicalOperation> a,
    List<PhysicalOperation> b,
  ) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hashAll(operations);

  Map<String, Object> toJson() => {
        'operations': operations.map((op) => op.toJson()).toList(),
      };

  @override
  String toString() =>
      'PhysicalOperationPlan(${operations.length} operations)';
}
