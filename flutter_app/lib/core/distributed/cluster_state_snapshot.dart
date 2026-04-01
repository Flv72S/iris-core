// ODA-1 — Cluster state snapshot. Deterministic for same state.

import 'package:iris_flutter_app/core/distributed/cluster_membership_ledger.dart';

class ClusterStateSnapshot {
  const ClusterStateSnapshot({
    required this.membershipHash,
    required this.ledgerHeadHash,
    required this.projectionHash,
    required this.activeNodeCount,
  });
  final String membershipHash;
  final String ledgerHeadHash;
  final String projectionHash;
  final int activeNodeCount;
}

/// Create and verify cluster state snapshots.
class ClusterStateSnapshotFactory {
  ClusterStateSnapshotFactory._();

  static ClusterStateSnapshot createSnapshot({
    required ClusterMembershipLedger membershipLedger,
    required String ledgerHeadHash,
    required String projectionHash,
  }) {
    final active = membershipLedger.getActiveNodes();
    return ClusterStateSnapshot(
      membershipHash: membershipLedger.getMembershipLedgerHash(),
      ledgerHeadHash: ledgerHeadHash,
      projectionHash: projectionHash,
      activeNodeCount: active.length,
    );
  }

  static bool verifySnapshot(ClusterStateSnapshot snapshot, ClusterMembershipLedger ledger) {
    if (snapshot.membershipHash != ledger.getMembershipLedgerHash()) return false;
    if (snapshot.activeNodeCount != ledger.getActiveNodes().length) return false;
    return true;
  }
}
