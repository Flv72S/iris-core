// F2 — Flow orchestration state. Technical state only; no business/legal logic.

import 'flow_runtime_models.dart';

/// Flow lifecycle status.
enum FlowStatus {
  idle,
  running,
  paused,
  completed,
}

/// Navigation direction.
enum FlowDirection {
  forward,
  backward,
}

/// Orchestration state: current step, status, direction. No validation or inference.
class FlowOrchestrationState {
  const FlowOrchestrationState({
    this.status = FlowStatus.idle,
    this.currentStep,
    this.direction = FlowDirection.forward,
  });

  final FlowStatus status;
  final FlowStepId? currentStep;
  final FlowDirection direction;

  FlowOrchestrationState copyWith({
    FlowStatus? status,
    FlowStepId? currentStep,
    FlowDirection? direction,
  }) {
    return FlowOrchestrationState(
      status: status ?? this.status,
      currentStep: currentStep ?? this.currentStep,
      direction: direction ?? this.direction,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowOrchestrationState &&
          status == other.status &&
          currentStep == other.currentStep &&
          direction == other.direction);

  @override
  int get hashCode => Object.hash(status, currentStep, direction);
}
