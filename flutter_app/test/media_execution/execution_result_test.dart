import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/media_execution/execution_failure.dart';
import 'package:iris_flutter_app/media_execution/execution_result.dart';
import 'package:iris_flutter_app/media_execution/execution_status.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation.dart';
import 'package:iris_flutter_app/media_materialization/physical_operation_type.dart';

void main() {
  const operation = PhysicalOperation(
    mediaId: 'media-123',
    type: PhysicalOperationType.storeLocal,
    targetTier: 'local',
    sequenceOrder: 0,
  );

  const failure = ExecutionFailure(
    code: 'TEST_ERROR',
    message: 'Test failure message',
  );

  group('ExecutionResult - success', () {
    test('success factory creates valid result', () {
      final result = ExecutionResult.success(operation);

      expect(result.status, ExecutionStatus.success);
      expect(result.failure, isNull);
      expect(result.isSuccess, isTrue);
      expect(result.isFailure, isFalse);
      expect(result.isSkipped, isFalse);
    });

    test('success with null failure via main constructor', () {
      final result = ExecutionResult(
        operation: operation,
        status: ExecutionStatus.success,
        failure: null,
      );

      expect(result.isSuccess, isTrue);
      expect(result.failure, isNull);
    });

    test('success with failure throws ArgumentError', () {
      expect(
        () => ExecutionResult(
          operation: operation,
          status: ExecutionStatus.success,
          failure: failure,
        ),
        throwsArgumentError,
      );
    });
  });

  group('ExecutionResult - failure', () {
    test('failed factory creates valid result', () {
      final result = ExecutionResult.failed(operation, failure);

      expect(result.status, ExecutionStatus.failure);
      expect(result.failure, equals(failure));
      expect(result.isSuccess, isFalse);
      expect(result.isFailure, isTrue);
      expect(result.isSkipped, isFalse);
    });

    test('failure without failure object throws ArgumentError', () {
      expect(
        () => ExecutionResult(
          operation: operation,
          status: ExecutionStatus.failure,
          failure: null,
        ),
        throwsArgumentError,
      );
    });
  });

  group('ExecutionResult - skipped', () {
    test('skipped factory creates valid result', () {
      final result = ExecutionResult.skipped(operation);

      expect(result.status, ExecutionStatus.skipped);
      expect(result.failure, isNull);
      expect(result.isSuccess, isFalse);
      expect(result.isFailure, isFalse);
      expect(result.isSkipped, isTrue);
    });

    test('skipped with failure throws ArgumentError', () {
      expect(
        () => ExecutionResult(
          operation: operation,
          status: ExecutionStatus.skipped,
          failure: failure,
        ),
        throwsArgumentError,
      );
    });
  });

  group('ExecutionResult - equality', () {
    test('same results are equal', () {
      final r1 = ExecutionResult.success(operation);
      final r2 = ExecutionResult.success(operation);

      expect(r1, equals(r2));
      expect(r1.hashCode, r2.hashCode);
    });

    test('different status produces different result', () {
      final success = ExecutionResult.success(operation);
      final skipped = ExecutionResult.skipped(operation);

      expect(success, isNot(equals(skipped)));
    });

    test('different failure produces different result', () {
      const failure1 = ExecutionFailure(code: 'A', message: 'a');
      const failure2 = ExecutionFailure(code: 'B', message: 'b');
      final r1 = ExecutionResult.failed(operation, failure1);
      final r2 = ExecutionResult.failed(operation, failure2);

      expect(r1, isNot(equals(r2)));
    });
  });

  group('ExecutionResult - serialization', () {
    test('toJson produces correct structure for success', () {
      final result = ExecutionResult.success(operation);
      final json = result.toJson();

      expect(json['status'], 'success');
      expect(json['failure'], isNull);
      expect(json['operation'], isA<Map>());
    });

    test('toJson produces correct structure for failure', () {
      final result = ExecutionResult.failed(operation, failure);
      final json = result.toJson();

      expect(json['status'], 'failure');
      expect(json['failure'], isA<Map>());
    });
  });

  group('ExecutionResult - toString', () {
    test('success toString is readable', () {
      final result = ExecutionResult.success(operation);
      expect(result.toString(), contains('media-123'));
      expect(result.toString(), contains('success'));
    });

    test('failure toString includes error code', () {
      final result = ExecutionResult.failed(operation, failure);
      expect(result.toString(), contains('failure'));
      expect(result.toString(), contains('TEST_ERROR'));
    });
  });
}
