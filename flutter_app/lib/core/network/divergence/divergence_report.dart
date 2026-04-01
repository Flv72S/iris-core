/// O5 — Structured divergence report. Detection only; no resolution.

import 'package:iris_flutter_app/core/network/divergence/divergence_types.dart';

/// Result of divergence detection. Contains enough data for future resolution (O-Extended).
class DivergenceReport {
  const DivergenceReport({
    required this.type,
    required this.localSnapshotHash,
    required this.remoteSnapshotHash,
    required this.localLedgerHeight,
    required this.remoteLedgerHeight,
    this.commonAncestorHeight,
    this.details,
  });

  final DivergenceType type;
  final String localSnapshotHash;
  final String remoteSnapshotHash;
  final int localLedgerHeight;
  final int remoteLedgerHeight;

  /// Set when [DivergenceType.forkDetected]: height at which both ledgers last agreed.
  final int? commonAncestorHeight;

  /// Optional human-readable or diagnostic details.
  final String? details;

  @override
  String toString() =>
      'DivergenceReport(${type.name}, local=$localSnapshotHash@$localLedgerHeight, remote=$remoteSnapshotHash@$remoteLedgerHeight, commonAncestor=$commonAncestorHeight)';
}
