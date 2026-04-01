// F8 — Same telemetry snapshot yields same replay state.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event_type.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_telemetry_snapshot.dart';
import 'package:iris_flutter_app/flow_replay/flow_replay_engine.dart';

void main() {
  test('same snapshot produces same replay state', () {
    const sessionId = FlowSessionId('det-session');
    final events = [
      FlowEvent(
        eventId: 'e0',
        eventType: FlowEventType.flowStarted,
        sessionId: sessionId,
        sequenceIndex: 0,
        timestamp: const FlowTimestamp(1000),
      ),
      FlowEvent(
        eventId: 'e1',
        eventType: FlowEventType.stepEntered,
        sessionId: sessionId,
        stepId: const FlowStepId('step-a'),
        sequenceIndex: 1,
        timestamp: const FlowTimestamp(2000),
      ),
      FlowEvent(
        eventId: 'e2',
        eventType: FlowEventType.flowCompleted,
        sessionId: sessionId,
        sequenceIndex: 2,
        timestamp: const FlowTimestamp(3000),
      ),
    ];
    final snapshot = FlowTelemetrySnapshot(sessionId: sessionId, events: events);

    final state1 = FlowReplayEngine.fromSnapshot(snapshot);
    final state2 = FlowReplayEngine.fromSnapshot(snapshot);

    expect(state1.steps.length, state2.steps.length);
    expect(state1.steps.length, 3);
    for (var i = 0; i < state1.steps.length; i++) {
      expect(state1.steps[i].event.eventId, state2.steps[i].event.eventId);
      expect(
          state1.steps[i].resultingObservationalState.phase,
          state2.steps[i].resultingObservationalState.phase);
    }
    expect(state1.initialObservationalState.phase,
        state2.initialObservationalState.phase);
    expect(state1.finalObservationalState.phase,
        state2.finalObservationalState.phase);
    expect(
        state1.finalObservationalState.phase.toString(),
        'FlowReplayPhase.completed');
  });

  test('same snapshot produces same debug snapshot at same cursor', () {
    const sessionId = FlowSessionId('snap-session');
    final events = [
      FlowEvent(
        eventId: 'a0',
        eventType: FlowEventType.flowStarted,
        sessionId: sessionId,
        sequenceIndex: 0,
        timestamp: const FlowTimestamp(0),
      ),
    ];
    final snapshot = FlowTelemetrySnapshot(sessionId: sessionId, events: events);
    final state = FlowReplayEngine.fromSnapshot(snapshot);
    final debug1 = FlowReplayEngine.buildDebugSnapshot(state);
    final debug2 = FlowReplayEngine.buildDebugSnapshot(state);

    expect(debug1.sessionId, debug2.sessionId);
    expect(debug1.currentStepId, debug2.currentStepId);
    expect(debug1.eventsApplied.length, debug2.eventsApplied.length);
  });
}
