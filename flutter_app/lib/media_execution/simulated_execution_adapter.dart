// Media Execution — Simulated adapter. Deterministic test provider.

import 'package:iris_flutter_app/media_materialization/physical_operation.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

import 'execution_failure.dart';
import 'execution_result.dart';
import 'media_execution_port.dart';

/// Simulated implementation of MediaExecutionPort for testing.
/// Completely deterministic; no IO; no side effects; no randomness.
class SimulatedExecutionAdapter implements MediaExecutionPort {
  /// Creates a simulated adapter.
  /// - [failOnSequenceOrders]: operations with these sequence orders will fail
  /// - [failOnTypes]: operations with these types will fail
  const SimulatedExecutionAdapter({
    this.failOnSequenceOrders = const {},
    this.failOnTypes = const {},
  });

  /// Sequence orders that should fail.
  final Set<int> failOnSequenceOrders;

  /// Operation types that should fail.
  final Set<PhysicalOperationType> failOnTypes;

  /// Creates an adapter that always succeeds.
  const SimulatedExecutionAdapter.allSuccess()
      : failOnSequenceOrders = const {},
        failOnTypes = const {};

  /// Creates an adapter that fails on specific sequence orders.
  const SimulatedExecutionAdapter.failOnSequence(Set<int> sequences)
      : failOnSequenceOrders = sequences,
        failOnTypes = const {};

  /// Creates an adapter that fails on specific operation types.
  const SimulatedExecutionAdapter.failOnType(Set<PhysicalOperationType> types)
      : failOnSequenceOrders = const {},
        failOnTypes = types;

  @override
  Future<ExecutionResult> execute(PhysicalOperation operation) async {
    // Check if should fail by sequence order
    if (failOnSequenceOrders.contains(operation.sequenceOrder)) {
      return ExecutionResult.failed(
        operation,
        ExecutionFailure(
          code: 'SIMULATED_FAILURE',
          message: 'Simulated failure for operation '
              'seq:${operation.sequenceOrder}',
        ),
      );
    }

    // Check if should fail by type
    if (failOnTypes.contains(operation.type)) {
      return ExecutionResult.failed(
        operation,
        ExecutionFailure(
          code: 'SIMULATED_FAILURE',
          message: 'Simulated failure for operation '
              'type:${operation.type.name}',
        ),
      );
    }

    // Default: success
    return ExecutionResult.success(operation);
  }
}
