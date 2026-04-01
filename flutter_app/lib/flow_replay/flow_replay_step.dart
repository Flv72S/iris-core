// F8 — Replay step. Observational reconstruction only; not live runtime state.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event.dart';

/// Observational phase derived from event sequence. Not normative.
enum FlowReplayPhase { notStarted, running, paused, completed }

/// Minimal state reconstructed from events only. Not live runtime; for replay only.
class FlowObservationalState {
  const FlowObservationalState({
    this.currentStepId,
    this.phase = FlowReplayPhase.notStarted,
  });

  final FlowStepId? currentStepId;
  final FlowReplayPhase phase;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowObservationalState &&
          currentStepId == other.currentStepId &&
          phase == other.phase);

  @override
  int get hashCode => Object.hash(currentStepId, phase);
}

/// One step in a replay: applied event and resulting observational state.
/// Not real runtime state; for analysis and debug only.
class FlowReplayStep {
  const FlowReplayStep({
    required this.event,
    required this.resultingObservationalState,
    this.stepIdRef,
    this.metadata = const {},
  });

  final FlowEvent event;
  final FlowObservationalState resultingObservationalState;
  final FlowStepId? stepIdRef;
  final Map<String, Object> metadata;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowReplayStep &&
          event == other.event &&
          resultingObservationalState == other.resultingObservationalState &&
          stepIdRef == other.stepIdRef);

  @override
  int get hashCode =>
      Object.hash(event, resultingObservationalState, stepIdRef);
}
