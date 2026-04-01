// F2 — Flow session context. Immutable; no semantic logic.

import 'flow_runtime_models.dart';

/// Session context: id, snapshot ref, current step, completed steps, typed context data.
class FlowSessionContext {
  const FlowSessionContext({
    required this.sessionId,
    this.snapshotId,
    this.activeStep,
    this.completedSteps = const [],
    this.contextData = const {},
  });

  final FlowSessionId sessionId;
  final String? snapshotId;
  final FlowStepId? activeStep;
  final List<FlowStepId> completedSteps;
  final Map<FlowContextKey, Object> contextData;

  FlowSessionContext copyWith({
    FlowSessionId? sessionId,
    String? snapshotId,
    FlowStepId? activeStep,
    List<FlowStepId>? completedSteps,
    Map<FlowContextKey, Object>? contextData,
  }) {
    return FlowSessionContext(
      sessionId: sessionId ?? this.sessionId,
      snapshotId: snapshotId ?? this.snapshotId,
      activeStep: activeStep ?? this.activeStep,
      completedSteps: completedSteps ?? List<FlowStepId>.from(this.completedSteps),
      contextData: contextData ?? Map<FlowContextKey, Object>.from(this.contextData),
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowSessionContext &&
          sessionId == other.sessionId &&
          snapshotId == other.snapshotId &&
          activeStep == other.activeStep &&
          _listEquals(completedSteps, other.completedSteps) &&
          _mapEquals(contextData, other.contextData));

  static bool _listEquals(List<FlowStepId> a, List<FlowStepId> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
    return true;
  }

  static bool _mapEquals(
      Map<FlowContextKey, Object> a, Map<FlowContextKey, Object> b) {
    if (a.length != b.length) return false;
    for (final k in a.keys) if (a[k] != b[k]) return false;
    return true;
  }

  @override
  int get hashCode =>
      Object.hash(sessionId, snapshotId, activeStep,
          Object.hashAll(completedSteps), Object.hashAll(contextData.entries));
}
