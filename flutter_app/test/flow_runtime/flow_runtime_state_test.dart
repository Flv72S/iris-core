// F2 — Flow runtime state: deterministic transitions, immutability, aggregation.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_runtime/flow_orchestration_state.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_state.dart';
import 'package:iris_flutter_app/flow_runtime/flow_session_context.dart';
import 'package:iris_flutter_app/flow_runtime/flow_temporal_context.dart';

void main() {
  late TestClock clock;

  setUp(() {
    clock = TestClock(const FlowTimestamp(1000));
  });

  group('Deterministic transitions', () {
    test('same input produces same state (startSession)', () {
      final initial = FlowRuntimeState.initial();
      final a = initial.startSession(
        sessionId: const FlowSessionId('s1'),
        clock: clock,
        snapshotId: 'snap1',
        initialStep: const FlowStepId('step1'),
      );
      final b = initial.startSession(
        sessionId: const FlowSessionId('s1'),
        clock: clock,
        snapshotId: 'snap1',
        initialStep: const FlowStepId('step1'),
      );
      expect(a.sessionContext.sessionId, equals(b.sessionContext.sessionId));
      expect(a.sessionContext.activeStep, equals(b.sessionContext.activeStep));
      expect(a.orchestrationState.status, equals(FlowStatus.running));
      expect(a.temporalContext.sessionStart, equals(b.temporalContext.sessionStart));
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });

    test('same input produces same state (moveToStep)', () {
      final initial = FlowRuntimeState.initial();
      final started = initial.startSession(
        sessionId: const FlowSessionId('s1'),
        clock: clock,
        initialStep: const FlowStepId('a'),
      );
      final a = started.moveToStep(const FlowStepId('b'), clock);
      clock.setNow(const FlowTimestamp(1000));
      final b = started.moveToStep(const FlowStepId('b'), clock);
      expect(a.sessionContext.activeStep, equals(const FlowStepId('b')));
      expect(a, equals(b));
    });

    test('pause/resume/complete are deterministic', () {
      final initial = FlowRuntimeState.initial();
      final started = initial.startSession(
        sessionId: const FlowSessionId('s1'),
        clock: clock,
      );
      final paused = started.pause();
      expect(paused.orchestrationState.status, equals(FlowStatus.paused));
      final resumed = paused.resume();
      expect(resumed.orchestrationState.status, equals(FlowStatus.running));
      final completed = resumed.complete();
      expect(completed.orchestrationState.status, equals(FlowStatus.completed));
      final paused2 = started.pause();
      expect(paused2.orchestrationState.status, equals(FlowStatus.paused));
      expect(paused, equals(paused2));
    });
  });

  group('Immutability', () {
    test('startSession does not mutate initial state', () {
      final initial = FlowRuntimeState.initial();
      initial.startSession(
        sessionId: const FlowSessionId('s1'),
        clock: clock,
        initialStep: const FlowStepId('x'),
      );
      expect(initial.orchestrationState.status, equals(FlowStatus.idle));
      expect(initial.sessionContext.activeStep, isNull);
    });

    test('moveToStep returns new instance', () {
      final initial = FlowRuntimeState.initial();
      final started = initial.startSession(
        sessionId: const FlowSessionId('s1'),
        clock: clock,
        initialStep: const FlowStepId('a'),
      );
      final moved = started.moveToStep(const FlowStepId('b'), clock);
      expect(identical(started, moved), isFalse);
      expect(started.sessionContext.activeStep, equals(const FlowStepId('a')));
      expect(moved.sessionContext.activeStep, equals(const FlowStepId('b')));
    });

    test('completeStep returns new instance and updates completed list', () {
      final initial = FlowRuntimeState.initial();
      final started = initial.startSession(
        sessionId: const FlowSessionId('s1'),
        clock: clock,
        initialStep: const FlowStepId('step1'),
      );
      final afterComplete = started.completeStep(clock, nextStep: const FlowStepId('step2'));
      expect(identical(started, afterComplete), isFalse);
      expect(started.sessionContext.completedSteps, isEmpty);
      expect(afterComplete.sessionContext.completedSteps, equals([const FlowStepId('step1')]));
      expect(afterComplete.sessionContext.activeStep, equals(const FlowStepId('step2')));
    });
  });

  group('Orchestration integrity', () {
    test('startSession sets running and current step', () {
      final initial = FlowRuntimeState.initial();
      final s = initial.startSession(
        sessionId: const FlowSessionId('sid'),
        clock: clock,
        snapshotId: 'snap',
        initialStep: const FlowStepId('first'),
      );
      expect(s.orchestrationState.status, equals(FlowStatus.running));
      expect(s.orchestrationState.currentStep, equals(const FlowStepId('first')));
      expect(s.sessionContext.sessionId, equals(const FlowSessionId('sid')));
      expect(s.sessionContext.snapshotId, equals('snap'));
      expect(s.temporalContext.sessionStart, equals(const FlowTimestamp(1000)));
    });

    test('moveToStep updates active step and lastStepAt', () {
      final initial = FlowRuntimeState.initial();
      final started = initial.startSession(
        sessionId: const FlowSessionId('s1'),
        clock: clock,
        initialStep: const FlowStepId('a'),
      );
      clock.setNow(const FlowTimestamp(2000));
      final moved = started.moveToStep(const FlowStepId('b'), clock);
      expect(moved.sessionContext.activeStep, equals(const FlowStepId('b')));
      expect(moved.orchestrationState.currentStep, equals(const FlowStepId('b')));
      expect(moved.temporalContext.lastStepAt?.epochMillis, equals(2000));
    });

    test('direction is forward after moveToStep', () {
      final initial = FlowRuntimeState.initial();
      final started = initial.startSession(
        sessionId: const FlowSessionId('s1'),
        clock: clock,
        initialStep: const FlowStepId('a'),
      );
      final moved = started.moveToStep(const FlowStepId('b'), clock);
      expect(moved.orchestrationState.direction, equals(FlowDirection.forward));
    });
  });
}
