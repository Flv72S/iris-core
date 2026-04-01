// FASE I — I6 Failure Semantics integration test.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_policy.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_result.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_type.dart';
import 'package:iris_flutter_app/flow_media/failure_semantics/failure_logging_adapter.dart';

void main() {
  group('I6 — Failure Semantics Model', () {
    test('injected failure propagates as FailureResult', () {
      final failure = FailureResult.networkError('timeout');
      expect(failure.type, FailureType.networkError);
      expect(failure.message, 'timeout');
    });
    test('DefaultFailurePolicy deterministic', () {
      const policy = DefaultFailurePolicy();
      expect(policy.actionFor(FailureType.networkError), ExecutionAction.retry);
      expect(policy.actionFor(FailureType.policyViolation), ExecutionAction.abort);
      expect(policy.actionFor(FailureType.validationError), ExecutionAction.abort);
    });
    test('FailureLoggingAdapter processFailure returns action', () {
      const policy = DefaultFailurePolicy();
      final adapter = FailureLoggingAdapter(policy: policy);
      final failure = FailureResult.networkError('sim');
      final action = adapter.processFailure(failure);
      expect(action, ExecutionAction.retry);
    });
    test('failure log hash stable for same entries', () {
      final builder = FailureLogBuilder();
      builder.log(
        operationId: 'op0',
        failureResult: FailureResult.networkError('a'),
        actionTaken: ExecutionAction.retry,
      );
      builder.log(
        operationId: 'op1',
        failureResult: FailureResult.policyViolation('b'),
        actionTaken: ExecutionAction.abort,
      );
      final log1 = builder.build();
      final builder2 = FailureLogBuilder();
      builder2.log(
        operationId: 'op0',
        failureResult: FailureResult.networkError('a'),
        actionTaken: ExecutionAction.retry,
      );
      builder2.log(
        operationId: 'op1',
        failureResult: FailureResult.policyViolation('b'),
        actionTaken: ExecutionAction.abort,
      );
      final log2 = builder2.build();
      expect(log1, equals(log2));
      expect(log1.hashCode, log2.hashCode);
    });
  });
}
