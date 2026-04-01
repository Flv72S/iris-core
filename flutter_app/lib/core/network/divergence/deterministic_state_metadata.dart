/// O5 — Metadata for divergence detection. Structural only; no state mutation.

import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';

/// Immutable metadata describing a node's deterministic state for comparison.
/// Used by [DivergenceDetector] to classify divergence without touching live state.
class DeterministicStateMetadata {
  const DeterministicStateMetadata({
    required this.snapshotHash,
    required this.ledgerHeight,
    required this.protocolVersion,
    required this.chainHashHistory,
  });

  /// Hash of the latest snapshot (e.g. stateHash or chainHash as string).
  final String snapshotHash;

  /// Number of snapshots in the ledger.
  final int ledgerHeight;

  /// Protocol version of the ledger.
  final DeterministicProtocolVersion protocolVersion;

  /// Chain hash at each index [0..ledgerHeight-1]. Used for fork detection.
  /// Empty if ledger is empty.
  final List<int> chainHashHistory;

  @override
  String toString() =>
      'DeterministicStateMetadata(snapshotHash=$snapshotHash, ledgerHeight=$ledgerHeight, chainHashHistory.length=${chainHashHistory.length})';
}
