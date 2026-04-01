/// O10 — Result of a compaction run. Transactional; no partial state.

/// Result of [LedgerCompactor.compact].
class CompactionResult {
  const CompactionResult({
    required this.success,
    required this.message,
    this.previousLedgerSize = 0,
    this.newLedgerSize = 0,
    this.prunedEventsCount = 0,
    this.newSnapshotHash,
  });

  final bool success;
  final String message;

  /// Ledger length before compaction.
  final int previousLedgerSize;

  /// Ledger length after compaction.
  final int newLedgerSize;

  /// Number of events (snapshots) pruned.
  final int prunedEventsCount;

  /// Snapshot hash at compaction cut (hex). Set when success.
  final String? newSnapshotHash;
}
