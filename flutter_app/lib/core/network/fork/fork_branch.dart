/// O8 — Fork branch metadata. Structural only; no state mutation.

/// Metadata for one side of a fork (local or remote).
class ForkBranch {
  const ForkBranch({
    required this.branchId,
    required this.startingHeight,
    required this.eventHashes,
    required this.finalSnapshotHash,
  });

  /// Identifier: e.g. 'local' or 'remote'.
  final String branchId;

  /// Ledger height (0-based index) at which this branch starts (first divergent snapshot).
  final int startingHeight;

  /// Chain/event hashes from [startingHeight] to tip (deterministic order).
  final List<String> eventHashes;

  /// Snapshot hash at branch tip.
  final String finalSnapshotHash;

  int get length => eventHashes.length;
}
