// I6 - Tests for FailurePolicy and ExecutionAction.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_policy.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_type.dart';

void main() {
  group('ExecutionAction', () {
    test('has all expected values', () {
      expect(ExecutionAction.values.length, 4);
      expect(ExecutionAction.values, contains(ExecutionAction.retry));
      expect(ExecutionAction.values, contains(ExecutionAction.abort));
      expect(ExecutionAction.values, contains(ExecutionAction.skip));
      expect(ExecutionAction.values, contains(ExecutionAction.escalate));
    });

    test('stopsExecution is correct', () {
      expect(ExecutionAction.abort.stopsExecution, isTrue);
      expect(ExecutionAction.retry.stopsExecution, isFalse);
      expect(ExecutionAction.skip.stopsExecution, isFalse);
      expect(ExecutionAction.escalate.stopsExecution, isFalse);
    });

    test('allowsContinuation is correct', () {
      expect(ExecutionAction.skip.allowsContinuation, isTrue);
      expect(ExecutionAction.escalate.allowsContinuation, isTrue);
      expect(ExecutionAction.abort.allowsContinuation, isFalse);
      expect(ExecutionAction.retry.allowsContinuation, isFalse);
    });

    test('code returns enum name', () {
      for (final action in ExecutionAction.values) {
        expect(action.code, action.name);
      }
    });
  });

  group('DefaultFailurePolicy', () {
    const policy = DefaultFailurePolicy();

    test('validation errors abort', () {
      expect(policy.actionFor(FailureType.validationError), ExecutionAction.abort);
    });

    test('policy violations abort', () {
      expect(policy.actionFor(FailureType.policyViolation), ExecutionAction.abort);
    });

    test('storage unavailable retries', () {
      expect(policy.actionFor(FailureType.storageUnavailable), ExecutionAction.retry);
    });

    test('network errors retry', () {
      expect(policy.actionFor(FailureType.networkError), ExecutionAction.retry);
    });

    test('execution exceptions abort', () {
      expect(policy.actionFor(FailureType.executionException), ExecutionAction.abort);
    });

    test('timeouts retry', () {
      expect(policy.actionFor(FailureType.timeout), ExecutionAction.retry);
    });

    test('unknown errors escalate', () {
      expect(policy.actionFor(FailureType.unknown), ExecutionAction.escalate);
    });

    test('handles all failure types', () {
      for (final type in FailureType.values) {
        expect(policy.actionFor(type), isNotNull);
      }
    });

    test('is deterministic', () {
      const policy1 = DefaultFailurePolicy();
      const policy2 = DefaultFailurePolicy();

      for (final type in FailureType.values) {
        expect(policy1.actionFor(type), policy2.actionFor(type));
      }
    });
  });

  group('StrictFailurePolicy', () {
    const policy = StrictFailurePolicy();

    test('aborts on all failure types', () {
      for (final type in FailureType.values) {
        expect(policy.actionFor(type), ExecutionAction.abort);
      }
    });
  });

  group('LenientFailurePolicy', () {
    const policy = LenientFailurePolicy();

    test('aborts on validation and policy errors', () {
      expect(policy.actionFor(FailureType.validationError), ExecutionAction.abort);
      expect(policy.actionFor(FailureType.policyViolation), ExecutionAction.abort);
    });

    test('skips recoverable errors', () {
      expect(policy.actionFor(FailureType.storageUnavailable), ExecutionAction.skip);
      expect(policy.actionFor(FailureType.networkError), ExecutionAction.skip);
      expect(policy.actionFor(FailureType.timeout), ExecutionAction.skip);
    });

    test('escalates execution exceptions', () {
      expect(policy.actionFor(FailureType.executionException), ExecutionAction.escalate);
    });

    test('skips unknown errors', () {
      expect(policy.actionFor(FailureType.unknown), ExecutionAction.skip);
    });
  });

  group('CustomFailurePolicy', () {
    test('uses provided mappings', () {
      const policy = CustomFailurePolicy({
        FailureType.networkError: ExecutionAction.skip,
        FailureType.timeout: ExecutionAction.escalate,
      });

      expect(policy.actionFor(FailureType.networkError), ExecutionAction.skip);
      expect(policy.actionFor(FailureType.timeout), ExecutionAction.escalate);
    });

    test('uses fallback for unmapped types', () {
      const policy = CustomFailurePolicy(
        {FailureType.networkError: ExecutionAction.retry},
        fallback: ExecutionAction.skip,
      );

      expect(policy.actionFor(FailureType.networkError), ExecutionAction.retry);
      expect(policy.actionFor(FailureType.validationError), ExecutionAction.skip);
    });

    test('default fallback is abort', () {
      const policy = CustomFailurePolicy({});

      expect(policy.actionFor(FailureType.unknown), ExecutionAction.abort);
    });
  });
}
