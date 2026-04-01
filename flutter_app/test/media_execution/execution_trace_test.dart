import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_execution/execution_failure.dart';
import 'package:iris_flutter_app/media_execution/execution_result.dart';
import 'package:iris_flutter_app/media_execution/execution_trace.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_plan.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

void main() {
  const op1 = PhysicalOperation(
    mediaId: 'media-1',
    type: PhysicalOperationType.storeLocal,
    targetTier: 'local',
    sequenceOrder: 0,
  );
  const op2 = PhysicalOperation(
    mediaId: 'media-1',
    type: PhysicalOperationType.uploadCloud,
    targetTier: 'cloud',
    sequenceOrder: 1,
  );

  group('ExecutionTrace', () {
    test('results list is immutable', () {
      final plan = PhysicalOperationPlan(operations: const [op1]);
      final trace = ExecutionTrace(
        plan: plan,
        results: [ExecutionResult.success(op1)],
      );

      expect(
        () => trace.results.add(ExecutionResult.success(op2)),
        throwsUnsupportedError,
      );
    });

    test('allSucceeded returns true when all success', () {
      final plan = PhysicalOperationPlan(operations: const [op1, op2]);
      final trace = ExecutionTrace(
        plan: plan,
        results: [
          ExecutionResult.success(op1),
          ExecutionResult.success(op2),
        ],
      );

      expect(trace.allSucceeded, isTrue);
      expect(trace.hasFailed, isFalse);
    });

    test('allSucceeded returns false when any failure', () {
      final plan = PhysicalOperationPlan(operations: const [op1, op2]);
      final trace = ExecutionTrace(
        plan: plan,
        results: [
          ExecutionResult.success(op1),
          ExecutionResult.failed(
            op2,
            const ExecutionFailure(code: 'ERR', message: 'fail'),
          ),
        ],
      );

      expect(trace.allSucceeded, isFalse);
      expect(trace.hasFailed, isTrue);
    });

    test('allSucceeded returns false for empty results', () {
      final plan = PhysicalOperationPlan(operations: const []);
      final trace = ExecutionTrace(plan: plan, results: const []);

      expect(trace.allSucceeded, isFalse);
    });

    test('firstFailure returns first failed result', () {
      final plan = PhysicalOperationPlan(operations: const [op1, op2]);
      const failure = ExecutionFailure(code: 'FIRST', message: 'first fail');
      final trace = ExecutionTrace(
        plan: plan,
        results: [
          ExecutionResult.success(op1),
          ExecutionResult.failed(op2, failure),
        ],
      );

      expect(trace.firstFailure, isNotNull);
      expect(trace.firstFailure!.failure!.code, 'FIRST');
    });

    test('firstFailure returns null when no failures', () {
      final plan = PhysicalOperationPlan(operations: const [op1]);
      final trace = ExecutionTrace(
        plan: plan,
        results: [ExecutionResult.success(op1)],
      );

      expect(trace.firstFailure, isNull);
    });

    test('isComplete when all operations executed', () {
      final plan = PhysicalOperationPlan(operations: const [op1, op2]);
      final trace = ExecutionTrace(
        plan: plan,
        results: [
          ExecutionResult.success(op1),
          ExecutionResult.success(op2),
        ],
      );

      expect(trace.isComplete, isTrue);
      expect(trace.executedCount, 2);
      expect(trace.plannedCount, 2);
    });

    test('not complete when stopped early', () {
      final plan = PhysicalOperationPlan(operations: const [op1, op2]);
      final trace = ExecutionTrace(
        plan: plan,
        results: [ExecutionResult.success(op1)],
      );

      expect(trace.isComplete, isFalse);
      expect(trace.executedCount, 1);
      expect(trace.plannedCount, 2);
    });

    test('equality and hashCode', () {
      final plan = PhysicalOperationPlan(operations: const [op1]);
      final t1 = ExecutionTrace(
        plan: plan,
        results: [ExecutionResult.success(op1)],
      );
      final t2 = ExecutionTrace(
        plan: plan,
        results: [ExecutionResult.success(op1)],
      );

      expect(t1, equals(t2));
      expect(t1.hashCode, t2.hashCode);
    });

    test('toJson produces correct structure', () {
      final plan = PhysicalOperationPlan(operations: const [op1]);
      final trace = ExecutionTrace(
        plan: plan,
        results: [ExecutionResult.success(op1)],
      );
      final json = trace.toJson();

      expect(json['plan'], isA<Map>());
      expect(json['results'], isA<List>());
      expect(json['allSucceeded'], isTrue);
      expect(json['executedCount'], 1);
      expect(json['plannedCount'], 1);
    });
  });
}
