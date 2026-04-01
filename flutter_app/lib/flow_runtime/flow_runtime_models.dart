// F2 — Flow runtime models. Immutable; no direct DateTime.

/// Opaque step identifier. Immutable.
class FlowStepId {
  const FlowStepId(this.value);
  final String value;
  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is FlowStepId && value == other.value);
  @override
  int get hashCode => value.hashCode;
}

/// Opaque phase identifier. Immutable.
class FlowPhaseId {
  const FlowPhaseId(this.value);
  final String value;
  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is FlowPhaseId && value == other.value);
  @override
  int get hashCode => value.hashCode;
}

/// Opaque session identifier. Immutable.
class FlowSessionId {
  const FlowSessionId(this.value);
  final String value;
  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is FlowSessionId && value == other.value);
  @override
  int get hashCode => value.hashCode;
}

/// Key for context data map. Immutable.
class FlowContextKey {
  const FlowContextKey(this.value);
  final String value;
  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is FlowContextKey && value == other.value);
  @override
  int get hashCode => value.hashCode;
}

/// Deterministic time wrapper. No direct DateTime in runtime logic; use FlowClock.
class FlowTimestamp {
  const FlowTimestamp(this.epochMillis);
  final int epochMillis;
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowTimestamp && epochMillis == other.epochMillis);
  @override
  int get hashCode => epochMillis.hashCode;
}

/// Abstract clock. Injected; runtime must not read system time directly.
abstract interface class FlowClock {
  FlowTimestamp now();
}
