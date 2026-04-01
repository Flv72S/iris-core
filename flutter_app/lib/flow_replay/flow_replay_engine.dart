// F8 — Replay engine. Pure; no async, no mutation, no Core, no policy.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event_type.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_telemetry_snapshot.dart';

import 'flow_debug_snapshot.dart';
import 'flow_replay_cursor.dart';
import 'flow_replay_state.dart';
import 'flow_replay_step.dart';

/// Observational replay from telemetry only. No live runtime; no policy enforcement.
class FlowReplayEngine {
  FlowReplayEngine._();

  /// Build replay state from a telemetry snapshot. Deterministic: same snapshot → same state.
  static FlowReplayState fromSnapshot(FlowTelemetrySnapshot snapshot) {
    const initial = FlowObservationalState(phase: FlowReplayPhase.notStarted);
    if (snapshot.events.isEmpty) {
      return FlowReplayState(
        steps: const [],
        cursor: const FlowReplayCursor(0),
        initialObservationalState: initial,
        finalObservationalState: initial,
      );
    }
    var state = initial;
    final steps = <FlowReplayStep>[];
    for (final event in snapshot.events) {
      state = _nextObservationalState(state, event);
      steps.add(FlowReplayStep(
        event: event,
        resultingObservationalState: state,
        stepIdRef: event.stepId,
        metadata: Map.unmodifiable(event.metadata),
      ));
    }
    return FlowReplayState(
      steps: List.unmodifiable(steps),
      cursor: const FlowReplayCursor(0),
      initialObservationalState: initial,
      finalObservationalState: state,
    );
  }

  static FlowObservationalState _nextObservationalState(
    FlowObservationalState prev,
    FlowEvent event,
  ) {
    FlowReplayPhase phase = prev.phase;
    final stepId = event.stepId ?? prev.currentStepId;
    switch (event.eventType) {
      case FlowEventType.flowStarted:
        phase = FlowReplayPhase.running;
        break;
      case FlowEventType.stepEntered:
      case FlowEventType.stepCompleted:
      case FlowEventType.navigationAttempted:
      case FlowEventType.navigationBlocked:
      case FlowEventType.policyViolation:
        phase = FlowReplayPhase.running;
        break;
      case FlowEventType.flowPaused:
        phase = FlowReplayPhase.paused;
        break;
      case FlowEventType.flowResumed:
        phase = FlowReplayPhase.running;
        break;
      case FlowEventType.flowCompleted:
        phase = FlowReplayPhase.completed;
        break;
    }
    return FlowObservationalState(currentStepId: stepId, phase: phase);
  }

  /// Advance cursor by one. Returns new state or null if at end.
  static FlowReplayState? advance(FlowReplayState state) {
    if (!state.cursor.canAdvance(state.steps.length)) return null;
    return FlowReplayState(
      steps: state.steps,
      cursor: state.cursor.advance(),
      initialObservationalState: state.initialObservationalState,
      finalObservationalState: state.finalObservationalState,
    );
  }

  /// Build debug snapshot from current replay state. Observational only.
  static FlowDebugSnapshot buildDebugSnapshot(FlowReplayState state) {
    final current = state.currentStep;
    final eventsApplied = state.steps.isEmpty
        ? <FlowEvent>[]
        : state.steps
            .sublist(0, state.cursor.eventIndex + 1)
            .map((s) => s.event)
            .toList();
    return FlowDebugSnapshot(
      replayState: state,
      sessionId: state.steps.isNotEmpty
          ? state.steps.first.event.sessionId
          : const FlowSessionId(''),
      currentStep: current,
      eventsApplied: List.unmodifiable(eventsApplied),
      currentStepId: state.currentObservationalState.currentStepId,
    );
  }
}