// F2 — Flow runtime state aggregator. Pure transitions; no normative logic.

import 'flow_orchestration_state.dart';
import 'flow_runtime_models.dart';
import 'flow_session_context.dart';
import 'flow_temporal_context.dart';

/// Aggregated runtime state: session + temporal + orchestration.
class FlowRuntimeState {
  const FlowRuntimeState({
    required this.sessionContext,
    required this.temporalContext,
    required this.orchestrationState,
  });

  factory FlowRuntimeState.initial() => FlowRuntimeState(
        sessionContext: const FlowSessionContext(
            sessionId: FlowSessionId(''), completedSteps: [], contextData: {}),
        temporalContext: const FlowTemporalContext(),
        orchestrationState: const FlowOrchestrationState(),
      );

  final FlowSessionContext sessionContext;
  final FlowTemporalContext temporalContext;
  final FlowOrchestrationState orchestrationState;

  FlowRuntimeState copyWith({
    FlowSessionContext? sessionContext,
    FlowTemporalContext? temporalContext,
    FlowOrchestrationState? orchestrationState,
  }) {
    return FlowRuntimeState(
      sessionContext: sessionContext ?? this.sessionContext,
      temporalContext: temporalContext ?? this.temporalContext,
      orchestrationState: orchestrationState ?? this.orchestrationState,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowRuntimeState &&
          sessionContext == other.sessionContext &&
          temporalContext == other.temporalContext &&
          orchestrationState == other.orchestrationState);

  @override
  int get hashCode =>
      Object.hash(sessionContext, temporalContext, orchestrationState);

  /// Start a new session. Pure: returns new state.
  FlowRuntimeState startSession({
    required FlowSessionId sessionId,
    required FlowClock clock,
    String? snapshotId,
    FlowStepId? initialStep,
  }) {
    final now = clock.now();
    return copyWith(
      sessionContext: sessionContext.copyWith(
        sessionId: sessionId,
        snapshotId: snapshotId,
        activeStep: initialStep,
        completedSteps: [],
        contextData: {},
      ),
      temporalContext: temporalContext.copyWith(
        sessionStart: now,
        lastStepAt: initialStep != null ? now : null,
      ),
      orchestrationState: orchestrationState.copyWith(
        status: FlowStatus.running,
        currentStep: initialStep,
        direction: FlowDirection.forward,
      ),
    );
  }

  /// Move to a step. Pure: returns new state.
  FlowRuntimeState moveToStep(FlowStepId step, FlowClock clock) {
    final now = clock.now();
    return copyWith(
      sessionContext: sessionContext.copyWith(activeStep: step),
      temporalContext: temporalContext.copyWith(lastStepAt: now),
      orchestrationState: orchestrationState.copyWith(
        currentStep: step,
        direction: FlowDirection.forward,
      ),
    );
  }

  /// Mark current step completed and optionally move. Pure: returns new state.
  FlowRuntimeState completeStep(FlowClock clock, {FlowStepId? nextStep}) {
    final current = orchestrationState.currentStep ?? sessionContext.activeStep;
    final completed = current != null
        ? [...sessionContext.completedSteps, current]
        : sessionContext.completedSteps;
    final now = clock.now();
    return copyWith(
      sessionContext: sessionContext.copyWith(
        completedSteps: completed,
        activeStep: nextStep,
      ),
      temporalContext: temporalContext.copyWith(lastStepAt: now),
      orchestrationState: orchestrationState.copyWith(
        currentStep: nextStep,
        direction: FlowDirection.forward,
      ),
    );
  }

  /// Pause flow. Pure: returns new state.
  FlowRuntimeState pause() => copyWith(
        orchestrationState:
            orchestrationState.copyWith(status: FlowStatus.paused),
      );

  /// Resume flow. Pure: returns new state.
  FlowRuntimeState resume() => copyWith(
        orchestrationState:
            orchestrationState.copyWith(status: FlowStatus.running),
      );

  /// Mark flow completed. Pure: returns new state.
  FlowRuntimeState complete() => copyWith(
        orchestrationState:
            orchestrationState.copyWith(status: FlowStatus.completed),
      );
}
