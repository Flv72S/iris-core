// I6 - Tests for FailureType enum.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_type.dart';

void main() {
  group('FailureType', () {
    test('has all expected values', () {
      expect(FailureType.values.length, 7);
      expect(FailureType.values, contains(FailureType.validationError));
      expect(FailureType.values, contains(FailureType.policyViolation));
      expect(FailureType.values, contains(FailureType.storageUnavailable));
      expect(FailureType.values, contains(FailureType.networkError));
      expect(FailureType.values, contains(FailureType.executionException));
      expect(FailureType.values, contains(FailureType.timeout));
      expect(FailureType.values, contains(FailureType.unknown));
    });

    test('has stable ordering', () {
      expect(FailureType.validationError.index, 0);
      expect(FailureType.policyViolation.index, 1);
      expect(FailureType.storageUnavailable.index, 2);
      expect(FailureType.networkError.index, 3);
      expect(FailureType.executionException.index, 4);
      expect(FailureType.timeout.index, 5);
      expect(FailureType.unknown.index, 6);
    });

    test('isRecoverable returns correct values', () {
      expect(FailureType.validationError.isRecoverable, isFalse);
      expect(FailureType.policyViolation.isRecoverable, isFalse);
      expect(FailureType.storageUnavailable.isRecoverable, isTrue);
      expect(FailureType.networkError.isRecoverable, isTrue);
      expect(FailureType.executionException.isRecoverable, isFalse);
      expect(FailureType.timeout.isRecoverable, isTrue);
      expect(FailureType.unknown.isRecoverable, isFalse);
    });

    test('code returns enum name', () {
      for (final type in FailureType.values) {
        expect(type.code, type.name);
      }
    });

    test('deterministic hashCode', () {
      for (final type in FailureType.values) {
        // Same enum value always has the same hashCode
        expect(type.hashCode, type.hashCode);
        // Different values have different hashCodes
        for (final other in FailureType.values) {
          if (type != other) {
            expect(type.hashCode, isNot(other.hashCode));
          }
        }
      }
    });
  });
}
