// F2 — Flow orchestration state: enums, copyWith, no business logic.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_runtime/flow_orchestration_state.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';

void main() {
  group('FlowOrchestrationState', () {
    test('default is idle', () {
      const state = FlowOrchestrationState();
      expect(state.status, equals(FlowStatus.idle));
      expect(state.currentStep, isNull);
      expect(state.direction, equals(FlowDirection.forward));
    });

    test('copyWith returns new instance', () {
      const state = FlowOrchestrationState(status: FlowStatus.running);
      final copy = state.copyWith(status: FlowStatus.paused);
      expect(identical(state, copy), isFalse);
      expect(state.status, equals(FlowStatus.running));
      expect(copy.status, equals(FlowStatus.paused));
    });

    test('FlowStatus and FlowDirection values', () {
      expect(FlowStatus.values, contains(FlowStatus.idle));
      expect(FlowStatus.values, contains(FlowStatus.running));
      expect(FlowStatus.values, contains(FlowStatus.paused));
      expect(FlowStatus.values, contains(FlowStatus.completed));
      expect(FlowDirection.values, contains(FlowDirection.forward));
      expect(FlowDirection.values, contains(FlowDirection.backward));
    });

    test('equality', () {
      const a = FlowOrchestrationState(
        status: FlowStatus.running,
        currentStep: FlowStepId('s1'),
      );
      const b = FlowOrchestrationState(
        status: FlowStatus.running,
        currentStep: FlowStepId('s1'),
      );
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });
  });
}
