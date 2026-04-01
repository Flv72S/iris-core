/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Deterministic time abstraction: no real-time access.

/// Clock that returns a fixed timestamp. Use for deterministic simulation
/// only. No real-time or system clock access.
class DeterministicClock {
  DeterministicClock(this.fixedTimestamp);

  final int fixedTimestamp;

  int now() => fixedTimestamp;
}
