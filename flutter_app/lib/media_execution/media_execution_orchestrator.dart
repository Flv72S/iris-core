// Media Execution — Orchestrator. Pure coordinator; sequential; stop-on-failure.

import 'package:iris_flutter_app/media_materialization/physical_operation_plan.dart';

import 'execution_result.dart';
import 'execution_status.dart';
import 'execution_trace.dart';
import 'media_execution_port.dart';

/// Pure coordinator for executing a PhysicalOperationPlan.
/// Executes operations sequentially and stops on first failure.
/// No retry, no compensation, no rollback, no parallel execution.
class MediaExecutionOrchestrator {
  const MediaExecutionOrchestrator();

  /// Executes a plan using the provided port.
  /// Operations are executed in sequenceOrder.
  /// Execution stops immediately on first failure.
  /// Returns a trace of all executed operations.
  Future<ExecutionTrace> executePlan(
    PhysicalOperationPlan plan,
    MediaExecutionPort port,
  ) async {
    final results = <ExecutionResult>[];

    for (final operation in plan.operations) {
      final result = await port.execute(operation);
      results.add(result);

      // Stop on failure
      if (result.status == ExecutionStatus.failure) {
        break;
      }
    }

    return ExecutionTrace(
      plan: plan,
      results: results,
    );
  }
}
