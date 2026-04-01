// F3 — Flow step definition. Immutable, declarative; no logic or callbacks.

import 'flow_step_id.dart';

/// Single step in the flow. Metadata and identity only.
class FlowStep {
  const FlowStep({
    required this.stepId,
    required this.label,
    this.description,
    this.metadata = const {},
  });

  final FlowStepId stepId;
  final String label;
  final String? description;
  final Map<String, Object> metadata;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowStep &&
          stepId == other.stepId &&
          label == other.label &&
          description == other.description &&
          _mapEquals(metadata, other.metadata));

  static bool _mapEquals(Map<String, Object> a, Map<String, Object> b) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (!b.containsKey(k) || a[k] != b[k]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(stepId, label, description, Object.hashAll(metadata.entries));
}
