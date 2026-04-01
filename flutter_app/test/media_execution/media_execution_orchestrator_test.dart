import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_execution/execution_failure.dart';
import 'package:iris_flutter_app/media_execution/execution_result.dart';
import 'package:iris_flutter_app/media_execution/media_execution_orchestrator.dart';
import 'package:iris_flutter_app/media_execution/media_execution_port.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_plan.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

class _MockExecutionPort implements MediaExecutionPort {
  final List<PhysicalOperation> executedOperations = [];
  final Map<int, ExecutionResult Function(PhysicalOperation)> _responses = {};

  void setResponse(int seq, ExecutionResult Function(PhysicalOperation) fn) {
    _responses[seq] = fn;
  }

  @override
  Future<ExecutionResult> execute(PhysicalOperation operation) async {
    executedOperations.add(operation);
    final fn = _responses[operation.sequenceOrder];
    if (fn != null) {
      return fn(operation);
    }
    return ExecutionResult.success(operation);
  }
}

void main() {
  const orchestrator = MediaExecutionOrchestrator();

  const op0 = PhysicalOperation(
    mediaId: 'media-1',
    type: PhysicalOperationType.storeLocal,
    targetTier: 'local',
    sequenceOrder: 0,
  );
  const op1 = PhysicalOperation(
    mediaId: 'media-1',
    type: PhysicalOperationType.uploadCloud,
    targetTier: 'cloud',
    sequenceOrder: 1,
  );
  const op2 = PhysicalOperation(
    mediaId: 'media-1',
    type: PhysicalOperationType.delete,
    targetTier: 'none',
    sequenceOrder: 2,
  );

  group('MediaExecutionOrchestrator - Sequential execution', () {
    test('executes operations in sequence order', () async {
      final port = _MockExecutionPort();
      final plan = PhysicalOperationPlan(operations: const [op0, op1, op2]);

      await orchestrator.executePlan(plan, port);

      expect(port.executedOperations.length, 3);
      expect(port.executedOperations[0].sequenceOrder, 0);
      expect(port.executedOperations[1].sequenceOrder, 1);
      expect(port.executedOperations[2].sequenceOrder, 2);
    });

    test('returns trace with all results', () async {
      final port = _MockExecutionPort();
      final plan = PhysicalOperationPlan(operations: const [op0, op1]);

      final trace = await orchestrator.executePlan(plan, port);

      expect(trace.results.length, 2);
      expect(trace.allSucceeded, isTrue);
      expect(trace.isComplete, isTrue);
    });
  });

  group('MediaExecutionOrchestrator - Stop on failure', () {
    test('stops execution on first failure', () async {
      final port = _MockExecutionPort();
      port.setResponse(1, (op) => ExecutionResult.failed(
            op,
            const ExecutionFailure(code: 'FAIL', message: 'test'),
          ));

      final plan = PhysicalOperationPlan(operations: const [op0, op1, op2]);
      final trace = await orchestrator.executePlan(plan, port);

      expect(port.executedOperations.length, 2);
      expect(trace.results.length, 2);
      expect(trace.hasFailed, isTrue);
      expect(trace.isComplete, isFalse);
    });

    test('does not execute operations after failure', () async {
      final port = _MockExecutionPort();
      port.setResponse(0, (op) => ExecutionResult.failed(
            op,
            const ExecutionFailure(code: 'EARLY', message: 'early fail'),
          ));

      final plan = PhysicalOperationPlan(operations: const [op0, op1, op2]);
      final trace = await orchestrator.executePlan(plan, port);

      expect(port.executedOperations.length, 1);
      expect(trace.results.length, 1);
      expect(trace.firstFailure!.failure!.code, 'EARLY');
    });
  });

  group('MediaExecutionOrchestrator - Full success', () {
    test('allSucceeded is true when all operations succeed', () async {
      final port = _MockExecutionPort();
      final plan = PhysicalOperationPlan(operations: const [op0, op1, op2]);

      final trace = await orchestrator.executePlan(plan, port);

      expect(trace.allSucceeded, isTrue);
      expect(trace.hasFailed, isFalse);
      expect(trace.executedCount, 3);
    });
  });

  group('MediaExecutionOrchestrator - Determinism', () {
    test('same plan and port produce same trace', () async {
      final port1 = _MockExecutionPort();
      final port2 = _MockExecutionPort();
      final plan = PhysicalOperationPlan(operations: const [op0, op1]);

      final trace1 = await orchestrator.executePlan(plan, port1);
      final trace2 = await orchestrator.executePlan(plan, port2);

      expect(trace1, equals(trace2));
      expect(trace1.hashCode, trace2.hashCode);
    });

    test('failure at same point produces equal traces', () async {
      final port1 = _MockExecutionPort();
      final port2 = _MockExecutionPort();
      const failure = ExecutionFailure(code: 'DET', message: 'deterministic');
      port1.setResponse(1, (op) => ExecutionResult.failed(op, failure));
      port2.setResponse(1, (op) => ExecutionResult.failed(op, failure));

      final plan = PhysicalOperationPlan(operations: const [op0, op1, op2]);
      final trace1 = await orchestrator.executePlan(plan, port1);
      final trace2 = await orchestrator.executePlan(plan, port2);

      expect(trace1, equals(trace2));
    });
  });

  group('MediaExecutionOrchestrator - Empty plan', () {
    test('empty plan produces empty trace', () async {
      final port = _MockExecutionPort();
      final plan = PhysicalOperationPlan(operations: const []);

      final trace = await orchestrator.executePlan(plan, port);

      expect(trace.results, isEmpty);
      expect(trace.executedCount, 0);
      expect(trace.plannedCount, 0);
      expect(trace.isComplete, isTrue);
      expect(port.executedOperations, isEmpty);
    });

    test('empty trace allSucceeded is false', () async {
      final port = _MockExecutionPort();
      final plan = PhysicalOperationPlan(operations: const []);

      final trace = await orchestrator.executePlan(plan, port);

      expect(trace.allSucceeded, isFalse);
    });
  });

  group('MediaExecutionOrchestrator - Skipped handling', () {
    test('continues execution on skipped', () async {
      final port = _MockExecutionPort();
      port.setResponse(1, (op) => ExecutionResult.skipped(op));

      final plan = PhysicalOperationPlan(operations: const [op0, op1, op2]);
      final trace = await orchestrator.executePlan(plan, port);

      expect(port.executedOperations.length, 3);
      expect(trace.results.length, 3);
      expect(trace.isComplete, isTrue);
    });
  });
}
