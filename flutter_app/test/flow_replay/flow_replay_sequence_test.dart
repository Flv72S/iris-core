// F8 — Step-by-step replay: start, step1, step2, pause, resume, end.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event_type.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_telemetry_snapshot.dart';
import 'package:iris_flutter_app/flow_replay/flow_replay_engine.dart';
import 'package:iris_flutter_app/flow_replay/flow_replay_step.dart';

void main() {
  test('full sequence reconstructed: start, step1, step2, pause, resume, end', () {
    const sessionId = FlowSessionId('seq-session');
    const step1 = FlowStepId('step-1');
    const step2 = FlowStepId('step-2');
    final events = [
      FlowEvent(
          eventId: 'e0',
          eventType: FlowEventType.flowStarted,
          sessionId: sessionId,
          sequenceIndex: 0,
          timestamp: const FlowTimestamp(1000)),
      FlowEvent(
          eventId: 'e1',
          eventType: FlowEventType.stepEntered,
          sessionId: sessionId,
          stepId: step1,
          sequenceIndex: 1,
          timestamp: const FlowTimestamp(2000)),
      FlowEvent(
          eventId: 'e2',
          eventType: FlowEventType.stepCompleted,
          sessionId: sessionId,
          stepId: step1,
          sequenceIndex: 2,
          timestamp: const FlowTimestamp(3000)),
      FlowEvent(
          eventId: 'e3',
          eventType: FlowEventType.stepEntered,
          sessionId: sessionId,
          stepId: step2,
          sequenceIndex: 3,
          timestamp: const FlowTimestamp(4000)),
      FlowEvent(
          eventId: 'e4',
          eventType: FlowEventType.flowPaused,
          sessionId: sessionId,
          sequenceIndex: 4,
          timestamp: const FlowTimestamp(5000)),
      FlowEvent(
          eventId: 'e5',
          eventType: FlowEventType.flowResumed,
          sessionId: sessionId,
          sequenceIndex: 5,
          timestamp: const FlowTimestamp(6000)),
      FlowEvent(
          eventId: 'e6',
          eventType: FlowEventType.flowCompleted,
          sessionId: sessionId,
          sequenceIndex: 6,
          timestamp: const FlowTimestamp(7000)),
    ];
    final snapshot = FlowTelemetrySnapshot(sessionId: sessionId, events: events);
    var state = FlowReplayEngine.fromSnapshot(snapshot);

    expect(state.steps.length, 7);
    expect(state.initialObservationalState.phase, FlowReplayPhase.notStarted);
    expect(state.finalObservationalState.phase, FlowReplayPhase.completed);
    expect(state.finalObservationalState.currentStepId, step2);

    expect(state.steps[0].event.eventType, FlowEventType.flowStarted);
    expect(state.steps[1].event.eventType, FlowEventType.stepEntered);
    expect(state.steps[1].resultingObservationalState.currentStepId, step1);
    expect(state.steps[4].resultingObservationalState.phase, FlowReplayPhase.paused);
    expect(state.steps[5].resultingObservationalState.phase, FlowReplayPhase.running);
    expect(state.steps[6].resultingObservationalState.phase, FlowReplayPhase.completed);

    var debug = FlowReplayEngine.buildDebugSnapshot(state);
    expect(debug.sessionId, sessionId);
    expect(debug.eventsApplied.length, 1);
    expect(debug.currentStep?.event.eventId, 'e0');

    state = FlowReplayEngine.advance(state)!;
    state = FlowReplayEngine.advance(state)!;
    debug = FlowReplayEngine.buildDebugSnapshot(state);
    expect(debug.eventsApplied.length, 3);
    expect(debug.currentStep?.event.eventId, 'e2');

    while (true) {
      final next = FlowReplayEngine.advance(state);
      if (next == null) break;
      state = next;
    }
    final atEnd = FlowReplayEngine.advance(state);
    expect(atEnd, isNull);
  });
}
