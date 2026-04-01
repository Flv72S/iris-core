// Media Execution — Execution trace. Immutable record of plan execution.

import 'package:iris_flutter_app/media_materialization/physical_operation_plan.dart';

import 'execution_result.dart';
import 'execution_status.dart';

/// Immutable trace of a plan execution.
/// Contains the original plan and all execution results.
class ExecutionTrace {
  ExecutionTrace({
    required this.plan,
    required List<ExecutionResult> results,
  }) : results = List.unmodifiable(results);

  /// The plan that was executed.
  final PhysicalOperationPlan plan;

  /// Results of executed operations, in execution order.
  final List<ExecutionResult> results;

  /// Returns true if all executed operations succeeded.
  bool get allSucceeded =>
      results.isNotEmpty &&
      results.every((r) => r.status == ExecutionStatus.success);

  /// Returns true if any operation failed.
  bool get hasFailed =>
      results.any((r) => r.status == ExecutionStatus.failure);

  /// Returns the number of operations that were executed.
  int get executedCount => results.length;

  /// Returns the number of operations in the original plan.
  int get plannedCount => plan.length;

  /// Returns true if execution was complete (all planned operations executed).
  bool get isComplete => executedCount == plannedCount;

  /// Returns the first failure, if any.
  ExecutionResult? get firstFailure {
    for (final result in results) {
      if (result.status == ExecutionStatus.failure) {
        return result;
      }
    }
    return null;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ExecutionTrace &&
          plan == other.plan &&
          _resultsEqual(results, other.results));

  static bool _resultsEqual(
    List<ExecutionResult> a,
    List<ExecutionResult> b,
  ) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(plan, Object.hashAll(results));

  Map<String, Object> toJson() => {
        'plan': plan.toJson(),
        'results': results.map((r) => r.toJson()).toList(),
        'allSucceeded': allSucceeded,
        'executedCount': executedCount,
        'plannedCount': plannedCount,
      };

  @override
  String toString() =>
      'ExecutionTrace(executed: $executedCount/$plannedCount, '
      'allSucceeded: $allSucceeded)';
}
