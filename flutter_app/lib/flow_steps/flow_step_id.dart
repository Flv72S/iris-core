// F3 — Step identifier. Value object; deterministic equality; minimal validation.

/// Step identifier. Non-empty; serializable; no logic.
class FlowStepId {
  const FlowStepId(this.value);

  factory FlowStepId.from(String value) {
    if (value.isEmpty) throw ArgumentError('FlowStepId must not be empty');
    return FlowStepId(value);
  }

  final String value;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is FlowStepId && value == other.value);

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => 'FlowStepId($value)';

  /// For serialization.
  String toJson() => value;
}
