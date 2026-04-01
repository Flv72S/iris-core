/// O10 — Compaction policy. Explicit trigger; no auto-compact in O10.

/// Policy for ledger compaction. Compaction is explicitly triggered.
class CompactionPolicy {
  const CompactionPolicy({
    this.minEventsBeforeCompaction = 1000,
    this.preserveRecentEvents = 200,
    this.preserveForkWindow = 500,
    this.autoCompact = false,
  });

  /// Minimum ledger length before compaction is allowed.
  final int minEventsBeforeCompaction;

  /// Number of recent events to preserve (replay safety margin).
  final int preserveRecentEvents;

  /// Number of events to preserve for fork detection window.
  final int preserveForkWindow;

  /// Not used in O10; compaction is explicit.
  final bool autoCompact;

  /// O10 default policy.
  static const CompactionPolicy defaultPolicy = CompactionPolicy(
    minEventsBeforeCompaction: 1000,
    preserveRecentEvents: 200,
    preserveForkWindow: 500,
    autoCompact: false,
  );
}
