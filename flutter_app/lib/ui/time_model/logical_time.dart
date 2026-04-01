// Phase 11.4.2 — Deterministic logical tick. No system time. Replayable.

/// Represents a deterministic logical tick. Immutable, incremental, no wall-time.
class LogicalTime {
  const LogicalTime({
    required this.tick,
    required this.origin,
  });

  final int tick;
  final String origin;

  /// Initial logical time (tick 0). Use for session start or bootstrap.
  static const LogicalTime initial = LogicalTime(tick: 0, origin: 'initial');

  /// Returns a new LogicalTime with tick + 1. Same or custom origin.
  LogicalTime next({String? origin}) => LogicalTime(
        tick: tick + 1,
        origin: origin ?? this.origin,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LogicalTime &&
          runtimeType == other.runtimeType &&
          tick == other.tick &&
          origin == other.origin;

  @override
  int get hashCode => Object.hash(tick, origin);
}
