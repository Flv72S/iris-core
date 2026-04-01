/// O10 — Metadata for a persisted snapshot. Informational; no decision logic.

/// Metadata for a canonical snapshot. [createdAt] is informational only.
class SnapshotMetadata {
  const SnapshotMetadata({
    required this.snapshotHash,
    required this.ledgerHeight,
    required this.stateHash,
    required this.previousSnapshotHash,
    required this.createdAt,
  });

  /// Deterministic snapshot identity (e.g. chain hash hex).
  final String snapshotHash;

  /// Ledger height (number of snapshots) at which this snapshot was taken.
  final int ledgerHeight;

  /// State hash at this snapshot.
  final int stateHash;

  /// Previous snapshot's hash (or "genesis").
  final String previousSnapshotHash;

  /// Informational only.
  final String createdAt;
}
