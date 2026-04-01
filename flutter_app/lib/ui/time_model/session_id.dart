// Phase 11.4.2 — Deterministic session identifier. No random, no system time.

/// Session identifier. Derived explicitly (e.g. on session start or from trace). Not random.
class SessionId {
  const SessionId(this.value);

  final String value;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SessionId &&
          runtimeType == other.runtimeType &&
          value == other.value;

  @override
  int get hashCode => value.hashCode;
}
