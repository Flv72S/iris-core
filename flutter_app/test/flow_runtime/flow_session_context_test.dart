// F2 — Flow session context: immutability, copyWith, equality.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_session_context.dart';

void main() {
  group('FlowSessionContext', () {
    test('immutable: copyWith returns new instance', () {
      final ctx = FlowSessionContext(
        sessionId: const FlowSessionId('s1'),
        snapshotId: 'snap1',
        activeStep: const FlowStepId('step1'),
        completedSteps: const [FlowStepId('a')],
        contextData: {const FlowContextKey('k'): 'v'},
      );
      final copy = ctx.copyWith(activeStep: const FlowStepId('step2'));
      expect(identical(ctx, copy), isFalse);
      expect(ctx.activeStep, equals(const FlowStepId('step1')));
      expect(copy.activeStep, equals(const FlowStepId('step2')));
    });

    test('equality and hashCode', () {
      const a = FlowSessionContext(
        sessionId: FlowSessionId('s1'),
        completedSteps: [FlowStepId('x')],
      );
      const b = FlowSessionContext(
        sessionId: FlowSessionId('s1'),
        completedSteps: [FlowStepId('x')],
      );
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });

    test('contextData is typed and preserved in copyWith', () {
      const key = FlowContextKey('k');
      final ctx = FlowSessionContext(
        sessionId: const FlowSessionId('s1'),
        contextData: {key: 'value'},
      );
      final copy = ctx.copyWith();
      expect(copy.contextData[key], equals('value'));
      expect(copy.contextData.length, equals(1));
    });
  });
}
