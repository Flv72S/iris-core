// I6 - Tests for FailureLoggingAdapter and related classes.

import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_logging_adapter.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_policy.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_result.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_type.dart';

void main() {
  group('FailureLogEntry', () {
    test('equality works correctly', () {
      final entry1 = FailureLogEntry(
        stepNumber: 1,
        operationId: 'op-1',
        failureResult: FailureResult.networkError('Error'),
        actionTaken: ExecutionAction.retry,
      );

      final entry2 = FailureLogEntry(
        stepNumber: 1,
        operationId: 'op-1',
        failureResult: FailureResult.networkError('Error'),
        actionTaken: ExecutionAction.retry,
      );

      final entry3 = FailureLogEntry(
        stepNumber: 2,
        operationId: 'op-1',
        failureResult: FailureResult.networkError('Error'),
        actionTaken: ExecutionAction.retry,
      );

      expect(entry1, equals(entry2));
      expect(entry1, isNot(equals(entry3)));
    });

    test('hashCode is deterministic', () {
      final entry1 = FailureLogEntry(
        stepNumber: 5,
        operationId: 'test-op',
        failureResult: FailureResult.timeout('Timed out'),
        actionTaken: ExecutionAction.abort,
      );

      final entry2 = FailureLogEntry(
        stepNumber: 5,
        operationId: 'test-op',
        failureResult: FailureResult.timeout('Timed out'),
        actionTaken: ExecutionAction.abort,
      );

      expect(entry1.hashCode, entry2.hashCode);
    });

    test('toJson serializes correctly', () {
      final entry = FailureLogEntry(
        stepNumber: 3,
        operationId: 'op-123',
        failureResult: FailureResult.policyViolation('Too large'),
        actionTaken: ExecutionAction.abort,
      );

      final json = entry.toJson();

      expect(json['stepNumber'], 3);
      expect(json['operationId'], 'op-123');
      expect(json['failureResult']['type'], 'policyViolation');
      expect(json['actionTaken'], 'abort');
    });

    test('fromJson deserializes correctly', () {
      final json = {
        'stepNumber': 7,
        'operationId': 'op-xyz',
        'failureResult': {
          'type': 'networkError',
          'message': 'Connection lost',
          'metadata': {},
          'retryable': true,
        },
        'actionTaken': 'retry',
      };

      final entry = FailureLogEntry.fromJson(json);

      expect(entry.stepNumber, 7);
      expect(entry.operationId, 'op-xyz');
      expect(entry.failureResult.type, FailureType.networkError);
      expect(entry.actionTaken, ExecutionAction.retry);
    });

    test('roundtrip serialization preserves data', () {
      final original = FailureLogEntry(
        stepNumber: 10,
        operationId: 'roundtrip-op',
        failureResult: FailureResult.storageUnavailable('Disk full'),
        actionTaken: ExecutionAction.skip,
      );

      final json = original.toJson();
      final restored = FailureLogEntry.fromJson(json);

      expect(restored, equals(original));
    });

    test('toString provides useful output', () {
      final entry = FailureLogEntry(
        stepNumber: 1,
        operationId: 'op-1',
        failureResult: FailureResult.timeout('Timeout'),
        actionTaken: ExecutionAction.retry,
      );

      final str = entry.toString();

      expect(str, contains('1'));
      expect(str, contains('op-1'));
      expect(str, contains('timeout'));
      expect(str, contains('retry'));
    });
  });

  group('FailureLog', () {
    test('empty log has no entries', () {
      const log = FailureLog.empty();

      expect(log.isEmpty, isTrue);
      expect(log.length, 0);
    });

    test('entries are immutable', () {
      final entries = [
        FailureLogEntry(
          stepNumber: 0,
          operationId: 'op-0',
          failureResult: FailureResult.networkError('Error'),
          actionTaken: ExecutionAction.retry,
        ),
      ];

      final log = FailureLog(entries);

      expect(() => log.entries.add(entries.first), throwsUnsupportedError);
    });

    test('entriesWithType filters correctly', () {
      final log = FailureLog([
        FailureLogEntry(
          stepNumber: 0,
          operationId: 'op-0',
          failureResult: FailureResult.networkError('Net error'),
          actionTaken: ExecutionAction.retry,
        ),
        FailureLogEntry(
          stepNumber: 1,
          operationId: 'op-1',
          failureResult: FailureResult.timeout('Timeout'),
          actionTaken: ExecutionAction.retry,
        ),
        FailureLogEntry(
          stepNumber: 2,
          operationId: 'op-2',
          failureResult: FailureResult.networkError('Net error 2'),
          actionTaken: ExecutionAction.abort,
        ),
      ]);

      final networkErrors = log.entriesWithType(FailureType.networkError);

      expect(networkErrors.length, 2);
      expect(networkErrors[0].operationId, 'op-0');
      expect(networkErrors[1].operationId, 'op-2');
    });

    test('entriesWithAction filters correctly', () {
      final log = FailureLog([
        FailureLogEntry(
          stepNumber: 0,
          operationId: 'op-0',
          failureResult: FailureResult.networkError('Error'),
          actionTaken: ExecutionAction.retry,
        ),
        FailureLogEntry(
          stepNumber: 1,
          operationId: 'op-1',
          failureResult: FailureResult.validationError('Invalid'),
          actionTaken: ExecutionAction.abort,
        ),
      ]);

      final retries = log.entriesWithAction(ExecutionAction.retry);
      final aborts = log.entriesWithAction(ExecutionAction.abort);

      expect(retries.length, 1);
      expect(aborts.length, 1);
    });

    test('hasFailureType returns correct value', () {
      final log = FailureLog([
        FailureLogEntry(
          stepNumber: 0,
          operationId: 'op-0',
          failureResult: FailureResult.timeout('Timeout'),
          actionTaken: ExecutionAction.retry,
        ),
      ]);

      expect(log.hasFailureType(FailureType.timeout), isTrue);
      expect(log.hasFailureType(FailureType.networkError), isFalse);
    });

    test('wasAborted returns correct value', () {
      final logWithAbort = FailureLog([
        FailureLogEntry(
          stepNumber: 0,
          operationId: 'op-0',
          failureResult: FailureResult.validationError('Invalid'),
          actionTaken: ExecutionAction.abort,
        ),
      ]);

      final logWithoutAbort = FailureLog([
        FailureLogEntry(
          stepNumber: 0,
          operationId: 'op-0',
          failureResult: FailureResult.networkError('Error'),
          actionTaken: ExecutionAction.retry,
        ),
      ]);

      expect(logWithAbort.wasAborted, isTrue);
      expect(logWithoutAbort.wasAborted, isFalse);
    });

    test('abortingEntry returns first abort entry', () {
      final log = FailureLog([
        FailureLogEntry(
          stepNumber: 0,
          operationId: 'op-0',
          failureResult: FailureResult.networkError('Error'),
          actionTaken: ExecutionAction.retry,
        ),
        FailureLogEntry(
          stepNumber: 1,
          operationId: 'op-1',
          failureResult: FailureResult.validationError('Invalid'),
          actionTaken: ExecutionAction.abort,
        ),
      ]);

      expect(log.abortingEntry?.operationId, 'op-1');
    });

    test('equality works correctly', () {
      final log1 = FailureLog([
        FailureLogEntry(
          stepNumber: 0,
          operationId: 'op',
          failureResult: FailureResult.timeout('T'),
          actionTaken: ExecutionAction.retry,
        ),
      ]);

      final log2 = FailureLog([
        FailureLogEntry(
          stepNumber: 0,
          operationId: 'op',
          failureResult: FailureResult.timeout('T'),
          actionTaken: ExecutionAction.retry,
        ),
      ]);

      expect(log1, equals(log2));
    });

    test('hashCode is deterministic', () {
      final log1 = FailureLog([
        FailureLogEntry(
          stepNumber: 0,
          operationId: 'op',
          failureResult: FailureResult.timeout('T'),
          actionTaken: ExecutionAction.retry,
        ),
      ]);

      final log2 = FailureLog([
        FailureLogEntry(
          stepNumber: 0,
          operationId: 'op',
          failureResult: FailureResult.timeout('T'),
          actionTaken: ExecutionAction.retry,
        ),
      ]);

      expect(log1.hashCode, log2.hashCode);
    });

    test('toJson and fromJson roundtrip', () {
      final original = FailureLog([
        FailureLogEntry(
          stepNumber: 0,
          operationId: 'op-0',
          failureResult: FailureResult.networkError('Net'),
          actionTaken: ExecutionAction.retry,
        ),
        FailureLogEntry(
          stepNumber: 1,
          operationId: 'op-1',
          failureResult: FailureResult.validationError('Val'),
          actionTaken: ExecutionAction.abort,
        ),
      ]);

      final json = original.toJson();
      final restored = FailureLog.fromJson(json);

      expect(restored, equals(original));
    });

    test('toJsonString produces valid JSON', () {
      final log = FailureLog([
        FailureLogEntry(
          stepNumber: 0,
          operationId: 'op',
          failureResult: FailureResult.timeout('T'),
          actionTaken: ExecutionAction.skip,
        ),
      ]);

      final jsonString = log.toJsonString();
      final parsed = jsonDecode(jsonString);

      expect(parsed['entries'], isA<List>());
      expect((parsed['entries'] as List).length, 1);
    });
  });

  group('FailureLogBuilder', () {
    test('builds log with correct step numbers', () {
      final builder = FailureLogBuilder();

      builder.log(
        operationId: 'op-0',
        failureResult: FailureResult.networkError('Error 0'),
        actionTaken: ExecutionAction.retry,
      );

      builder.log(
        operationId: 'op-1',
        failureResult: FailureResult.timeout('Error 1'),
        actionTaken: ExecutionAction.retry,
      );

      final log = builder.build();

      expect(log.length, 2);
      expect(log.entries[0].stepNumber, 0);
      expect(log.entries[1].stepNumber, 1);
    });

    test('currentStep tracks correctly', () {
      final builder = FailureLogBuilder();

      expect(builder.currentStep, 0);

      builder.log(
        operationId: 'op',
        failureResult: FailureResult.networkError('Error'),
        actionTaken: ExecutionAction.retry,
      );

      expect(builder.currentStep, 1);
    });

    test('logWithPolicy uses policy to determine action', () {
      final builder = FailureLogBuilder();
      const policy = DefaultFailurePolicy();

      final action = builder.logWithPolicy(
        operationId: 'op',
        failureResult: FailureResult.networkError('Net error'),
        policy: policy,
      );

      expect(action, ExecutionAction.retry);

      final log = builder.build();
      expect(log.entries[0].actionTaken, ExecutionAction.retry);
    });

    test('build creates immutable log', () {
      final builder = FailureLogBuilder();

      builder.log(
        operationId: 'op',
        failureResult: FailureResult.timeout('T'),
        actionTaken: ExecutionAction.skip,
      );

      final log = builder.build();

      expect(() => log.entries.add(log.entries.first), throwsUnsupportedError);
    });
  });

  group('FailureLoggingAdapter', () {
    test('processFailure returns correct action', () {
      const adapter = FailureLoggingAdapter(policy: DefaultFailurePolicy());

      expect(
        adapter.processFailure(FailureResult.networkError('Net')),
        ExecutionAction.retry,
      );
      expect(
        adapter.processFailure(FailureResult.validationError('Val')),
        ExecutionAction.abort,
      );
    });

    test('shouldContinue returns correct value', () {
      const adapter = FailureLoggingAdapter(policy: LenientFailurePolicy());

      expect(
        adapter.shouldContinue(FailureResult.networkError('Net')),
        isTrue,
      );
      expect(
        adapter.shouldContinue(FailureResult.validationError('Val')),
        isFalse,
      );
    });

    test('shouldRetry checks both policy and retryable flag', () {
      const adapter = FailureLoggingAdapter(policy: DefaultFailurePolicy());

      final retryableFailure = FailureResult.networkError('Net');
      final nonRetryableFailure = FailureResult.validationError('Val');

      expect(adapter.shouldRetry(retryableFailure), isTrue);
      expect(adapter.shouldRetry(nonRetryableFailure), isFalse);
    });
  });
}
