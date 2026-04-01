// ODA-5 — Snapshot from federated cluster. Detect divergence, contract/domain mismatch.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Snapshot received from remote federated cluster.
class RemoteClusterSnapshot {
  const RemoteClusterSnapshot({
    required this.remoteClusterHash,
    required this.remoteDomainHash,
    required this.remoteLedgerHeadHash,
    required this.federationContractHash,
    required this.federationMembershipHash,
  });

  final String remoteClusterHash;
  final String remoteDomainHash;
  final String remoteLedgerHeadHash;
  final String federationContractHash;
  final String federationMembershipHash;

  static bool validateRemoteSnapshot(RemoteClusterSnapshot snapshot) {
    if (snapshot.remoteClusterHash.isEmpty) return false;
    if (snapshot.remoteDomainHash.isEmpty) return false;
    if (snapshot.remoteLedgerHeadHash.isEmpty) return false;
    if (snapshot.federationContractHash.isEmpty) return false;
    return true;
  }
}

/// Result of comparing remote snapshot with local view.
enum RemoteSnapshotCompareResult {
  compatible,
  remoteDivergence,
  contractMismatch,
  domainMismatch,
  clusterMismatch,
}

class RemoteClusterSnapshotComparator {
  RemoteClusterSnapshotComparator._();

  static RemoteSnapshotCompareResult compareRemoteSnapshot({
    required RemoteClusterSnapshot remote,
    required String localExpectedClusterHash,
    required String localExpectedDomainHash,
    required String localExpectedLedgerHeadHash,
    required String localExpectedContractHash,
  }) {
    if (remote.remoteClusterHash != localExpectedClusterHash) {
      return RemoteSnapshotCompareResult.clusterMismatch;
    }
    if (remote.remoteDomainHash != localExpectedDomainHash) {
      return RemoteSnapshotCompareResult.domainMismatch;
    }
    if (remote.federationContractHash != localExpectedContractHash) {
      return RemoteSnapshotCompareResult.contractMismatch;
    }
    if (remote.remoteLedgerHeadHash != localExpectedLedgerHeadHash) {
      return RemoteSnapshotCompareResult.remoteDivergence;
    }
    return RemoteSnapshotCompareResult.compatible;
  }
}
