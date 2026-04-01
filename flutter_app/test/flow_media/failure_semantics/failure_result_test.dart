// I6 - Tests for FailureResult value object.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_result.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_type.dart';

void main() {
  group('FailureResult', () {
    test('is immutable', () {
      const result = FailureResult(
        type: FailureType.validationError,
        message: 'Test error',
        retryable: false,
      );

      expect(result.type, FailureType.validationError);
      expect(result.message, 'Test error');
      expect(result.retryable, isFalse);
      expect(result.metadata, isEmpty);
    });

    test('equality works correctly', () {
      const result1 = FailureResult(
        type: FailureType.networkError,
        message: 'Network failed',
        metadata: {'code': 500},
        retryable: true,
      );

      const result2 = FailureResult(
        type: FailureType.networkError,
        message: 'Network failed',
        metadata: {'code': 500},
        retryable: true,
      );

      const result3 = FailureResult(
        type: FailureType.networkError,
        message: 'Different message',
        metadata: {'code': 500},
        retryable: true,
      );

      expect(result1, equals(result2));
      expect(result1, isNot(equals(result3)));
    });

    test('hashCode is deterministic', () {
      const result1 = FailureResult(
        type: FailureType.timeout,
        message: 'Timed out',
        retryable: true,
      );

      const result2 = FailureResult(
        type: FailureType.timeout,
        message: 'Timed out',
        retryable: true,
      );

      expect(result1.hashCode, result2.hashCode);
    });

    test('hashCode differs for different results', () {
      const result1 = FailureResult(
        type: FailureType.timeout,
        message: 'Timed out',
        retryable: true,
      );

      const result2 = FailureResult(
        type: FailureType.networkError,
        message: 'Timed out',
        retryable: true,
      );

      expect(result1.hashCode, isNot(result2.hashCode));
    });

    group('factory constructors', () {
      test('validationError creates correct result', () {
        final result = FailureResult.validationError('Invalid input');
        expect(result.type, FailureType.validationError);
        expect(result.retryable, isFalse);
      });

      test('policyViolation creates correct result', () {
        final result = FailureResult.policyViolation('Policy violated');
        expect(result.type, FailureType.policyViolation);
        expect(result.retryable, isFalse);
      });

      test('storageUnavailable creates correct result', () {
        final result = FailureResult.storageUnavailable('Storage down');
        expect(result.type, FailureType.storageUnavailable);
        expect(result.retryable, isTrue);
      });

      test('networkError creates correct result', () {
        final result = FailureResult.networkError('Network down');
        expect(result.type, FailureType.networkError);
        expect(result.retryable, isTrue);
      });

      test('timeout creates correct result', () {
        final result = FailureResult.timeout('Operation timed out');
        expect(result.type, FailureType.timeout);
        expect(result.retryable, isTrue);
      });

      test('executionException creates correct result', () {
        final result = FailureResult.executionException('Exception thrown');
        expect(result.type, FailureType.executionException);
        expect(result.retryable, isFalse);
      });

      test('unknown creates correct result', () {
        final result = FailureResult.unknown('Unknown error');
        expect(result.type, FailureType.unknown);
        expect(result.retryable, isFalse);
      });
    });

    group('serialization', () {
      test('toJson produces correct output', () {
        const result = FailureResult(
          type: FailureType.networkError,
          message: 'Connection refused',
          metadata: {'host': 'example.com', 'port': 443},
          retryable: true,
        );

        final json = result.toJson();

        expect(json['type'], 'networkError');
        expect(json['message'], 'Connection refused');
        expect(json['metadata'], {'host': 'example.com', 'port': 443});
        expect(json['retryable'], true);
      });

      test('fromJson deserializes correctly', () {
        final json = {
          'type': 'timeout',
          'message': 'Request timed out',
          'metadata': {'seconds': 30},
          'retryable': true,
        };

        final result = FailureResult.fromJson(json);

        expect(result.type, FailureType.timeout);
        expect(result.message, 'Request timed out');
        expect(result.metadata['seconds'], 30);
        expect(result.retryable, isTrue);
      });

      test('fromJson handles unknown type', () {
        final json = {
          'type': 'nonexistent',
          'message': 'Unknown',
          'metadata': {},
          'retryable': false,
        };

        final result = FailureResult.fromJson(json);

        expect(result.type, FailureType.unknown);
      });

      test('roundtrip serialization preserves data', () {
        const original = FailureResult(
          type: FailureType.policyViolation,
          message: 'File too large',
          metadata: {'maxSize': 100, 'actualSize': 150},
          retryable: false,
        );

        final json = original.toJson();
        final restored = FailureResult.fromJson(json);

        expect(restored, equals(original));
      });
    });

    test('toString provides useful output', () {
      const result = FailureResult(
        type: FailureType.validationError,
        message: 'Test',
        retryable: false,
      );

      expect(result.toString(), contains('validationError'));
      expect(result.toString(), contains('Test'));
      expect(result.toString(), contains('false'));
    });
  });
}
