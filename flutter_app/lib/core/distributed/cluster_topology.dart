// ODA-1 — Current cluster topology. Derived from membership ledger only.

import 'package:iris_flutter_app/core/distributed/cluster_membership_ledger.dart';
import 'package:iris_flutter_app/core/distributed/deterministic_cluster_hasher.dart';

/// Topology derived solely from membership ledger. No connection order dependency.
class ClusterTopology {
  ClusterTopology({required ClusterMembershipLedger membershipLedger})
      : _ledger = membershipLedger;

  final ClusterMembershipLedger _ledger;

  Set<String> getClusterNodes() => _ledger.getActiveNodes();

  bool isNodeActive(String nodeId) => _ledger.getActiveNodes().contains(nodeId);

  /// Deterministic cluster hash. Same membership → same hash on all nodes.
  String getClusterHash(List<String> orderedNodeIdsForHash) {
    return DeterministicClusterHasher.clusterHash(
      membershipLedgerHash: _ledger.getMembershipLedgerHash(),
      nodeIds: orderedNodeIdsForHash,
      clusterId: _ledger.clusterId,
    );
  }
}
