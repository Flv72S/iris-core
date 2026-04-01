// H2 - GCP identifier. Deterministic; no runtime auto-increment.

class GCPId {
  const GCPId(this.value);

  final String value;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is GCPId && value == other.value);

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => value;
}
