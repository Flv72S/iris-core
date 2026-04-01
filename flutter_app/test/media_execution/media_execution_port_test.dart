import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_execution/execution_failure.dart';
import 'package:iris_flutter_app/media_execution/execution_result.dart';
import 'package:iris_flutter_app/media_execution/media_execution_port.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

class _TestExecutionPort implements MediaExecutionPort {
  @override
  Future<ExecutionResult> execute(PhysicalOperation operation) async {
    return ExecutionResult.success(operation);
  }
}

void main() {
  group('MediaExecutionPort', () {
    test('can be implemented', () {
      final port = _TestExecutionPort();
      expect(port, isA<MediaExecutionPort>());
    });

    test('execute returns Future<ExecutionResult>', () async {
      final port = _TestExecutionPort();
      const operation = PhysicalOperation(
        mediaId: 'test-media',
        type: PhysicalOperationType.storeLocal,
        targetTier: 'local',
        sequenceOrder: 0,
      );

      final result = await port.execute(operation);

      expect(result, isA<ExecutionResult>());
      expect(result.isSuccess, isTrue);
      expect(result.operation, equals(operation));
    });

    test('implementation can return failure', () async {
      final port = _FailingExecutionPort();
      const operation = PhysicalOperation(
        mediaId: 'fail-media',
        type: PhysicalOperationType.uploadCloud,
        targetTier: 'cloud',
        sequenceOrder: 1,
      );

      final result = await port.execute(operation);

      expect(result.isFailure, isTrue);
      expect(result.failure, isNotNull);
    });

    test('implementation can return skipped', () async {
      final port = _SkippingExecutionPort();
      const operation = PhysicalOperation(
        mediaId: 'skip-media',
        type: PhysicalOperationType.archiveCold,
        targetTier: 'archive',
        sequenceOrder: 2,
      );

      final result = await port.execute(operation);

      expect(result.isSkipped, isTrue);
    });
  });
}

class _FailingExecutionPort implements MediaExecutionPort {
  @override
  Future<ExecutionResult> execute(PhysicalOperation operation) async {
    return ExecutionResult.failed(
      operation,
      const ExecutionFailure(code: 'TEST_FAIL', message: 'Test failure'),
    );
  }
}

class _SkippingExecutionPort implements MediaExecutionPort {
  @override
  Future<ExecutionResult> execute(PhysicalOperation operation) async {
    return ExecutionResult.skipped(operation);
  }
}
