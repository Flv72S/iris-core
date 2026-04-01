/// O7 — Outcome of a remote segment replay. Used when reporting back to the engine.

/// Result of attempting to apply a remote ledger segment (replay-before-merge).
class ReplayOutcome {
  const ReplayOutcome({
    required this.success,
    this.appliedSegments = 0,
  });

  /// True if replay validated and state was committed.
  final bool success;

  /// Number of segments (snapshots) applied when [success] is true.
  final int appliedSegments;
}
