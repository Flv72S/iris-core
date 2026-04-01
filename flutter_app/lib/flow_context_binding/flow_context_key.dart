// F5 — Context key. Value object; deterministic equality; serializable.

/// Strongly typed context key. No free-form strings at use site.
class FlowContextKey {
  const FlowContextKey(this.value);

  final String value;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowContextKey && value == other.value);

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => 'FlowContextKey($value)';

  String toJson() => value;
}
