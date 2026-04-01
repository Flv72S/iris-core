// F8 — Replay state aggregate. Immutable DTO; observational only.

import 'flow_replay_cursor.dart';
import 'flow_replay_step.dart';

/// Immutable replay state: steps, cursor position, initial and final observational state.
class FlowReplayState {
  const FlowReplayState({
    required this.steps,
    required this.cursor,
    required this.initialObservationalState,
    required this.finalObservationalState,
  });

  final List<FlowReplayStep> steps;
  final FlowReplayCursor cursor;
  final FlowObservationalState initialObservationalState;
  final FlowObservationalState finalObservationalState;

  /// Observational state at current cursor position.
  FlowObservationalState get currentObservationalState {
    if (steps.isEmpty) return initialObservationalState;
    final i = cursor.eventIndex.clamp(0, steps.length - 1);
    return steps[i].resultingObservationalState;
  }

  /// Replay step at current cursor, if any.
  FlowReplayStep? get currentStep {
    if (steps.isEmpty || cursor.eventIndex >= steps.length) return null;
    return steps[cursor.eventIndex];
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowReplayState &&
          _listEquals(steps, other.steps) &&
          cursor == other.cursor &&
          initialObservationalState == other.initialObservationalState &&
          finalObservationalState == other.finalObservationalState);

  static bool _listEquals(List<FlowReplayStep> a, List<FlowReplayStep> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(
        Object.hashAll(steps),
        cursor,
        initialObservationalState,
        finalObservationalState,
      );
}
