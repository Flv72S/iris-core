// Media Execution — Execution result. Immutable; deterministic; state-coherent.

import 'package:iris_flutter_app/media_materialization/physical_operation.dart';

import 'execution_failure.dart';
import 'execution_status.dart';

/// Result of executing a physical operation.
/// Immutable value object with state coherence validation.
class ExecutionResult {
  /// Creates an ExecutionResult with validated state coherence.
  /// - success: failure must be null
  /// - failure: failure must not be null
  /// - skipped: failure must be null
  factory ExecutionResult({
    required PhysicalOperation operation,
    required ExecutionStatus status,
    ExecutionFailure? failure,
  }) {
    // Validate state coherence
    if (status == ExecutionStatus.success && failure != null) {
      throw ArgumentError('success status cannot have a failure');
    }
    if (status == ExecutionStatus.failure && failure == null) {
      throw ArgumentError('failure status must have a failure');
    }
    if (status == ExecutionStatus.skipped && failure != null) {
      throw ArgumentError('skipped status cannot have a failure');
    }
    return ExecutionResult._internal(
      operation: operation,
      status: status,
      failure: failure,
    );
  }

  const ExecutionResult._internal({
    required this.operation,
    required this.status,
    this.failure,
  });

  /// Creates a success result.
  factory ExecutionResult.success(PhysicalOperation operation) {
    return ExecutionResult._internal(
      operation: operation,
      status: ExecutionStatus.success,
      failure: null,
    );
  }

  /// Creates a failure result.
  factory ExecutionResult.failed(
    PhysicalOperation operation,
    ExecutionFailure failure,
  ) {
    return ExecutionResult._internal(
      operation: operation,
      status: ExecutionStatus.failure,
      failure: failure,
    );
  }

  /// Creates a skipped result.
  factory ExecutionResult.skipped(PhysicalOperation operation) {
    return ExecutionResult._internal(
      operation: operation,
      status: ExecutionStatus.skipped,
      failure: null,
    );
  }

  /// The operation that was executed.
  final PhysicalOperation operation;

  /// The status of the execution.
  final ExecutionStatus status;

  /// The failure details, if status is failure.
  final ExecutionFailure? failure;

  /// Returns true if the execution was successful.
  bool get isSuccess => status == ExecutionStatus.success;

  /// Returns true if the execution failed.
  bool get isFailure => status == ExecutionStatus.failure;

  /// Returns true if the execution was skipped.
  bool get isSkipped => status == ExecutionStatus.skipped;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ExecutionResult &&
          operation == other.operation &&
          status == other.status &&
          failure == other.failure);

  @override
  int get hashCode => Object.hash(operation, status, failure);

  Map<String, Object?> toJson() => {
        'operation': operation.toJson(),
        'status': status.name,
        'failure': failure?.toJson(),
      };

  @override
  String toString() =>
      'ExecutionResult(${operation.mediaId}, ${status.name}'
      '${failure != null ? ', ${failure!.code}' : ''})';
}
