// FASE I — I2 Execution Contract integration test.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_execution/execution_failure.dart';
import 'package:iris_flutter_app/media_execution/execution_result.dart';
import 'package:iris_flutter_app/media_execution/execution_status.dart';
import 'package:iris_flutter_app/media_execution/media_execution_port.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

void main() {
  group('I2 — Execution Contract', () {
    test('ExecutionResult.success coherent', () {
      const op = PhysicalOperation(
        mediaId: 't',
        type: PhysicalOperationType.storeLocal,
        targetTier: 'local',
        sequenceOrder: 0,
      );
      final r = ExecutionResult.success(op);
      expect(r.status, ExecutionStatus.success);
      expect(r.failure, isNull);
    });
    test('ExecutionResult.failed coherent', () {
      const op = PhysicalOperation(
        mediaId: 't',
        type: PhysicalOperationType.uploadCloud,
        targetTier: 'cloud',
        sequenceOrder: 1,
      );
      final r = ExecutionResult.failed(op, ExecutionFailure(code: 'ERR', message: 'msg'));
      expect(r.status, ExecutionStatus.failure);
      expect(r.failure, isNotNull);
    });
    test('Port execute returns Future<ExecutionResult>', () async {
      final port = _TestPort();
      const op = PhysicalOperation(
        mediaId: 'x',
        type: PhysicalOperationType.storeLocal,
        targetTier: 'local',
        sequenceOrder: 0,
      );
      final result = await port.execute(op);
      expect(result, isA<ExecutionResult>());
    });
    test('success with failure throws ArgumentError', () {
      const op = PhysicalOperation(
        mediaId: 'v',
        type: PhysicalOperationType.storeLocal,
        targetTier: 'local',
        sequenceOrder: 0,
      );
      expect(
        () => ExecutionResult(
          operation: op,
          status: ExecutionStatus.success,
          failure: ExecutionFailure(code: 'X', message: 'Y'),
        ),
        throwsArgumentError,
      );
    });
  });
}

class _TestPort implements MediaExecutionPort {
  @override
  Future<ExecutionResult> execute(PhysicalOperation operation) async =>
      ExecutionResult.success(operation);
}
