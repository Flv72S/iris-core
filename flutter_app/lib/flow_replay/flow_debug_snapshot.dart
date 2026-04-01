// F8 — Debug snapshot. Observational only; not for verification or certification.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';
import 'package:iris_flutter_app/flow_telemetry/flow_event.dart';

import 'flow_replay_state.dart';
import 'flow_replay_step.dart';

/// Reconstructed flow state for debug. Do not use for verification, certification, or decisions.
class FlowDebugSnapshot {
  const FlowDebugSnapshot({
    required this.replayState,
    required this.sessionId,
    this.currentStep,
    this.eventsApplied = const [],
    this.currentStepId,
  });

  final FlowReplayState replayState;
  final FlowSessionId sessionId;
  final FlowReplayStep? currentStep;
  final List<FlowEvent> eventsApplied;
  final FlowStepId? currentStepId;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowDebugSnapshot &&
          replayState == other.replayState &&
          sessionId == other.sessionId &&
          currentStep == other.currentStep &&
          currentStepId == other.currentStepId);

  @override
  int get hashCode =>
      Object.hash(replayState, sessionId, currentStep, currentStepId);
}
