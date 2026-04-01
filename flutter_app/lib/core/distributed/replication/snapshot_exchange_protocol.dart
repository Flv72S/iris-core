// ODA-2 — Snapshot-assisted sync. No state alteration.

import 'package:iris_flutter_app/core/distributed/cluster_state_snapshot.dart';

enum SnapshotCompareResult {
  alreadySynced,
  needForwardSync,
  needRollback,
  incompatibleCluster,
  divergentFork,
}

class SnapshotExchangeProtocol {
  SnapshotExchangeProtocol._();

  static ClusterStateSnapshot createLocalSnapshot({
    required String membershipHash,
    required String ledgerHeadHash,
    required String projectionHash,
    required int activeNodeCount,
  }) {
    return ClusterStateSnapshot(
      membershipHash: membershipHash,
      ledgerHeadHash: ledgerHeadHash,
      projectionHash: projectionHash,
      activeNodeCount: activeNodeCount,
    );
  }

  static bool validatePeerSnapshot(ClusterStateSnapshot snapshot, String expectedMembershipHash) {
    return snapshot.membershipHash == expectedMembershipHash;
  }

  static SnapshotCompareResult compareSnapshots(
    ClusterStateSnapshot local,
    ClusterStateSnapshot peer,
    String localClusterHash,
    String peerClusterHash,
  ) {
    if (localClusterHash != peerClusterHash) return SnapshotCompareResult.incompatibleCluster;
    if (local.ledgerHeadHash == peer.ledgerHeadHash) return SnapshotCompareResult.alreadySynced;
    return SnapshotCompareResult.needForwardSync;
  }
}
